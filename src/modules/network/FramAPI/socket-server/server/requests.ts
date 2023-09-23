import { IRequestInitRequest, IRequestStateRequest } from "./schema/requests.js";
import { randomInt } from "crypto";

export class RequestsHandler implements FramAPI.SocketServer.IRequestsHandler {
    private _requestList : FramAPI.SocketServer.IRequestList;
    private _removeRequestTimeoutList: Array<NodeJS.Timeout> = [];
    private readonly _parent : FramAPI.SocketServer.ISocketServer;
    public readonly api: FramAPI.SocketServer.IAPIBridge;

    /**
     * Incoming network events, that are used by RequestsHandler and should be redirected to it's handleRequest method.
     */
    public readonly relatedEvents = new Set(["request", "request-state", "request-cancel"]);

    /**
     * Generates new, unique ID for request.
     */
    private _generateID() : number {
        const ID = randomInt(10000000000000,99999999999999)
        if(this._requestList[ID]) return this._generateID();
        else return ID;
    }

    /**
     * Creates new instance of RequestsHandler - manager for creating, executing and removing requests.
     * @param server SocketServer instance.
     */
    constructor(server: FramAPI.SocketServer.ISocketServer, api: FramAPI.SocketServer.IAPIBridge) {
        this._requestList = {};
        this._parent = server;
        this.api = api;
    }

    public planRequestRemoval(ID: number) {
        this._removeRequestTimeoutList.push(setTimeout(()=>{
            let request : FramAPI.SocketServer.ISocketRequest | undefined = this._requestList[ID];
            if(request&&request.state!="PENDING") {
                this.api.writeDebug(`[Requests] Removed {${ID}} request.`);
                delete this._requestList[ID];
            }else if(request) {
                this.api.writeDebug(`[Requests] Tried to remove pending {${ID}} request.`)
            }
        },60000));
        this.api.writeDebug(`[Requests] Planned removal of {${ID}} request.`);
    }

    /**
     * Cancels all pending requests and removes all cached and finished requests.
     * @param reason Reason for cancelation.
     */
    public cleanup(reason: FramAPI.SocketNetwork.RequestCancelationReason) {
        for (const request of Object.values(this._requestList)) {
            request?.cancel(reason);
        }
        this._requestList = {};

        for (const timeout of this._removeRequestTimeoutList) 
            clearTimeout(timeout);
    }

    /**
     * Handles all incoming network event-based requests. Shouldn't be invoked manually.
     * @param event Socket event name.
     * @param packet Network packet object containing request data and response token.
     * @param origin Socket object, where request originated from.
     */
    public async handleRequest(event : string, packet : FramAPI.SocketNetwork.IRequestPacket, origin: import("./socket.js").Socket) {
        let responseData : {
            event: string
            data: object
        } = {event:"",data:{}}

        switch(event) {
            case "request":{
                let req : FramAPI.SocketNetwork.IRequestInitRequest;
                let response : FramAPI.SocketNetwork.IRequestInitResponse;
                try {
                    req = await IRequestInitRequest.validate(packet.data);
                } catch (error) {
                    req = {command: "", params: []};
                }

                const ID = this._generateID();

                let request = new SocketRequest(ID, origin.ID,req, this);
                this._requestList[ID] = request;

                response = {
                    requestID: ID
                }
                origin.emit("request-init",{data: response, token: packet.token});
                this.api.writeDebug(`[Requests] Created request {${ID}} of {${req.command} ${req.params}}`);

                origin._recheckInactivityTimeout(); //will reset inactivity timeout

                if(this._parent.commandsExecutionCallback) {
                    try {
                        await this._parent.commandsExecutionCallback(request.interface);
                    }catch(error: any) {
                        request.crashError = error.message;
                        request.state = "CRASHED";
                        this.api.writeDebug(`[Requests] Request ${ID} processing crashed with and error ${error.message}`);
                        throw error;
                    }

                    if(request.state=="PENDING") request.cancel("NoFinalResponseProduced");
                }else request.cancel("NoHandlerAvailable");
            }break;
            case "request-state": { //[For compatibility reasons, this will stay here for few versions ahead]
                let req : FramAPI.SocketNetwork.IRequestStateRequest;
                let response : FramAPI.SocketNetwork.IRequestStateResponse = {requestID: 0, state: "INVALID"};

                try {
                    req = await IRequestStateRequest.validate(packet.data);
                } catch (error) {
                    req = {requestID: 0};
                }
                let request = this._requestList[req.requestID];
                if(request) {
                    response.state = request.state;
                    switch(response.state) {
                        case "CANCELED": response.data = {reason: request.cancelationReason ?? "Other"};break;
                        case "CRASHED": response.data = {error: request.crashError ?? "Unknown error"};break;
                    }


                }else response.state = "INVALID";

                response.requestID = req.requestID;
                responseData = {event: "request-state",data: response};
            }break;
            case "request-cancel": {
                let req : FramAPI.SocketNetwork.IRequestCancelRequest;
                try {
                    req = await IRequestStateRequest.validate(packet.data);
                } catch (error) {
                    req = {requestID: 0}
                }
                let request = this._requestList[req.requestID];
                if(request?.state=="PENDING") {
                    request.cancelationReason = "ClientInitiated";
                    request.state = "CANCELED";
                    this.api.writeDebug(`[Requests] Client requested cancelation of request {${request.ID}}.`);
                }
            }
        }

        if(responseData.event) {
            origin.emit(responseData.event,{data: responseData.data, token: packet.token});
        }
    }
}

