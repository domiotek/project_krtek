import {WebServer} from "./web-server.js"
import { SocketServer } from "./socket-server/server/server.js";
import EventEmitter from "events";

export class FramAPI {
    /**
     * Pipeline endpoint for debug messages. All debug messages created inside api will be forwarded here.
     * @deprecated Use .on("Debug",callback) instead.
     */
    public debugPipeline : ((message: string)=>void) | null = null;

    private _events : FramAPI.FramAPIInstanceEvents.IEventEmitter = new EventEmitter({captureRejections: true});

    public get events(): Omit<FramAPI.FramAPIInstanceEvents.IEventEmitter,"emit"> {
        return this._events;
    }

    public on = this._events.on.bind(this._events);
    public off = this._events.off.bind(this._events);

    /**
     * Instance of WebServer - fastify based server for handling API request or serving static content.
     */
    public webServer: WebServer

    /**
     * Instance of SocketServer - socket.io server wrapper that handles client connections and command execution requests.
     */
    public socketServer: SocketServer;

    /**
     * Callback, that handles all incoming command requests, both from socket and http servers.
     */
    public get commandsExecutionCallback() {
        return this.socketServer.commandsExecutionCallback as FramAPI.GenericCommandsExecutionCallback;
    }

    public set commandsExecutionCallback(v) {
        this.socketServer.commandsExecutionCallback = v;
    }

    private _commandsHandlerSyncMechanism(data: FramAPI.ICommandsHandlerUpdatedEventData) {
        if(data.sender=="SOCKET") {
            if(data.handler!=this.webServer.commandsExecutionCallback) 
                this.webServer.commandsExecutionCallback = data.handler;
        }else if(data.sender=="HTTP") {
            if(data.handler!=this.socketServer.commandsExecutionCallback) 
                this.socketServer.commandsExecutionCallback = data.handler;
        }
    }

    /**
     * Creates new instance of APIServer. It's a combined wrapper for socket connections and other http requests handling.
     * @param port Port for server to listen on.
     * @param address Address for server to bind to. If omitted, localhost address will be taken.
     * @param https Optional https configuration data. To enable https functionality, you must provide an object
     * with the 'key' and 'cert' properties. If not provided, http server instance will be created.
     */
    constructor(port: number, address: string="127.0.0.1", https?: FramAPI.WebServer.HttpsSetupData) {
        this.webServer = new WebServer(port, address,https);
        this.webServer._onCommandsHandlerUpdated = this._commandsHandlerSyncMechanism.bind(this);
        this.socketServer = new SocketServer(this.webServer.server,undefined);
        this.socketServer._onCommandsHandlerUpdated = this._commandsHandlerSyncMechanism.bind(this);
        this.socketServer.on("Debug",msg=>this._events.emit("Debug",msg));

        this.webServer.on("WebServerClosed", this.socketServer.closeServer.bind(this.socketServer));
    }

   /**
     * Allows configuration of fastify server instance. While executed, it will call provided callback with fastify instance.
     * Note that configuration is only possible when server is disabled.
     * @param callback - (app: fastifyInstance | null)=>void
     */
    async configureApp(callback : FramAPI.WebServer.AppConfigurationCallback) {
        await this.webServer.configureApp(callback);
    }

    /**
     * Starts both http and socket servers.
     */
    async start() : Promise<boolean> {
        await this.webServer.start();
        let state = this.socketServer.enable();
        try {
            if(state) this._events.emit("APIServerStarted",undefined);
        }catch(error: any) {
            error.message = `[APIServerState] ${error.message}`;
            throw error;
        }
        return state;
    }

    /**
     * Stops both http and socket servers.
     */
    async close() {
        if(this.webServer.state()) {
            await this.webServer.close();
            this.socketServer.closeServer();
            this.socketServer.disable();
            try {
                this._events.emit("APIServerClosed",undefined);
            }catch(error: any) {
                error.message = `[APIServerState] ${error.message}`;
                throw error;
            }
        }
    }

    /**
     * Restarts both http and socket servers.
     */
    async restart() : Promise<boolean> {
        await this.close(); 
        return await this.start();
    }
}