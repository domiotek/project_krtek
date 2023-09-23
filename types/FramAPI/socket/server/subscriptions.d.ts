namespace FramAPI {
    namespace SocketServer {
        interface IEventReservationRecord {
            reservedBy: string
            listener: (client: IClient, data: any)=>void
        }

        interface ISubscriptionsManager {

            /**
             * Internal event emitter for subscriptions manager. Use that instance when inside FramAPI.
             * Don't use it to emit events, for that use _emitEvent method.
             */
            readonly _iEvents: SubscriptionEvents.IEventEmitter;

            readonly events: Omit<SubscriptionEvents.IEventEmitter,"emit">;
 
            /**
             * Emits event to both internal and published event emitters.
             */
            _emitEvent: this["_iEvents"]["emit"];

            on: SubscriptionEvents.IEventEmitter["on"];
            off: SubscriptionEvents.IEventEmitter["off"];

            /**
             * Incoming network events, that are used by SubscriptionsManager and should be redirected to it's handleRequest method.
             */
            readonly _relatedEvents : Set<string>

            /**
             * Event names, that were already registered by one of subscriptions and can't be registered again.
             */
            public readonly _reservedEvents: Map<string, IEventReservationRecord>;
    
            /**
             * Creates new subscription service and returns it. 
             * @param name Name of subscription. Cannot be empty.
             * @param manifest Subscription's manifest. Sent to clients upon registration.
             * @returns Subscription object or false if name was invalid.
             */
            define : (name: string, manifest?: object)=> IInitSubscriptionInterface | false
    
            /**
             * Checks whether given subscription exists or not.
             * @param name Subscription name.
             */
            exists : (name: string) => boolean 
    
            /**
             * Returns subscription object of given name. 
             * @param name Subscription name.
             * @returns Subscription or undefined if not found.
             */
            get : (name : string) => ISubscription | undefined
    
            /**
             * Returns names of defined subscriptions.
             */
            getAll : () => Array<string>
        
            /**
             * Registers socket for specified subscription. Adds socket to clients list and emits subscriptions-registered event to it.
             * @param socketID ID of socket. Method doesn't check if socket with given ID exists so it's important to pass only validated data
             * to avoid memory leaks (nonexistent sockets will never be cleared from clients list, unless unregisterSocketFromAll is used).
             * @param name Subscription name.
             */
            _registerSocketFor : (socketID: string, name: string) => boolean
    
            /**
             * Unregisters socket from specified subscription. Removes socket from clients list and emits subscriptions-unregistered event to it.
             * @param socketID ID of socket.
             * @param name Subscription name.
             */
            _unregisterSocketFrom : (socketID: string, name: string) => boolean
    
            /**
             * Unregisters socket from all subscriptions it was registered for. Removes socket from all clients lists 
             * and emits subscriptions-unregistered event for each subscription.
             * @param socketID ID of socket.
             */
            _unregisterSocketFromAll : (socketID: string) => void
    
            /**
             * Returns names of subscriptions that given socket is registered for.
             * @param socketID ID of socket.
             */
            _getRegistrationsOfSocket : (socketID: string) => Array<string>
    
            /**
             * Checks whether socket is registered for specified subscription.
             * @param name Subscription name.
             */
            _isSocketRegisteredFor : (socketID: string, name: string) => boolean
    
            /**
             * Handles all incoming network event-based requests. Shouldn't be invoked manually.
             * @param event Socket event name.
             * @param packet Network packet object containing request data and response token.
             * @param origin Socket object, where request originated from.
             */
            async _handleRequest(event: string,packet: SocketNetwork.IRequestPacket, origin: ISocket)
        }

        interface ISubscriptionsInterface {
            /**
             * Interface for managing subscriptions related event listeners.
             */
            readonly events: ISubscriptionsManager["events"];
            on: ISubscriptionsManager["on"];
            off: ISubscriptionsManager["off"];

            define: ISubscriptionsManager["define"];
            exists: ISubscriptionsManager["exists"];
    
            /**
             * Returns subscription object of given name. 
             * @param name Subscription name.
             * @returns Subscription or undefined if not found.
             */
            get(name : string) : ISubscriptionInterface | undefined
            getAll : ISubscriptionsManager["getAll"];
        }
    
        interface ISubscription {
            /**
             * Subscription name.
             */
            readonly name : string;

            /**
             * Manifest sent to clients upon registration. Can contain additional config or instructions for clients to follow.
             */
            _manifest: object

            /**
             * Object sent to clients upon registration. Can contain additional config or instructions for clients to follow.
             * @deprecated Deprecated this form of the manifest handling. In future, manifest will be exposed as property.
             */
            manifest(newManifest?: object): object;
    
            /**
             * Room name used for subscription operations.
             */
            readonly _roomName : string;

            /**
             * Internal event emitter for subscription. Use that instance when inside FramAPI.
             * Don't use it to emit events, for that use _emitEvent method.
             */
            readonly _iEvents: SubscriptionEvents.IEventEmitter;

            readonly events: Omit<SubscriptionEvents.IEventEmitter,"emit">;

            on: SubscriptionEvents.IEventEmitter["on"];
            off: SubscriptionEvents.IEventEmitter["off"];

            /**
             * Decide whether registration for this subscription should prevent server
             * from kicking client if it doesn't perform any other actions.
             * @default true
             */
            preventsInactivityKick: boolean

            /**
             * Registers socket for specified subscription. Adds socket to clients list and emits subscriptions-registered event to it.
             * @param socketID ID of socket. Method doesn't check if socket with given ID exists so it's important to pass only validated data
             * to avoid memory leaks (nonexistent sockets will never be cleared from clients list, unless unregisterAll is used).
             * @param source Source of registration request. Can be either 'Server' or 'Client'.
             * @param type Type of registration. Can be either 'JOIN' or 'Rejoin'.
             */
            _register(socketID : string, source : SocketNetwork.SubscriptionRequestSource="Server", type: "JOIN" | "REJOIN" = "JOIN")

            /**
             * Unregisters socket from specified subscription. Removes socket from clients list and emits subscriptions-unregistered event to it.
             * @param socketID ID of socket.
             * @param source Source of registration request. Can be either 'Server' or 'Client'.
             */
            _unregister(socketID : string, source : SocketNetwork.SubscriptionRequestSource="Server")
            
            /**
             * Unregisters all sockets from subscription. Removes sockets from clients list and emits subscriptions-registered event to them.
             */
            _unregisterAll();

            /**
             * Kicks client from the subscription.
             */
            _kick(socketID: string, reason?: string): void;

            /**
             * Allows for listening on specific event incoming from the clients.
             * Note that event name should be unique among the all defined subscriptions.
             * Some event names are also reserved.
             * @throws
             */
            _listenForSocketEvent(event: string, listener: IEventReservationRecord["listener"]): void;

            /**
             * Returns current state of subscription service or sets it when newState is given.
             * @param newState New state to set.
             * @returns Currently set state. When change was successfull, newState value will be returned.
             */
            state(newState? : boolean) : boolean
    
            /**
             * Broadcasts event to all registered clients.
             * @param event Event name
             * @param data Optional data in form of an object.
             * @returns false if disabled, true otherwise.
             */
            broadcast(event : string, data? : object) : boolean;

            /**
             * Returns all registered clients.
             * @returns Object with socket IDs as keys and SubscriptionClient's objects as values.
             */
            getClients() : {[ID: string]: ISubscriptionClient}

            /**
             * Returns IDs of clients that are registered for subscription.
             * @depracated Deprecated name. In future getClientIDs()
             */
            getClientsIDs() : Array<string>

            /**
             * Returns IDs of clients registered for subscription.
             */
            getClientIDs() : Array<string>
    
            /**
             * Returns number of clients registered for subscription.
             */
            countClients() : number
    
            /**
             * Checks whether given socket client is registered for this subscription.
             * @param socketID Socket ID.
             */
            hasClient(socketID: string) : boolean
    
            /**
             * Returns SubscriptionClient object for given client id if it's registered for that subscription, otherwise returns undefined.
             */
            getClient(clientID: string) : ISubscriptionClient | undefined 
    
            /**
             * Kicks all clients from subscription and emits 'subscriptions-kicked' event to them with provided
             * reason.
             * @param reason Reason for kicking. Can be any string.
             */
            kickAll(reason?:string)
        }

        interface ISubscriptionInterface {
            readonly name: string;
            /**
             * Interface for managing subscriptions related event listeners.
             */
            readonly events: ISubscription["events"];
            
            preventsInactivityKick: ISubscription["preventsInactivityKick"];

            manifest: ISubscription["manifest"];
            state: ISubscription["state"];
            broadcast: ISubscription["broadcast"];
            kickAll: ISubscription["kickAll"];
            getClientsIDs: ISubscription["getClientsIDs"];
            getClientIDs: ISubscription["getClientIDs"];

            /**
             * Returns all registered clients.
             * @returns Object with socket IDs as keys and SubscriptionClient's objects as values.
             */
             getClients() : {[ID: string]: ISubscriptionClientInterface}

            /**
             * Returns SubscriptionClient object for given client id if it's registered for that subscription, otherwise returns undefined.
             */
            getClient(clientID: string) : ISubscriptionClientInterface | undefined

            hasClient: ISubscription["hasClient"];
            countClients: ISubscription["countClients"];
            on: ISubscription["on"];
            off: ISubscription["off"];
        }

        interface IInitSubscriptionInterface {
            state: ISubscription["state"];
            manifest: ISubscription["manifest"];
            readonly roomName: string;
            /**
             * Decide whether registration for this subscription should prevent server
             * from kicking client if it doesn't perform any other actions.
             * @default true
             * @returns Currently set state
             */
            preventsInactivityKick(newState?: boolean): boolean;
            listenForSocketEvent: ISubscription["_listenForSocketEvent"];
            broadcast: ISubscription["broadcast"];
            getClients: ISubscription["getClients"];
            getClientIDs: ISubscription["getClientIDs"];
            countClients: ISubscription["countClients"];
            hasClient: ISubscription["hasClient"];
            getClient: ISubscriptionInterface["getClient"];
            kickAll: ISubscription["kickAll"];

            onClientRegistered(listener: (data: SubscriptionEvents.EventData<"ClientRegistered">)=>void);
            onClientUnregistered(listener: (data: SubscriptionEvents.EventData<"ClientUnregistered">)=>void);
            onClientKicked(listener: (data: SubscriptionEvents.EventData<"ClientKicked">)=>void);
            onStateChanged(listener: (state: SubscriptionEvents.EventData<"StateChanged">)=>void);
        }

        interface ISocketSubscriptionsInterface {
            /**
             * Checks whether socket is registered for specified subscription.
             * @param name Subscription name
             */
            isRegisteredFor(name: string) : boolean
    
            /**
             * Returns names of subscriptions that socket is registered for.
             */
            getRegistrations() : Array<string>

            /**
             * Kicks client from specified subscription.
             * @param name Subscription's name.
             * @param reason Reason for kick.
             */
            kickFrom(name: string ,reason: string) : void
    
             /**
              * Kicks client from all subscriptions it was registered for.
              * @param reason Reason for kick.
              */
            kickFromAll(reason: string) : void

            /**
             * Registers socket for specified subscription. Adds socket to clients list and emits subscriptions-registered event to it.
             * @param name Subscription name.
             */
            _registerFor(name: string) : boolean
    
            /**
             * Unregisters socket from specified subscription. Removes socket from clients list and emits subscriptions-unregistered event to it.
             * @param name Subscription name.
             */
            _unregisterFrom(name: string) : boolean
     
            /**
             * Unregisters socket from all subscriptions it was registered for. Removes socket from all clients lists 
             * and emits subscriptions-unregistered event for each subscription.
             */
            _unregisterFromAll() : void
        }

        interface IClientSubscriptionsInterface {
            isRegisteredFor: ISubscriptionsInterface["isRegisteredFor"];
            getRegistrations: ISubscriptionsInterface["getRegistrations"];
            kickFrom: ISubscriptionsInterface["kickFrom"];
            kickFromAll: ISubscriptionsInterface["kickFromAll"];
        }

        namespace SubscriptionEvents {
            type EventType = "ClientRegistered" | "ClientUnregistered" | "ClientKicked" | "StateChanged";
            type EventData<T> = 
                (T extends "ClientRegistered" | "ClientUnregistered"?IClientRegistrationsEvents:never) |
                (T extends "ClientKicked"?IClientKickedEvent:never) | 
                (T extends "StateChanged"?IStateChangedEvent:never)
            type UnconditionedEventData = IClientRegistrationsEvents | IClientKickedEvent | IStateChangedEvent;

            interface IEventEmitter extends ITypedEventEmitter<EventType,UnconditionedEventData> {
                on<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this
                
                off<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                once<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                emit<T extends EventType>(event: T, data: EventData<T>): boolean
            }

            interface IClientRegistrationsEvents {
                subscriptionName: string
                clientID: string
                client: ISubscriptionClient | null
                source: SocketNetwork.SubscriptionRequestSource
                type: "JOIN" | "REJOIN" | "LEAVE"
            }

            interface IClientKickedEvent {
                subscriptionName: string
                clientID: string
                reason?: string
            }

            interface IStateChangedEvent {
                subscriptionName: string
                state: boolean
            }
        }

        interface ISubscriptionClientInterface {
            /**
             * Unique identifier for client.
             */
            public readonly ID : string;

            /**
             * Time of client's registration in form of milliseconds.
             */
            public readonly registeredAt : number;
    
            /**
             * Kicks client from subscription.
             * @param reason Optional reason for kicking. Reason will be emited to client via event.
             */
            public kick(reason?:string): void;

            /**
             * Emits event to the client.
             * @param event Event name.
             * @param data Optional data in form of an object.
             */
            public emit(event : string, data?: object): void;
        }

        interface ISubscriptionClient extends ISubscriptionClientInterface {
            readonly _client: ISocket;
        }
    
        interface ISubscriptionsList {
            [name: string] : ISubscription | undefined
        }
    
        interface ISubscriptionClientsList {
            [id: string] : ISubscriptionClient | undefined
        }
    }
}