namespace FramAPI {
    namespace SocketNetwork {
    
        type ClientRejectionReason = "UnsupportedVersion" | "TooManyClients" | "ServerIsDisabled" | "UnspecifiedAppLevelReason"
        | "UnknownServerProtocolVersion" | "UnrecognizableRejectionFormat" | "HandshakeFailure" | "Custom";
        
        type ClientRejectionData<T> = 
            (T extends "UnsupportedVersion"?RejectionReasons.IUnsupportedProtocolVersion:never)
        |   (T extends "TooManyClients"?RejectionReasons.ITooManyClients:never)
        |   (T extends "UnrecognizableRejectionFormat"?RejectionReasons.IUnrecognizableRejectionFormat:never)
        |   (T extends "Custom"?any:never)
        |   (T extends "ServerIsDisabled" | "UnspecifiedAppLevelReason" | "UnknownServerProtocolVersion" | "HandshakeFailure"?null:never)

        interface IClientRejectionDetails<T extends ClientRejectionReason> {
            reason: T
            details: {
                message: string
                data: ClientRejectionData<T>
            }
        }

        namespace RejectionReasons {

            interface IUnsupportedProtocolVersion {
                /**
                 * @deprecated [1.2.0] Old versioning mechanism deprecation. Left for compatibility reasons.
                 */
                verificationMethod: "match"
                /**
                 * @deprecated [1.2.0] Old versioning mechanism deprecation. Left for compatibility reasons.
                 */
                serverSupportedVersions: Array<string>
                /**
                 * @deprecated [1.2.0] Old versioning mechanism deprecation. Left for compatibility reasons.
                 */
                currentVersion: string
                serverVersion: string
                clientVersion: string
            }

            interface ITooManyClients {
                clientsLimit: number
            }

            interface IUnrecognizableRejectionFormat {
                receivedReason: any
            }
        }
    
        interface IReconnectionDetails {
            rejoinSubscriptions: Array<string>
        }
    
        type SubscriptionRequestSource = "Client" | "Server";
    
        interface ISubscriptionListResponse {
            subscriptions: Array<string>
        }
    
        interface ISubscriptionStateRequest {
            subscriptionName: string
        }
        interface ISubscriptionStateResponse {
            subscriptionName: string,
            state: "ENABLED" | "DISABLED" | "NOTFOUND"
            clients: number
        }
    
        interface ISubscriptionRegisterRequest {
            subscriptionName: string
        }
        interface ISubscriptionRegisterResponse {
            subscriptionName: string
            state: "SUCCESS" | "DISABLED" | "NOTFOUND" | "ERROR"
            type: "JOIN" | "REJOIN"
            manifest:object | null
        }
    
        interface ISubscriptionRegistrationsEvent {
            subscriptionName: string
            source: SubscriptionRequestSource
            type: "JOIN" | "REJOIN" | "LEAVE"
            manifest?: object
        }
    
        interface ISubscriptionUnregisterRequest {
            subscriptionName: string
        }
        interface ISubscriptionUnregisterResponse {
            subscriptionName: string
            state: "SUCCESS" | "NOTREGISTERED" | "NOTFOUND" | "ERROR"
        }
    
        interface ISubscriptionKickResponse {
            subscriptionName: string
            reason: string
        }
    
        type RequestStateType = "PENDING" | "CANCELED" | "FINISHED" | "CRASHED" | "INVALID";
        interface IRequestInitRequest {
            command: string
            params: Array<string>
        }
        interface IRequestInitResponse {
            requestID: number | null
        }
        interface IRequestStateRequest {
            requestID: number
        }
        interface IRequestStateResponse {
            requestID: number
            state: RequestStateType
            data?: IRequestCancelData | IRequestCrashData
        }
        interface IRequestCancelRequest {
            requestID: number
        }
    
        type RequestCancelationReason = "NoHandlerAvailable" | "NoFinalResponseProduced" | "ClientInitiated" | "ServerClosed" | "ServerDisabled" | "TooManyRequests" | "ServerDisconnected" | "ClientDisconnected" | "Other"
        interface IRequestCancelResponse {
            requestID: number
            reason: RequestCancelationReason
        }
    
        interface IRequestCancelData {
            reason: RequestCancelationReason
        }
    
        interface IRequestCrashData {
            error: string
        }
    
        interface IRequestResponse {
            requestID: number
            response: any,
            isFinal: boolean
        }
        interface IRequestPacket {
            data: object
            token: number
        }
    }
}