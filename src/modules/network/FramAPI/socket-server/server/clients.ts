import { ClientVersion } from "./schema/socket.js";
import { SocketServer } from "./server.js";
import { Socket } from "./socket.js";
import EventEmitter from "events";

export class SocketClients implements FramAPI.SocketServer.ISocketClients {

    private _sockets : FramAPI.SocketServer.ISocketList = {};
    private readonly _parent: FramAPI.SocketServer.ISocketServer;
    private readonly _ioServer: import("socket.io").Server;
    public readonly _api: FramAPI.SocketServer.IAPIBridge;

    private readonly _events: FramAPI.SocketServer.ClientsInterfaceEvents.IEventEmitter;
    public readonly _iEvents: FramAPI.SocketServer.ClientsInterfaceEvents.IEventEmitter;

    public get events() : FramAPI.SocketServer.ISocketClientsInterface["events"] {
        return this._events;
    }

    public _emitEvent: this["_iEvents"]["emit"] = (event,data)=>{
        this._iEvents.emit(event,data);
        this._events.emit(event,data);
        return true;
    }

    public on: FramAPI.SocketServer.ISocketClients["on"];
    public off: FramAPI.SocketServer.ISocketClients["off"];

    private _analyzeClientVersion(version: string) : FramAPI.SocketServer.VersionAnalysisResult {
        const clientParts = version.split(".");
        const serverParts = SocketServer.version.split(".");
        if(serverParts[0]===clientParts[0]){
            if(serverParts[1]===clientParts[1]) {
                if(serverParts[2]===clientParts[2]) return "PerfectMatch";
                else return "PatchMismatch";
            }else {
                this._api.writeDebug(`Client's version differs in the 'minor' part. Although it doesn't block client from connecting, it can cause problems with some of the features. Try to avoid that situation on the APP level.`)
                return "MinorMismatch";
            }          
        }else return "MajorMismatch";
    }

    /**
     * Handler for all incoming socket.io connections.
     * @param sck socket.io client instance
     */
    private async _socketInitialization(sck : import("socket.io").Socket) {
        let clientVersion : string;
        let rejectionDetails: FramAPI.SocketNetwork.IClientRejectionDetails<FramAPI.SocketNetwork.ClientRejectionReason>;

        try {
            clientVersion = await ClientVersion.validate(sck.handshake.query.version);
        } catch (error) {
            const rejection: FramAPI.SocketNetwork.IClientRejectionDetails<"HandshakeFailure"> = {
                reason: "HandshakeFailure",
                details: {
                    message: "Client didn't handshake connection correctly.",
                    data: null
                }
            }
            sck.emit("rejected",rejection);
            sck.disconnect();
            return;
        }

        const protocolVerMatch = this._analyzeClientVersion(clientVersion);

        if(protocolVerMatch!=="MajorMismatch"&&this.count()<this._parent.options.maxConcurrentClients&&this._parent.isEnabled()) {
            let clientData : object;
            try {
                clientData = JSON.parse((sck.handshake.query.data as string | undefined) ?? "{}");
            }catch(err) {
                clientData = {};
                this._api.writeDebug(`Couldn't handle incoming handshake data for {${sck.id}} socket.`);
            }

            const datastore = new Map<string,any>();
            
            //Execute App level verification handler or accept connection if such isn't available.
            const AppLevelVerification : FramAPI.SocketServer.IOnConnectionEventResult = this._parent.onConnection?(this._parent.onConnection({
                protocolVersion: clientVersion,
                protocolVersionMatch: protocolVerMatch,
                remoteAddress: sck.handshake.address,
                handshakeData: clientData,
                datastore
            })):{action:"accept"};

            if(AppLevelVerification.action=="accept") {
                let manifest = (typeof this._parent.manifestHandler == 'function')?this._parent.manifestHandler():null;
                if(typeof manifest!="object") {
                    manifest = this._parent.getManifest();
                    this._api.writeDebug(`[Connection] Manifest handler returned invalid manifest data.`);
                }

                sck.emit("connected",{manifest, version: SocketServer.version});
                let socket = new Socket(sck, this);
                this._sockets[socket.ID] = socket;
                socket.datastore = datastore;
                this._api.writeDebug(`[Connection] New client {${sck.id}} connected.`);

                try {
                    this._emitEvent("ClientConnected",{client: socket});
                    this._api.emitServerEvent("ClientConnected",{client: socket});
                } catch (error: any) {
                    error.message = `[Connections] ${error.message}`;
                    throw error;
                }
                return;
            }else {
                rejectionDetails = {
                    reason: AppLevelVerification.reason!=undefined?"Custom":"UnspecifiedAppLevelReason", 
                    details: {
                        message: AppLevelVerification.reason ?? "Server rejected your connection, but didn't provide any reason for it. Please try again in a moment or contact server owner if issue persists.",
                        data: AppLevelVerification.details ?? null
                    }
                }
            } 
        }else {
            let type: FramAPI.SocketNetwork.ClientRejectionReason, message, data;
            switch(true) {
                case protocolVerMatch==="MajorMismatch":
                    type = "UnsupportedVersion";
                    message = `Server doesn't support protocol's version you are currently using.`
                    data = {
                        /**
                         * @deprecated [1.2.0] Ref: type declr.
                         */
                        verificationMethod: "match",
                        serverSupportedVersions: [`${SocketServer.version.split(".")[0]}.*.*`],
                        currentVersion: clientVersion,
                        serverVersion: SocketServer.version,
                        clientVersion: clientVersion
                    }
                break;
                case this._parent.isEnabled():
                    type = "TooManyClients";
                    message = "Server cannot handle anymore clients at this moment. Try again later."
                    data = {
                        clientsLimit: this._parent.options.maxConcurrentClients
                    }
                break;
                default:
                    type = "ServerIsDisabled";
                    message = "Server is currently disabled and doesn't allow new connections."
                    data = null
            }
            rejectionDetails = {
                reason: type,
                details: {
                    message,
                    data
                }
            }
        }
        sck.emit("rejected",rejectionDetails);
        this._api.writeDebug(`[Connection] Connection rejected because of {${JSON.stringify(rejectionDetails)}} reason.`);
        sck.disconnect();
    }

