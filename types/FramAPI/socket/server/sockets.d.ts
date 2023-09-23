
namespace FramAPI {
    namespace SocketServer {
        type VersionAnalysisResult = `${"Major" | "Minor" | "Patch"}Mismatch` | "PerfectMatch";

        interface ISocketList {
            [id: string] : ISocket | undefined
        }

        namespace ClientsInterfaceEvents {
            type EventType = "ClientConnected" | "ClientDisconnected" | "ClientReconnected";
            type EventData<T> = 
                (T extends "ClientConnected" | "ClientReconnected"?IClientConnectedEvent:never) |
                (T extends "ClientDisconnected"?IClientDisconnectedEvent:never);
            type UnconditionedEventData = IClientConnectedEvent | IClientDisconnectedEvent;

            interface IEventEmitter extends ITypedEventEmitter<EventType,UnconditionedEventData> {
                on<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this
                
                off<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                once<T extends EventType>(event: T, listener: (data: EventData<T>)=>void): this

                emit<T extends EventType>(event: T, data: EventData<T>): boolean
            }

            interface IClientConnectedEvent {
                client: IClient
            }

            interface IClientDisconnectedEvent {
                clientID: string
            }
        }

        interface ISocketClients {

            public readonly _api: FramAPI.SocketServer.IAPIBridge;

            /**
             * Internal event emitter for socket clients. Use that instance when inside FramAPI.
             * Don't use it to emit events, for that use _emitEvent method.
             */
            readonly _iEvents: ClientsInterfaceEvents.IEventEmitter;

            readonly events: Omit<ClientsInterfaceEvents.IEventEmitter,"emit">;

            /**
             * Emits event to both internal and published event emitters.
             */
            _emitEvent: this["_iEvents"]["emit"];

            on: ClientsInterfaceEvents.IEventEmitter["on"];
            off: ClientsInterfaceEvents.IEventEmitter["off"];

            /**
             * Disconnects and removes socket instance from the list and tries to cleanup other instances.
             */
            _unloadSocket(ID: string): void;

            /**
             * Broadcasts event to all clients inside the specified room.
             * To broadcast to all connected clients, use 'main' room.
             */
            _broadcastToRoom(room: string, event: string, data?: object): void;

            /**
             * Removes all clients assigned to specified room.
             */
            _emptyRoom(room: string): void;

            /**
             * Broadcasts event to all connected clients.
             * @param event Event name
             * @param data Optional data in form of object.
             */
            broadcast(event: string, data?: object)
    
            /**
             * Returns IDs of all connected clients.
             */
            getIDs() : Array<string>
    
            /**
             * Returns client object
             * @param id Socket ID
             * @returns Client or undefined if not found
             */
            get(id: string) : ISocket | undefined
    
            /**
             * Returns number of connected clients.
             */
            count() : number
    
            /**
             * Disconnects all connected clients.
             */
            disconnectAll()
        }

        interface ISocketClientsInterface {
            /**
             * Interface for managing subscriptions related event listeners.
             */
            readonly events: ISocketClients["events"];

            broadcast: ISocketClients["broadcast"];
            getIDs: ISocketClients["getIDs"];

            /**
             * Returns client object
             * @param id Socket ID
             * @returns Client or undefined if not found
             */
            get(id: string) : IClient | undefined
            count: ISocketClients["count"];
            disconnectAll: ISocketClients["disconnectAll"];
        }
    }
}