namespace FramAPI {
    namespace SocketServer {
        type SocketEventsListener = (event: string, ...arguments: any)=>void
        
        interface ISocket {
            /**
             * Unique identifier of socket.
             */
            readonly ID : string;

            /**
             * IP address of client.
             */
            readonly remoteAddress: string;

            /**
             * Timestamp of the time, when client connected to the server.
             */
            readonly connectedAt: number;

            /**
             * Ping in ms between client and server.
             */
            readonly _ping: number;

            /**
             * Ping in ms between client and server.
             * @deprecated In future ping will be accessible only via the property.
             */
            ping(): number;
    
            /**
             * Tools to manage subscriptions for socket.
             */
            readonly subscriptions : ISocketSubscriptionsInterface
    
            /**
             * Map of additional properties related to client.
             */
            datastore: Map<string, any>;

            /**
             * Re-evaluates inactivity timeout. If socket is registered for any subscription, timeout will be cleared, if not
             * it WILL RESET the timeout. 
             */
            _recheckInactivityTimeout : ()=>void
    
            /**
             * Emits an event to the client
             * @param event Event name
             * @param data Optional data in form of an object.
             */
            emit(event : string, data? : object)
    
            /**
             * Makes socket join specified room.
             * @param room Room name.
             */
            _joinRoom(room: string)
    
            /**
             * Makes socket leave the specified room.
             * @param room Room name.
             */
            _leaveRoom(room: string)
    
            /**
             * Checks if socket is in specified room.
             * @param room Room name.
             */
            _isInRoom(room: string) : boolean
    
            /**
             * Disconnects socket without any communication with client.
             */
            _disconnect();

            /**
             * Adds listener that catches all incoming events.
             */
            _addSocketListener(listener: SocketEventsListener): void;
            _removeSocketListener(listener: SocketEventsListener): void;

            /**
             * Disconnects socket, but also emits 'kicked' event along with the given reason for such action.
             * @param reason 
             */
            kick(reason: string): void;
        }
    
        interface IClient {
            
            readonly ID: ISocket["ID"];
            readonly remoteAddress: ISocket["remoteAddress"];
            readonly connectedAt: ISocket["connectedAt"];
            readonly datastore: ISocket["datastore"];

            /**
             * Tools for managing client's subscriptions.
             */
            public readonly subscriptions : IClientSubscriptionsInterface;

            kick: ISocket["kick"];
            emit: ISocket["emit"];
            ping: ISocket["ping"];
        }
    }
}