export class SocketRequest implements FramAPI.SocketServer.ISocketRequest {
    private _state : FramAPI.SocketServer.RequestState = "PENDING";
    private readonly _parent: FramAPI.SocketServer.IRequestsHandler;
    private readonly _clientID: string

    public readonly ID;
    /**
     * ID of a client that made the request.
     */
    public get client(): FramAPI.SocketServer.ISocket | undefined {
        const client = this._parent.api.clients.get(this._clientID);
        if(!client&&this._state=="PENDING") this.cancel("ClientDisconnected");

        return client;
    }

    public readonly command : string;
    public readonly params: Array<string>

    /**
     * Reason for cancelation. If request wasn't canceled it will equal null.
     */
    public cancelationReason : FramAPI.SocketNetwork.RequestCancelationReason | null = null;
    /**
     * Message from error that caused request processing to fail.
     */
    public crashError: string | null = null;

    /**
     * Interface for request execution callback, that provides all necessary tools.
     */
    public get interface() : FramAPI.IRequestInterface<
                                                "SOCKET",
                                                FramAPI.SocketServer.IClient,
                                                FramAPI.SocketServer.ISubscriptionsInterface,
                                                (response: any, isFinal?: boolean)=>void> {
        const client = this.client;
        if(!client) throw new Error("[Requests] Couldn't execute the request - Client, that created the request is suddenly unavailable.");

        return {
            origin: "SOCKET",
            command: this.command,
            params: this.params,
            client,
            subscriptions: this._parent.api.subscriptions,
            respond: (response: any, isFinal: boolean = true)=>{
                if(this.state=="PENDING") {
                    if(isFinal) this.state = "FINISHED";
                    let responseObj : FramAPI.SocketNetwork.IRequestResponse = {requestID: this.ID, response, isFinal};
                    this.client?.emit("request-response",responseObj);
                    this._parent.api.writeDebug(`[Requests] Responding to {${this.ID}} request with {${response}} response.`);
                }
            }
        }
    }

    /**
     * Current request state.
     */
    public get state() : FramAPI.SocketServer.RequestState {
        return this._state;
    }

    public set state(value : FramAPI.SocketServer.RequestState) {
        this._state = value;

        let stateData : FramAPI.SocketNetwork.IRequestStateResponse = {requestID: this.ID, state: value};
        switch(value) {
            case "CANCELED": stateData.data = {reason: this.cancelationReason ?? "Other"};break;
            case "CRASHED": stateData.data = {error: this.crashError ?? "Unknown error"};break;
        }
        this.client?.emit("request-stateChange", stateData);
        this._parent.planRequestRemoval(this.ID);
    }
    

    /**
     * Creates new SocketRequest instance.
     * @param ID ID of the request.
     * @param requestInfo Request details like command and params.
     */
    constructor(ID : number,
                clientID: string, 
                requestInfo: FramAPI.SocketNetwork.IRequestInitRequest, 
                parent: FramAPI.SocketServer.IRequestsHandler) {
        this.ID = ID;
        this._parent = parent;
        this._clientID = clientID
        this.command = requestInfo.command;
        this.params = requestInfo.params;
    }

    /**
     * Cancels reason because of specified reason
     * @param reason Reason for cancelation.
     */
    public cancel(reason : FramAPI.SocketNetwork.RequestCancelationReason="Other") {
        if(this.state=="PENDING") {
            let response : FramAPI.SocketNetwork.IRequestCancelResponse = {requestID: this.ID, reason};
            this.cancelationReason = reason;
            this.state = "CANCELED";
            this.client?.emit("request-cancel", response);
            this._parent.api.writeDebug(`[Requests] Canceled {${this.ID}} request because of {${reason}} reason.`);
        }
    }
}