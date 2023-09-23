namespace FramAPI {
    namespace SocketServer {
        interface ISocketServerOptions {
            [property: string] : boolean | number | string
            maxConcurrentClients: number
            /**
             * How long to wait before kicking client because of inactivity. 
             * If updated, while server is already running, changes will take effect for the next connected client.
             */
            clientInactivityTimeout: number
        }

        namespace SocketServerEvents {
            type EventType = "ServerEnabled" 
            | "ServerDisabled"
            | "Debug" 
            | "ClientConnected"
            | "ClientReconnected"
            | "ClientDisconnected" 
            | "SubscriptionClientRegistered"
            | "SubscriptionClientUnregistered";

            type EventData<T> = 
                (T extends "SubscriptionClientRegistered" | "SubscriptionClientUnregistered"?ISubscriptionRegistrationsEventData:never)
            |   (T extends "ClientConnected" | "ClientReconnected"?ClientsInterfaceEvents.IClientConnectedEvent:never)
            |   (T extends "ClientDisconnected"?IClientDisconnectedEventData:never)
            |   (T extends "ServerEnabled" | "ServerDisabled"?undefined:never)
            |   (T extends "Debug"?string:never);

            type UnconditionedEventData = ISubscriptionRegistrationsEventData | ClientsInterfaceEvents.IClientConnectedEvent | IClientDisconnectedEventData | string | undefined;

            interface IEventEmitter extends ITypedEventEmitter<EventType,UnconditionedEventData> {
                on<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this
                
                off<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                once<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                emit<T extends EventType>(event: T, data: EventData<T>): boolean
            }

            /**
             * @deprecated
             */
            interface ISubscriptionRegistrationsEventData {
                subscriptionName: name
                client: IClient
            }

            /**
             * @deprecated
             */
            interface IClientDisconnectedEventData {
                socketID: string
            }
        }
    
        type CommandsExecutionCallback = FramAPI.CommandsExecutionCallback<"SOCKET",IClient,ISubscriptionsInterface,(response: any, isFinal: boolean=false)=>void> 

        interface IOnConnectionEventData {
            protocolVersion: string
            protocolVersionMatch: Exclude<VersionAnalysisResult,"MajorMismatch">
            remoteAddress: string
            handshakeData: any
            datastore: Map<string,any>
        }

        interface IOnConnectionEventResult {
            action: "accept" | "reject"
            reason?: string,
            details?: object
        }

        type onConnectionEventHandler =  ((data: IOnConnectionEventData)=>IOnConnectionEventResult) | null;

        interface ISocketServer {
    
            /**
             * Additional options for tweaking server's behaviour
             */
            public options : ISocketServerOptions;
    
            /**
             * Tools for managing subscription services.
             */
            public readonly subscriptions : ISubscriptionsInterface;
    
            /**
             * Currently connected clients.
             */
            public readonly clients : ISocketClientsInterface;

            /**
             * Interface for managing subscriptions related event listeners.
             */
            readonly events: Omit<SocketServerEvents.IEventEmitter,"emit">;

            public on: this["events"]["on"];
            public off: this["events"]["off"];
    
            /**
             * Function that will be executed to handle incoming requests.
             */
            public commandsExecutionCallback : CommandsExecutionCallback | null = null;


            /**
             * Handler providing support for dynamic manifest objects.
             * It allows for serving manifests with dynamically calculated values.
             * By default it returns static manifest set by setManifeset method.
             */
            manifestHandler: ()=>object;

            /**
             * Handler executed every time new client is establishing connection.
             * Can be used to specify App level requirements clients must meet to connect
             * and reject those who don't meet them.
             */
            onConnection: onConnectionEventHandler;
    
            /**
             * Closes socket server. Should be called after root http server closes. 
             * If called when http server is still active, it will be automaticly closed as well.
             * All active connections will be closed.
             */
            public closeServer()
    
            /**
             * Checks whether server is enabled or not.
             */
            isEnabled() : boolean
    
            /**
             * Enables socket server.
             * @returns True if successfull, false otherwise. Enabling may fail if http server that this server is bound to isn't listening.
             */
            enable() : boolean
    
            /**
             * Disables server by blocking all incoming connections.
             * This will NOT shutdown http or socket server but will kill all currently active connections.
             */
            disable()
    
            /**
             * Returns previously set manifest for socketServer.
             */
            getManifest() : object
    
            /**
             * Sets new manifest for socketServer. Manifest is an OBJECT that will be transfered to every client upon connection.
             * If given anything other than object, no action will be taken.
             * @param newManifest New manifest in form of an object.
             */
            setManifest(newManifest : object)
        }

        interface IAPIBridge {
            serverInstance: ISocketServer
            subscriptions: ISubscriptionsManager
            clients: ISocketClients
            requests: IRequestsHandler
            writeDebug(message: string): void
            serverEvents: Omit<SocketServerEvents.IEventEmitter,"emit">
            emitServerEvent: SocketServerEvents.IEventEmitter["emit"]
        }
    }
}

declare module 'socket.io-fix-close';