    private _subscriptionRegistrationsEventsHandler = (data : FramAPI.SocketServer.SubscriptionEvents.IClientRegistrationsEvents) => {
        const client = this._sockets[data.clientID];
        if(client) client._recheckInactivityTimeout();
    }

    /**
     * Creates new instace of SocketClients - utility class for basic management of socket clients.
     * @param sockets Reference to sockets object.
     * @param forward Pipeline endpoint for events forwarding.
     */
    constructor(parent: FramAPI.SocketServer.ISocketServer, api: FramAPI.SocketServer.IAPIBridge, ioServer: import("socket.io").Server) {
        this._events = new EventEmitter({captureRejections: true});
        this._iEvents = new EventEmitter({captureRejections: true});
        this.on = this._events.on.bind(this._events);
        this.off = this._events.off.bind(this._events);
        this._parent = parent;
        this._api = api;
        this._ioServer = ioServer;
        ioServer.on('connection',this._socketInitialization.bind(this));

        this._api.subscriptions.on("ClientRegistered",this._subscriptionRegistrationsEventsHandler);
        this._api.subscriptions.on("ClientUnregistered",this._subscriptionRegistrationsEventsHandler);
    }

    public _unloadSocket(ID: string): void {
        this._sockets[ID]?._disconnect();
        delete this._sockets[ID];
        this._api.subscriptions._unregisterSocketFromAll(ID);
    }

    public _broadcastToRoom(room: string, event: string, data?: object) {
        this._ioServer.to(room).emit(event, data);
    }

    public _emptyRoom(room: string) {
        if(room=="main") throw new Error(`Main room is reserved and cannot be emptied using this method.`);
        this._ioServer.socketsLeave(room);
    }

    /**
     * Broadcasts event to all connected clients.
     * @param event Event name
     * @param data Optional data in form of object.
     */
    public broadcast(event: string, data?: object) {
        this._broadcastToRoom("main",event,data);
    }

    /**
     * Returns IDs of all connected clients.
     */
    public getIDs() : Array<string>{
        return Object.keys(this._sockets);
    }

    /**
     * Returns client object
     * @param id Socket ID
     * @returns Client or undefined if not found
     */
    public get(id: string) : FramAPI.SocketServer.ISocket| undefined {
        return this._sockets[id];
    }

    /**
     * Returns number of connected clients.
     */
    public count() : number {
        return Object.getOwnPropertyNames(this._sockets).length;
    }

    /**
     * Disconnects all connected clients.
     */
    public disconnectAll() {
        this._api.writeDebug("[Connection] Disconnecting all clients from server (SocketClients->disconnectAll).");

        for (const ID in this._sockets) {
            this._sockets[ID]?._disconnect();
        }
    }
}