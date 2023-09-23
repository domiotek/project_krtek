import * as io from "socket.io";
import { IReconnectionDetails } from "./schema/socket.js";
import { SubscriptionsInterfaceWrapper } from "./subscriptions.js";

export class Socket implements FramAPI.SocketServer.ISocket {
    /**
     * Unique identifier of socket.
     */
    public readonly ID : string;

    private readonly _socket : io.Socket;
    private readonly _parent: FramAPI.SocketServer.ISocketClients;
    private readonly _inactivityTimeoutTime: number;
    private _inactivityTimeout! : NodeJS.Timeout | null;
    private _connected: boolean = true;
    private __ping: number = 0;

    public datastore = new Map<string,any>();

    /**
     * Tools to manage subscriptions for socket.
     */
    public readonly subscriptions : FramAPI.SocketServer.ISocketSubscriptionsInterface;

    public readonly remoteAddress : string;

    public readonly connectedAt: number;

    public get _ping() : number {
        return this.__ping;
    }

    public ping(): number {
        return this.__ping;
    }

    private _initialize() {
        this._socket.onAny(async (event : string,primary: Array<object>, secondary: any)=>{
            const paramsObj : any = Array.isArray(primary)?primary[0]:(primary!=undefined?primary:{});

            const requests = this._parent._api.requests;
            const subscriptions = this._parent._api.subscriptions;

            if(requests.relatedEvents.has(event)) requests.handleRequest(event, paramsObj as FramAPI.SocketNetwork.IRequestPacket,this);
            else if(subscriptions._relatedEvents.has(event)) subscriptions._handleRequest(event,paramsObj as FramAPI.SocketNetwork.IRequestPacket, this);
            else {
                switch(event) {
                    case "ping":
                        //Whether client is ready to use new, proper way of calculating ping.
                        const isUpgradable = secondary!=undefined&&secondary.upgradable===true;
                        if(typeof primary == "number" && !isUpgradable) {
                            this.__ping = -1;
                            this._socket.emit("pong",primary);
                        }else if(typeof paramsObj == "object" || isUpgradable) {
                            const lastPing: number | undefined = (paramsObj as any).lastPing;
                            if(lastPing) this.__ping = lastPing;

                            this._socket.emit("pong",{
                                client: typeof primary=="number"?primary:(paramsObj as any).client,
                                packetSet: (paramsObj as any).packetSet ?? 0
                            });
                        }else this.__ping = -1;
                    break;
                    case "reconnected":
                        let request : FramAPI.SocketNetwork.IReconnectionDetails;

                        try {
                            request = await IReconnectionDetails.validate(paramsObj);
                        } catch (error) {
                            request = {rejoinSubscriptions: []};
                        }

                        for (const name of request.rejoinSubscriptions) {
                            let subscription = subscriptions.get(name);
                            if(subscription) subscription._register(this.ID,"Server","REJOIN");
                        }

                        try {
                            this._parent._emitEvent("ClientReconnected",{client: this});
                            this._parent._api.emitServerEvent("ClientReconnected",{client:this});
                        } catch (error: any) {
                            error.message = `[Connections] ${error.message}`;
                            throw error;
                        }
                        this._parent._api.writeDebug(`[Connection] Client {${this.ID}} reconnected`);
                    break;
                }
            }
        });
        this._socket.on("disconnect",()=>{
            if(this._connected) {
                this._connected = false;

                setImmediate(()=>this._parent._unloadSocket(this.ID));
                clearTimeout(this._inactivityTimeout as NodeJS.Timeout);

                this._parent._api.writeDebug(`[Connection] Client {${this.ID}} disconnected.`);

                try {
                    this._parent._emitEvent("ClientDisconnected",{
                        clientID: this.ID
                    });
                    this._parent._api.emitServerEvent("ClientDisconnected",{socketID: this.ID});
                } catch (error: any) {
                    error.message = `[Connections] ${error.message}`;
                    throw error;
                }
            }
        });
    }

    private _inactivityTimeoutHandler() {
        this.emit("kicked",{reason: "Inactivity"});
        this._parent._api.writeDebug(`[Connection] Kicking ${this.ID} client out because of inactivity.`);
        this._disconnect();
    }

    /**
     * Creates new socket object - wrapper for socket.io socket object, that connects it with rest of the API like subscriptions.
     * @param socket Socket.io server instance.
     * @param requestsHandler instance of requests handler (comes from parent, shared among all sockets).
     * @param forward Pipeline endpoing for events forwarding.
     */
    constructor(socket: io.Socket, parent: FramAPI.SocketServer.ISocketClients) {
        this._parent = parent;
        this.connectedAt = Date.now();
        this.ID = socket.id;
        this._socket = socket;
        this._socket.join("main");
        this._inactivityTimeoutTime = parent._api.serverInstance.options.clientInactivityTimeout;
        this.remoteAddress = socket.handshake.address;

        this.subscriptions = new SubscriptionsInterfaceWrapper(this.ID,parent._api.subscriptions);

        this._recheckInactivityTimeout();

        this._initialize();
    }

    public emit(event : string, data? : object) {
        this._socket.emit(event,data);
    }

    public kick(reason: string) {
        this.emit("kicked", {reason});
        setTimeout(()=>this._disconnect(),1000);
    }

    public _recheckInactivityTimeout = ()=>{
        const registrations = this.subscriptions.getRegistrations();
        let kickPrevented = false;
        for (const name of registrations) {
            if(this._parent._api.subscriptions.get(name)?.preventsInactivityKick) {
                kickPrevented = true;
                break;
            }
        }

        if(!kickPrevented) {
            if(!this._inactivityTimeout)
                this._inactivityTimeout = setTimeout(this._inactivityTimeoutHandler.bind(this),this._inactivityTimeoutTime);
        }else {
            clearTimeout(this._inactivityTimeout as NodeJS.Timeout);
            this._inactivityTimeout = null;
        }
    }

    public _joinRoom(room: string) {
        this._socket.join(room);
    }

    public _leaveRoom(room: string) {
        this._socket.leave(room);
    }

    public _isInRoom(room: string) : boolean {
        return this._socket.rooms.has(room);
    }

    public _disconnect() {
        this._socket.disconnect(true);
    }

    public _addSocketListener(listener: FramAPI.SocketServer.SocketEventsListener) {
        this._socket.onAny(listener);
    }

    public _removeSocketListener(listener: FramAPI.SocketServer.SocketEventsListener): void {
        this._socket.offAny(listener);
    }
}