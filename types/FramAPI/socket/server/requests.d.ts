namespace FramAPI {
    namespace SocketServer {
        interface IRequestList {
            [id: string] : ISocketRequest | undefined
        }
        
        type RequestState = "PENDING" | "CANCELED" | "FINISHED" | "CRASHED"
    
        interface IRequestsHandler {
            
            readonly api: IAPIBridge;

            /**
             * Sets timeout which when fired, will remove request from requests list. Only finished requests will be removed.
             */
            planRequestRemoval(ID: number): void

            /**
             * Incoming network events, that are used by RequestsHandler and should be redirected to it's handleRequest method.
             */
            public readonly relatedEvents : Set<string>
    
            /**
             * Cancels all pending requests and removes all cached and finished requests.
             * @param reason Reason for cancelation.
             */
            public cleanup(reason: SocketNetwork.RequestCancelationReason)
    
            /**
             * Handles all incoming network event-based requests. Shouldn't be invoked manually.
             * @param event Socket event name.
             * @param packet Network packet object containing request data and response token.
             * @param origin Socket object, where request originated from.
             */
            public async handleRequest(event : string, packet : SocketNetwork.IRequestPacket, origin: ISocket);
        }
    
        interface ISocketRequest {
            public readonly ID;
    
            /**
             * Client that made the request.
             */
            public readonly client: ISocket | undefined;
    
            public readonly command : string;
            public readonly params: Array<string>
    
            /**
             * Reason for cancelation. If request wasn't canceled it will equal null.
             */
            public cancelationReason : SocketNetwork.RequestCancelationReason | null = null;
            /**
             * Message from error that caused request processing to fail.
             */
            public crashError: string | null = null;
    
            /**
             * Interface for request execution callback, that provides all necessary tools.
             */
            public readonly interface : IRequestInterface<"SOCKET",IClient,ISubscriptionsInterface,(response: any, isFinal: boolean=false)=>void>;
    
            /**
             * Current request state.
             */
            public state : RequestState
    
            /**
             * Cancels reason because of specified reason
             * @param reason Reason for cancelation.
             */
            public cancel(reason : SocketNetwork.RequestCancelationReason="Other")
        }
    }
}
