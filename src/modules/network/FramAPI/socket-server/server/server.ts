import { Server } from "http";
import * as io from "socket.io";
import { RequestsHandler } from "./requests.js";
import { SubscriptionsManager } from "./subscriptions.js";
import { SocketClients } from "./clients.js";
import EventEmitter from "events";
import wireUpServer from "socket.io-fix-close";

export class SocketServer implements FramAPI.SocketServer.ISocketServer {
    static readonly version = "1.2.1";

    private _server : io.Server;
    private readonly _apiBridge: FramAPI.SocketServer.IAPIBridge;

    private _manifest : object = {};

    public options : FramAPI.SocketServer.ISocketServerOptions;

    public get subscriptions() : FramAPI.SocketServer.ISubscriptionsInterface {
        return this._apiBridge.subscriptions;
    }

    public get clients(): FramAPI.SocketServer.ISocketClientsInterface {
        return this._apiBridge.clients;
    }

    private _commandsExecutionCallback : FramAPI.SocketServer.CommandsExecutionCallback | null = null;

    public get commandsExecutionCallback() {
        return this._commandsExecutionCallback;
    }

    public set commandsExecutionCallback(v) {
        this._commandsExecutionCallback = v;
        if(this._onCommandsHandlerUpdated) this._onCommandsHandlerUpdated({handler: this._commandsExecutionCallback, sender: "SOCKET"});
    }

    public manifestHandler: ()=>object = ()=>{
        return this._manifest;
    }

    public onConnection : FramAPI.SocketServer.onConnectionEventHandler = null;
    public _onCommandsHandlerUpdated: FramAPI.onCommandsHandlerUpdatedEventHandler = null;
    

    private _httpServer : Server
    private _enabled : boolean = true;

    private readonly _events : FramAPI.SocketServer.SocketServerEvents.IEventEmitter;

    public get events(): Omit<FramAPI.SocketServer.SocketServerEvents.IEventEmitter, "emit"> {
        return this._events;
    }

    public on: this["events"]["on"];
    public off: this["events"]["off"];

    /**
     * Creates new instance of SocketServer.
     * @param httpServer HTTPServer instance. Can be either native http server or express one.
     * @param options Additional options for server.
     * @param options.checkClientVersion Method for checking compatibility of client's version with server's version. 
     * Can be either 'match', 'list' or false, if you want to disable it. Match option will compare different parts between versions
     * and if they match, client will be connected. List method checks whether client's version exist inside list of supported versions.
     * By default 'match' option will be used.
     * @param options.matchVersionParts Defines which version's parts should be matched for client to be connected.
     * Can be either 'major', 'minor' and 'patch'. Server will check every part from left to the selected one including it. That means, when
     * 'minor' is selected, first two parts of '1.0.2' will be checked. By default 'minor' option will be used.
     * @param options.maxConcurrentClients Defines maximum number of clients that can be connected at the same time. Clients that will try to
     * connect after limit is reached will be rejected.
     */
    constructor(httpServer: Server, options?: FramAPI.SocketServer.ISocketServerOptions) {
        this.options = options ?? {} as FramAPI.SocketServer.ISocketServerOptions;

        const defaultValues : FramAPI.SocketServer.ISocketServerOptions = {
            checkClientVersion: "match",
            matchVersionParts: "minor",
            maxConcurrentClients: 20,
            clientInactivityTimeout: 300000
        }

        for (const property in defaultValues) {
            this.options[property] = this.options[property]!==undefined?this.options[property]:defaultValues[property];
        }

        this._events = new EventEmitter({captureRejections: true});
        this.on = this._events.on.bind(this._events);
        this.off = this._events.off.bind(this._events);

        this._server = new io.Server(httpServer);
        wireUpServer(httpServer, this._server);

        this._apiBridge = {} as any;
        this._apiBridge.writeDebug = (msg)=>this._events.emit("Debug",msg);
        this._apiBridge.emitServerEvent = (event,data)=>{
            this._events.emit(event,data);
            (this._apiBridge.serverEvents as EventEmitter).emit(event,data);
            return true;
        }

        this._apiBridge.serverInstance = this;
        this._apiBridge.serverEvents = new EventEmitter({captureRejections: true});
        this._apiBridge.subscriptions = new SubscriptionsManager(this._apiBridge);
        this._apiBridge.clients = new SocketClients(this, this._apiBridge, this._server);
        this._apiBridge.requests = new RequestsHandler(this, this._apiBridge);

        this._apiBridge.serverEvents.on("SubscriptionClientRegistered",()=>{
            this._apiBridge.writeDebug(`You are using deprecated event handler {SubscriptionClientRegistered}, which will be removed in the future. Switch to .subscriptions.on("ClientRegistered").`);
        });

        this._apiBridge.serverEvents.on("SubscriptionClientUnregistered", ()=>{
            this._apiBridge.writeDebug(`You are using deprecated event handler {SubscriptionClientUnegistered}, which will be removed in the future. Switch to .subscriptions.on("ClientUnregistered").`);
        });

        this._apiBridge.serverEvents.on("ClientConnected",()=>{
            this._apiBridge.writeDebug(`You are using deprecated event handler {ClientConnected}, which will be removed in the future. Switch to .clients.on("ClientConnected").`);
        });

        this._apiBridge.serverEvents.on("ClientDisconnected",()=>{
            this._apiBridge.writeDebug(`You are using deprecated event handler {ClientDisconnected}, which will be removed in the future. Switch to .clients.on("ClientDisconnected").`);
        });

        this._apiBridge.serverEvents.on("ClientReconnected",()=>{
            this._apiBridge.writeDebug(`You are using deprecated event handler {ClientReconnected}, which will be removed in the future. Switch to .clients.on("ClientReconnected").`);
        });

        this._httpServer = httpServer;
    }

    public closeServer() {
        this._apiBridge.requests.cleanup("ServerClosed");
    }

    public isEnabled() : boolean {
        return this._httpServer.listening && this._enabled;
    }

    public enable() : boolean{
        if(this._httpServer.listening) {
            if(!this._enabled) {
                this._enabled = true;
                try {
                    this._apiBridge.emitServerEvent("ServerEnabled",undefined);
                } catch (error: any) {
                    error.message = `[ServerState] ${error.message}`;
                    throw error;
                }
            }
            return true;
        }else return false;
    }

    public disable(){
        if(this._enabled) {
            this._enabled = false;
            try {
                this._apiBridge.emitServerEvent("ServerDisabled",undefined);
            } catch (error: any) {
                error.message = `[ServerState] ${error.message}`;
                throw error;
            }
            this._apiBridge.requests.cleanup("ServerDisabled");
            this.clients.disconnectAll();
        }
    }


    public getManifest() : object{
        return this._manifest;
    }

    public setManifest(newManifest : object) {
        if(typeof newManifest=='object') this._manifest = newManifest;
    }
}