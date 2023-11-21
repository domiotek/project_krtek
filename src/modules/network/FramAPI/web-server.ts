import Fastify, { FastifyInstance } from "fastify";
import { Server } from "http";
import EventEmitter from "events";

export class WebServer {
    private _app : FastifyInstance;
    private _events : FramAPI.WebServer.WebServerEvents.IEventEmitter = new EventEmitter({captureRejections: true});

    public get events(): Omit<FramAPI.WebServer.WebServerEvents.IEventEmitter,"emit"> {
        return this._events;
    }

    public readonly isHTTPS: boolean;

    public on: this["events"]["on"];
    public off: this["events"]["off"];

    /**
     * HTTP or HTTPS Server instance.
     */
    public get server() : Server {
        return this._app.server;
    }

    private _commandsExecutionCallback : FramAPI.WebServer.CommandsExecutionCallback | null = null;

    public _onCommandsHandlerUpdated: FramAPI.onCommandsHandlerUpdatedEventHandler = null;

    /**
     * Callback, that handles all incoming HTTP command requests. 
     * Provides the same request interface as SocketServer.
     */
    public get commandsExecutionCallback() {
        return this._commandsExecutionCallback;
    }

    public set commandsExecutionCallback(v) {
        this._commandsExecutionCallback = v;
        if(this._onCommandsHandlerUpdated) this._onCommandsHandlerUpdated({handler: this._commandsExecutionCallback, sender: "HTTP"});
    }

    private _connectionInfo : {
        address: string,
        port: number
    }

    /**
     * Creates new instance of express based http server.
     * @param address IP address in string form.
     * @param port Port number to listen on.
     * @param https Optional https configuration data. To enable https functionality, you must provide an object
     * with the 'key' and 'cert' properties. If not provided, http server instance will be created.
     * @param isBehindProxy Allows for specifying, whether server is being run behind a proxy. This needs to be set to true
     * when it truly is behind proxy, otherwise reported client IP address will be invalid, but should be disabled when it's not.
     */
    constructor(port: number, address: string="127.0.0.1", isBehindProxy: boolean=false, https?: FramAPI.WebServer.HttpsSetupData,) {

        this.on = this._events.on.bind(this._events);
        this.off = this._events.off.bind(this._events);

        try {
            this._app = Fastify({
                https: https as any,
                trustProxy: isBehindProxy
            });
        }catch(error: any) {
            error.message = `Couldn't create the server instance.${https!==undefined?" Double check the provided HTTPS config.":""} ${error}`;
            error.mayBeCausedByHTTPS = https!==undefined;
            throw error;
        }
        this.isHTTPS = https!=undefined&&https.key!=undefined&&https.cert!=undefined;
    
        this._connectionInfo = {address, port};

        const routeSchema = {
            querystring: {
              type: "object",
              required: ["command"],
              properties: {
                  command: { type: 'string' },
                  params: { 
                    anyOf: [
                        {
                            type: 'array'
                        },
                        {
                            type: 'string'
                        }
                    ],
                    default: [] 
                }
              }
            },
            response: {
              200: {
                type: 'object',
                required: ["success"],
                properties: {
                  success: { type: 'boolean' },
                  result: { type: 'string' },
                  message: {type: 'string'}
                }
              }
            }
        }

        this._app.route({
            method: 'GET',
            url: '/api/execute',
            schema: routeSchema,
            handler: (req, res)=>{
                let params : {command: string, params: string | Array<string>} = <any>req.query;
                let responseSent = false;
                if(this.commandsExecutionCallback) this.commandsExecutionCallback({
                    origin: "HTTP",
                    command: params.command,
                    params: typeof params.params=='string'?[params.params]:params.params,
                    client: null,
                    subscriptions: null,
                    respond: (response)=>{
                        if(!responseSent) {
                            responseSent = true;
                            res.send({success: true, result: response});
                        }
                    }
                }); else res.send({success: false, message: "HTTP commands handling is disabled."});
            },
            errorHandler: (err,req,res)=>{
                let result = {success: false, message: `Unexpected ${res.statusCode} error.`};
    
                if(err.validation) {
                    result.message = "Bad request: ";
                    switch(err.validation[0].keyword) {
                        case "required": 
                            result.message += `Query ${err.validation[0].message}`; break;
                        case "type":
                            result.message += `Query's '${err.validation[0].schemaPath.substr(1)}' property ${err.validation[0].message}`;break;
                        default: 
                            result.message += err.message;
                    }
                }
                res.send(result);
            }
          });
    }

    /**
     * Starts server instance. Note, that after server was started, its configuration becomes unavailable.
     */
    async start() : Promise<boolean> {
        if(!this.server.listening) {
            await this._app.listen({
                port: this._connectionInfo.port,
                host: this._connectionInfo.address
            })
            
            let state = this.state();
            if(state) {
                try {
                    this._events.emit("WebServerStarted");
                }catch(error: any) {
                    error.message = `[WebServerState] ${error.message}`;
                    throw error;
                }
            }
            return state;
        }else return this.state();        
    }

    /**
     * Closes server instance
     */
    async close() : Promise<boolean>{
        this._app.close();
        let state = !this.state();
        if(state) {
            try {
                this._events.emit("WebServerClosed");
            }catch(error: any) {
                error.message = `[WebServerState] ${error.message}`;
                throw error;
            }
        }
        return state;
    }

    /**
     * Checks whether server is active or not.
     */
    state() : boolean {
        return this.server.listening;
    }
    
    /**
     * Allows configuration of fastify server instance. While executed, it will call provided callback with fastify instance.
     * Note that configuration is only possible when server is disabled.
     * @param callback - (app: fastifyInstance | null)=>void
     */
    async configureApp(callback : FramAPI.WebServer.AppConfigurationCallback) {
        if(!this.state()) {
            await callback(this._app);
        }else {
            throw new Error("Cannot configure fastify app after server was started.");
        }
    }
}