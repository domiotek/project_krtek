import { ISubscriptionStateRequest, ISubscriptionRegisterRequest, ISubscriptionUnregisterRequest } from "./schema/subscriptions.js";
import EventEmitter from "events";

export class SubscriptionsManager implements FramAPI.SocketServer.ISubscriptionsManager {
    private readonly _subscriptions : FramAPI.SocketServer.ISubscriptionsList = {};
    private readonly _events: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter;
    public readonly _iEvents: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter;
    public readonly _api: FramAPI.SocketServer.IAPIBridge;

    public get events() : FramAPI.SocketServer.ISubscriptionsManager["events"] {
        return this._events;
    }

    public on: FramAPI.SocketServer.ISubscriptionsManager["on"];
    public off: FramAPI.SocketServer.ISubscriptionsManager["off"];

    public _emitEvent: this["_iEvents"]["emit"] = (event, data)=>{
        this._iEvents.emit(event,data);
        this._events.emit(event,data);
        return true;
    }

    public readonly _relatedEvents : Set<string> = new Set(["subscriptions-list", "subscriptions-state","subscriptions-register","subscriptions-unregister", "subscriptions-registrations"]);

    public readonly _reservedEvents: Map<string, FramAPI.SocketServer.IEventReservationRecord> = new Map();

    /**
     * Creates new SubscriptionsManager.
     */
    constructor(api: FramAPI.SocketServer.IAPIBridge) {
        this._events = new EventEmitter({captureRejections: true});
        this._iEvents = new EventEmitter({captureRejections: true});
        this._api = api;
        this.on = this._events.on.bind(this._events);
        this.off = this._events.off.bind(this._events);

        setImmediate(()=>{
            this._api.clients._iEvents.on("ClientConnected",data=>{
                this._api.clients.get(data.client.ID)?._addSocketListener((event, params)=>{
                    const record = this._reservedEvents.get(event);
                    if(record) record.listener(data.client, params);
                });
            });
    
            this._api.clients._iEvents.on("ClientDisconnected",data=>{
                this._unregisterSocketFromAll(data.clientID);
            });
        });
    }

    /**
     * Creates new subscription service and returns it. 
     * @param name Name of subscription. Cannot be empty.
     * @returns Subscription object or false if name was invalid.
     */
    public define(name: string, manifest: object={}) : FramAPI.SocketServer.IInitSubscriptionInterface | false {
        if(typeof name != "string"|| name=="") return false
        if(!this._subscriptions[name]) {
            const subscription = new Subscription(name, this);
            subscription._manifest = manifest;
            this._subscriptions[name] = subscription;
            this._api.writeDebug(`[Subscriptions] Defined subscription {${name}}.`);
            return {
                roomName: subscription._roomName,
                preventsInactivityKick: (newState?: boolean)=>{
                    if(typeof newState=="boolean") subscription.preventsInactivityKick = newState;
                    return subscription.preventsInactivityKick;
                },
                broadcast: subscription.broadcast.bind(subscription),
                countClients: subscription.countClients.bind(subscription),
                getClient: subscription.getClient.bind(subscription),
                getClientIDs: subscription.getClientIDs.bind(subscription),
                getClients: subscription.getClients.bind(subscription),
                hasClient: subscription.hasClient.bind(subscription),
                kickAll: subscription.kickAll.bind(subscription),
                listenForSocketEvent: subscription._listenForSocketEvent.bind(subscription),
                manifest: subscription.manifest.bind(subscription),
                state: subscription.state.bind(subscription),
                onClientKicked: (listener)=>{
                    subscription._iEvents.on("ClientKicked",listener);
                },
                onClientRegistered: (listener)=>{
                    subscription._iEvents.on("ClientRegistered",listener);
                },
                onClientUnregistered: (listener)=>{
                    subscription._iEvents.on("ClientUnregistered",listener);
                },
                onStateChanged: (listener)=>{
                    subscription._iEvents.on("StateChanged",listener);
                }
            }
        }
        return false;
    }

    /**
     * Checks whether given subscription exists or not.
     * @param name Subscription name.
     */
    public exists(name: string) : boolean {
        return this._subscriptions[name]!==undefined;
    }

    /**
     * Returns subscription object of given name. 
     * @param name Subscription name.
     * @returns Subscription or undefined if not found.
     */
    public get(name : string) : FramAPI.SocketServer.ISubscription | undefined {
        return this._subscriptions[name];
    }

    /**
     * Returns names of defined subscriptions.
     */
    public getAll() : Array<string> {
        return Object.getOwnPropertyNames(this._subscriptions);
    }
    
