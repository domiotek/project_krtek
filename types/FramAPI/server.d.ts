/// <reference path='socket.d.ts' />

namespace FramAPI {

    interface IRequestInterface<Origin="HTTP" | "SOCKET", Client, SubscriptionsInterface, ResponseCallback> {

        /**
         * Origin of request. Can be either HTTP or SOCKET.
         */
        origin: Origin

        /**
         * Requested command.
         */
        command: string, 
        /**
         * Parameters for executed command.
         */
        params: Array<string>,

        /**
         * Client that created the request or null if it was creadted via http api.
         */ 
        client: Client,

        /**
         * Tools for managing subscription services
         */
        subscriptions: SubscriptionsInterface,

        /**
         * Sends response for request. To send continuous response, set isFinal to false
         * for every message except the last one. Note http originated requests doesn't support continuous response
         * and will always end response channel after one response.
         * @param response Response to send. Can be anything.
         * @param isFinal Whether to end request. If set to true, all further communication will be blocked.
         */
        respond: ResponseCallback
    }
    type CommandsExecutionCallback<Origin = "HTTP" | "SOCKET", Client, SubscriptionsInterface, ResponseCallback> = 
        (request: IRequestInterface<Origin,Client,SubscriptionsInterface,ResponseCallback>)=>Promise<void>;

    type GenericCommandsExecutionCallback = CommandsExecutionCallback<"HTTP" | "SOCKET",
                                            FramAPI.SocketServer.IClient | null,
                                            FramAPI.SocketServer.ISubscriptionsInterface | null, 
                                            (response: any, isFinal?: boolean)=>void
                                           > | null
    
    namespace FramAPIInstanceEvents {

        type EventType = "APIServerStarted" | "APIServerClosed" | "FramAPIStarted" | "FramAPIStopped" | "Debug";

        type EventData<T> = T extends "Debug"?string:undefined;

        interface IEventEmitter extends ITypedEventEmitter<EventType,UnconditionedEventData> {
            on<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this
            
            off<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

            once<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

            emit<T extends EventType>(event: T, data: EventData<T>): boolean
        }
    }
}