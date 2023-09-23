
namespace FramAPI {
    namespace WebServer {
        type CommandsExecutionCallback = FramAPI.CommandsExecutionCallback<"HTTP",null,null,(response: any)=>void> 
        type AppConfigurationCallback = (app: import("fastify").FastifyInstance | null) => Promise<void>;

        namespace WebServerEvents {
            type EventType = "WebServerStarted" | "WebServerClosed";

            interface IEventEmitter extends ITypedEventEmitter<EventType,undefined> {
                on<T extends EventType>(event: T, listener: ()=>void): this
                
                off<T extends EventType>(event: T, listener: ()=>void): this

                once<T extends EventType>(event: T, listener: ()=>void): this

                emit<T extends EventType>(event: T): boolean
            }
        }

        type HttpsSetupData = import("https").ServerOptions;
    }
}