    /**
     * Registers socket for specified subscription. Adds socket to clients list and emits subscriptions-registered event to it.
     * @param socketID ID of socket. Method doesn't check if socket with given ID exists so it's important to pass only validated data
     * to avoid memory leaks (nonexistent sockets will never be cleared from clients list, unless unregisterSocketFromAll is used).
     * @param name Subscription name.
     */
    public _registerSocketFor(socketID: string, name: string) : boolean {
        if(this._subscriptions[name]) {
            this._subscriptions[name]?._register(socketID);
            this._api.writeDebug(`[Subscriptions] Registered {${socketID}} socket for {${name}} subscription.`);
            return true;
        }else return false;
    }

    /**
     * Unregisters socket from specified subscription. Removes socket from clients list and emits subscriptions-unregistered event to it.
     * @param socketID ID of socket.
     * @param name Subscription name.
     */
    public _unregisterSocketFrom(socketID: string, name: string) : boolean {
        if(this._subscriptions[name]) {
            this._subscriptions[name]?._unregister(socketID);
            this._api.writeDebug(`[Subscriptions] Unregistered {${socketID}} socket from {${name}} subscription.`);
            return true;
        }else return false;
    }

    /**
     * Unregisters socket from all subscriptions it was registered for. Removes socket from all clients lists 
     * and emits subscriptions-unregistered event for each subscription.
     * @param socketID ID of socket.
     */
    public _unregisterSocketFromAll(socketID: string) {
        for (const name of this._getRegistrationsOfSocket(socketID)) {
            this._subscriptions[name]?._unregister(socketID);
        }
    }

    /**
     * Returns names of subscriptions that given socket is registered for.
     * @param socketID ID of socket.
     */
    public _getRegistrationsOfSocket(socketID: string) : Array<string> {
        let result : Array<string> = [];
        for (const name of this.getAll()) {
            if(this._subscriptions[name]?.hasClient(socketID)) result.push(name);
        }
        return result;
    }

    /**
     * Checks whether socket is registered for specified subscription.
     * @param name Subscription name.
     */
    public _isSocketRegisteredFor(socketID: string, name: string) : boolean {
        let subscription = this._subscriptions[name];
        if(subscription) return subscription.hasClient(socketID);
        else return false;
    }

    /**
     * Handles all incoming network event-based requests. Shouldn't be invoked manually.
     * @param event Socket event name.
     * @param packet Network packet object containing request data and response token.
     * @param origin Socket object, where request originated from.
     */
    public async _handleRequest(event: string,packet: FramAPI.SocketNetwork.IRequestPacket, origin: import("./socket.js").Socket) {
        let responseData : {
            event: string
            data: object
        } = {event: "",data: {}};

        switch(event) {
            case "subscriptions-list": {
                let response : FramAPI.SocketNetwork.ISubscriptionListResponse = {subscriptions: this.getAll()};
                responseData = {event, data: response};
            }break;
            case "subscriptions-state": {
                let request : FramAPI.SocketNetwork.ISubscriptionStateRequest;
                let response : FramAPI.SocketNetwork.ISubscriptionStateResponse;
                try {
                    request = await ISubscriptionStateRequest.validate(packet.data);
                } catch (error) {
                    request = {subscriptionName: ""};
                }
                let subscription = this.get(request.subscriptionName);

                response = {
                    subscriptionName: request.subscriptionName,
                    state: subscription?(subscription.state()?"ENABLED":"DISABLED"):"NOTFOUND",
                    clients: subscription?subscription.countClients():0
                }
                responseData = {event, data: response};
            }break;
            case "subscriptions-register": {
                let request : FramAPI.SocketNetwork.ISubscriptionRegisterRequest;
                let response : FramAPI.SocketNetwork.ISubscriptionRegisterResponse;
                try {
                    request = await ISubscriptionRegisterRequest.validate(packet.data);
                }catch(error) {
                    request = {subscriptionName: ""};
                }
                let subscription = this.get(request.subscriptionName);
                let state : boolean;
                if(subscription&&subscription.state()) {
                    subscription._register(origin.ID,"Client");
                    state = true;
                }else state = false;
                response = {
                    subscriptionName: request.subscriptionName,
                    state: subscription?(state?"SUCCESS":"DISABLED"):"NOTFOUND",
                    type: "JOIN",
                    manifest: subscription?._manifest ?? null
                }
                responseData = {event, data: response};
            }break;
            case "subscriptions-unregister": {
                let request : FramAPI.SocketNetwork.ISubscriptionUnregisterRequest;
                let response : FramAPI.SocketNetwork.ISubscriptionUnregisterResponse;

                try {
                    request = await ISubscriptionUnregisterRequest.validate(packet.data);
                } catch (error) {
                    request = {subscriptionName: ""};
                }
                let subscription = this.get(request.subscriptionName);
                let isRegistered : boolean = false;
                if(subscription&&subscription.state()) {
                    isRegistered = subscription.hasClient(origin.ID);
                    subscription._unregister(origin.ID,"Client");
                }
                response = {
                    subscriptionName: request.subscriptionName,
                    state: subscription?(isRegistered?"SUCCESS":"NOTREGISTERED"):"NOTFOUND"
                }
                responseData = {event, data: response};
            }break;
            case "subscriptions-registrations": {
                let response : FramAPI.SocketNetwork.ISubscriptionListResponse = {
                    subscriptions: origin.subscriptions.getRegistrations()
                }
                responseData = {event, data: response};
            }break;
        }
        if(responseData.event) origin.emit(responseData.event, {data: responseData.data, token: packet.token});
    }
}

export class SubscriptionsInterfaceWrapper implements FramAPI.SocketServer.ISocketSubscriptionsInterface {
    private readonly ID: string;
    private readonly API: FramAPI.SocketServer.ISubscriptionsManager;

    constructor(id: string, api: FramAPI.SocketServer.ISubscriptionsManager) {
        this.ID = id;
        this.API = api;
    }

    public isRegisteredFor(name: string): boolean {
        return this.API._isSocketRegisteredFor(this.ID,name);
    }

    public getRegistrations(): string[] {
        return this.API._getRegistrationsOfSocket(this.ID);
    }

    public kickFrom(name: string, reason: string): void {
        return this.API.get(name)?.getClient(this.ID)?.kick(reason);
    }

    public kickFromAll(reason: string): void {
        for (const n of this.getRegistrations()) 
            this.kickFrom(n,reason);
    }

    public _registerFor(name: string): boolean {
        return this.API._registerSocketFor(this.ID,name);
    }

    public _unregisterFrom(name: string): boolean {
        return this.API._unregisterSocketFrom(this.ID,name);
    }

    public _unregisterFromAll(): void {
        this.API._unregisterSocketFromAll(this.ID);
    }
}

export class Subscription implements FramAPI.SocketServer.ISubscription {
    public readonly name : string;
    public readonly _roomName : string;

    private _state : boolean = false;
    private readonly _parent: SubscriptionsManager;

    private _clients : FramAPI.SocketServer.ISubscriptionClientsList = {};
    private readonly _events: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter;

    public readonly _iEvents: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter;

    public get events(): FramAPI.SocketServer.ISubscription["events"] {
        return this._events;
    }

    public _manifest: object = {};

    private _preventsInactivityKick: boolean = true;

    public get preventsInactivityKick(): boolean {
        return this._preventsInactivityKick;
    }

    public set preventsInactivityKick(val: boolean) {
        this._preventsInactivityKick = val;

        for (const clientID in this._clients) 
            this._parent._api.clients.get(clientID)?._recheckInactivityTimeout();
    }
 
    /**
     * Emits event to both internal and published event emitters.
     */
    private _emitEvent: this["_iEvents"]["emit"] = (event, data)=>{
        this._iEvents.emit(event,data);
        this._events.emit(event,data);
        this._parent._emitEvent(event,data);
        return true;
    }

    public on: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter["on"];
    public off: FramAPI.SocketServer.SubscriptionEvents.IEventEmitter["off"];

    /**
     * Creates new Subscription interface.
     * @param name Subscription name.
     */
    constructor(name: string, parent: SubscriptionsManager) {
        this.name = name;
        this._roomName = name+"ServiceList";
        this._parent = parent;
        this._events = new EventEmitter({captureRejections: true});
        this._iEvents = new EventEmitter({captureRejections: true});
        this.on = this._events.on.bind(this._events);
        this.off = this._events.off.bind(this._events);
    }

    public manifest(newManifest?: object) {
        if(newManifest) this._manifest = newManifest;
        return this._manifest;
    }

    public state(newState? : boolean) : boolean {
        if(newState!=undefined) {
            this._state = newState;
            this._emitEvent("StateChanged",{subscriptionName: this.name, state: this._state});
        }
        return this._state;
    }

    public broadcast(event : string, data? : object) : boolean {
        if(!this.state()) return false;
        this._parent._api.clients._broadcastToRoom(this._roomName, event, data);
        return true;
    }

    public _register(socketID : string, source : FramAPI.SocketNetwork.SubscriptionRequestSource="Server", type: "JOIN" | "REJOIN" = "JOIN") {
        const client = new SubscriptionClient(this, this._parent._api.clients.get(socketID) as any);
        this._clients[socketID] = client;

        client._client._joinRoom(this._roomName);

        let emitDetails : FramAPI.SocketNetwork.ISubscriptionRegistrationsEvent = {subscriptionName: this.name, source, type, manifest: this._manifest};
        client._client.emit("subscriptions-registered",emitDetails);

        this._emitEvent("ClientRegistered",{
            subscriptionName: this.name,
            clientID: socketID,
            client,
            source,
            type
        });
        this._parent._api.emitServerEvent("SubscriptionClientRegistered",{
            client: client._client,
            subscriptionName: this.name
        });
    }

    public _unregister(socketID : string, source : FramAPI.SocketNetwork.SubscriptionRequestSource="Server") {
        if(this._clients[socketID]) {
            this._clients[socketID]?._client._leaveRoom(this._roomName);

            let emitDetails : FramAPI.SocketNetwork.ISubscriptionRegistrationsEvent = {subscriptionName: this.name, source, type: "LEAVE"};
            this._clients[socketID]?._client.emit("subscriptions-unregistered",emitDetails);

            this._parent._api.emitServerEvent("SubscriptionClientUnregistered",{
                client: this._clients[socketID]?._client as any,
                subscriptionName: this.name
            });

            delete this._clients[socketID];
            this._emitEvent("ClientUnregistered",{
                subscriptionName: this.name, 
                clientID: socketID,
                client: null,
                source,
                type: "LEAVE"
            });
            
        }
    }

    public getClients() {
        return Object.assign({},this._clients) as any;
    }

    public countClients() : number {
        return Object.getOwnPropertyNames(this._clients).length;
    }

    public hasClient(socketID: string) : boolean {
        return this._clients[socketID]!==undefined;
    }

    public getClient(socketID: string) : FramAPI.SocketServer.ISubscriptionClient | undefined {
        return this._clients[socketID];
    }

    public _unregisterAll() {
        for (const ID in this._clients) {
            this._unregister(ID);
        }
    }

    public _listenForSocketEvent(event: string, listener: FramAPI.SocketServer.IEventReservationRecord["listener"]): void {
        const p = this._parent;
        if(["connect", "disconnect","reconnected","ping","kicked","rejected"].includes(event)||p._relatedEvents.has(event) || p._api.requests.relatedEvents.has(event))
            throw new Error(`[${this.name} - Subscription] Couldn't register listener for {${event}} event. That name is reserved.`);

        if(p._reservedEvents.has(event))
            throw new Error(`[${this.name} - Subscription] Couldn't register listener for {${event}} event. That event is already registered by [${p._reservedEvents.get(event)?.reservedBy} subscription.`);

        if(typeof listener !='function') 
            throw new Error(`[${this.name} - Subscription] Couldn't register listener for {${event}} event. Expected listner to be a function, {${listener}} given.`);
        
        p._reservedEvents.set(event, {
            reservedBy: this.name,
            listener
        });
    }

    public _kick(clientID: string, reason?: string) {
        const client = this._clients[clientID];

        client?._client._leaveRoom(this._roomName);
        this._parent._api.writeDebug(`[Subscriptions] Kicked {${clientID}} client from {${this.name}} subscription.`);

        let emitData : FramAPI.SocketNetwork.ISubscriptionKickResponse = {subscriptionName: this.name, reason: reason ?? "Other"};
        client?.emit("subscriptions-kicked",emitData);

        delete this._clients[clientID];
        this._emitEvent("ClientKicked",{
            subscriptionName: "ClientKicked",
            clientID,
            reason
        });
    }

    public kickAll(reason?:string) {
        const kickDetails : FramAPI.SocketNetwork.ISubscriptionKickResponse = {subscriptionName: this.name, reason: reason ?? "Other"}

        const clientIDs = Object.keys(this._clients);
        this._clients = {};
        this._parent._api.clients._broadcastToRoom(this._roomName,"subscriptions-kicked",kickDetails);
        this._parent._api.clients._emptyRoom(this._roomName);

        for (const ID of clientIDs) 
            this._emitEvent("ClientKicked",{subscriptionName: "ClientKicked",clientID: ID});
    }

    public getClientsIDs(): string[] {
        return Object.keys(this.getClients());
    }

    public getClientIDs(): string[] {
        return this.getClientsIDs();
    }

}

export class SubscriptionClient implements FramAPI.SocketServer.ISubscriptionClient{
    public readonly registeredAt = Date.now();

    public get ID(): string {
        return this._client.ID;
    }
    
    public _client: FramAPI.SocketServer.ISocket;
    private _parent: FramAPI.SocketServer.ISubscription;

    /**
     * Creates new SubscriptionClient.
     * @param ID ID of client.
     * @param forward Pipeline endpoint for forwarding events.
     */
    constructor(parent: FramAPI.SocketServer.ISubscription, socket: FramAPI.SocketServer.ISocket) {
        this._client = socket;
        this._parent = parent;
    }
 
    public emit(event : string, data?: object) {
        this._client.emit(event, data);
    }

    public kick(reason?:string) {
        this._parent._kick(this.ID,reason);
    }
}