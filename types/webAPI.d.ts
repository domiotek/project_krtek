
namespace WebAPI {

    namespace Mysql {
        
        interface IMysqlController {

            /**
             * Tests whether server has connetion with database
             */
            testConnection(): Promise<boolean>

            /**
             * Acquires new connection to the database. It operates on the Pool of connections
             * which means, that connections must released into the pool once they are no longer used.
             * 
             */
            getConnection(): Promise<IPoolConnection | null>
            
            /**
             * Reports mysql error. For now it's just a printout, but in future, when in production
             * this may notify administrator about mysql problems.
             */
            reportMysqlError(error: import("mysql").MysqlError): void

            /**
             * Wrapper for mysql query call.
             * @param queryStr Query
             * @param values Values to insert. Replace question marks inside query string.
             * @param conn Connection, that is used if given, otherwise new one is created. 
             * Can be usefull for transactions.
             */
            performQuery<T extends "Select" | "Other">(queryStr: string, values: Array<string | number | null>, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Mysql.TGenericMysqlResult<T> | null>

            /**
             * Returns error of last performQuery call
             * @throws Do not use if performQuery returned positive response. Will throw.
             * @returns Mysql Error
             */
            getLastQueryError(): import("mysql").MysqlError

            /**
             * Returns failure reason of last performQuery call
             * @throws Do not use if performQuery returned positive response. Will throw.
             * @returns Failure reason
             */
            getLastQueryFailureReason(): _.TGenericAPIError
        }

        type TMysqlSelectQueryResult = Array<{[field: string]: any}>

        interface IMysqlQueryResult {
            fieldCount: number
            affectedRows: number
            insertId: number
            serverStatus: number
            warningCount: number
            message: string
            changedRows: number
        }

        type TGenericMysqlResult<T extends "Select" | "Other"> = (T extends "Select"?TMysqlSelectQueryResult:IMysqlQueryResult) | undefined

        type Connection = import("mysql").Connection

        interface IPoolConnection extends Connection {
            release(): void
        }
    }

    namespace _ {
        type TGenericAPIError = "NoConnection" | "DBError";

        type TGenericActionResult = true | TGenericAPIError;

        interface IActionSuccess<T> {
            result: "Success"
            data: T
        }

        interface IActionFailure<T> {
            result: TGenericAPIError | T
        }

        type TGetAllActionResult<T, S=TGenericAPIError> = IActionSuccess<T> | IActionFailure<S>;
        
        type TGenericObjectActionResult<T,S> = IActionSuccess<T> | IActionFailure<S>

        namespace SessionAPI {
            interface ISessionDetails {
                sessionID: string
                userID: string
                ipAddress: string
                creationDate: import("luxon").DateTime
                lastAccessDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }

            type TLoginResult = _.TGenericObjectActionResult<string, "InvalidCredentials">;

            type TGetSessionValidResult = boolean | WebAPI._.TGenericAPIError;

            type TProlongSessionResult = boolean | WebAPI._.TGenericAPIError | "InvalidSession";

            type TGetSessionDetailsResult = _.TGenericObjectActionResult<ISessionDetails, "InvalidSession">;

            type TDropSessionResult = WebAPI._.TGenericActionResult | "InvalidSession";

            type TGetAllSessionsResult = WebAPI._.TGetAllActionResult<ISessionDetails[]>
        }

        namespace UserAPI {

            interface IUserRegistrationData {
                email: string
                password: string
                name: string
                surname: string
                gender: string
            }

            type TCreateUserResult = WebAPI._.TGenericActionResult | "InvalidEmail" | "UserExists" | "InvalidPassword";

            type TUserExistsResult = WebAPI._.TGenericActionResult | false;

            interface IUserDetails {
                userID: number
                email: string
                password: string
                name: string
                surname: string
                gender: "m" | "f" | "o"
                roleID: number
                roleName: string
                creationDate: import("luxon").DateTime
                lastAccessDate: import("luxon").DateTime
                lastPasswordChangeDate: import("luxon").DateTime
            }

            type TGetUserResult = _.TGenericObjectActionResult<IUserDetails, "InvalidInput" | "NoUser">

            type TSetPasswordResult = WebAPI._.TGenericActionResult | "InvalidPassword" | "InvalidUser";

            type TGetAllUsersResult = WebAPI._.TGetAllActionResult<IUserDetails[]>

        }

        namespace AccountsTokenAPI {

            type TCreateTokenResult = _.TGenericObjectActionResult<string, "NoUser" | "InvalidInput" | "TooMuchTokens" | "InvalidAction">

            type TAccountActionName = "ChangePassword";

            type TGetTokenCountResult = _.TGenericObjectActionResult<number | "NoUser">

            interface ITokenDetails {
                tokenID: string
                userID: number
                actionTypeID: string
                actionTypeName: string
                creationDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }

            type TGetTokenDetailsResult = _.TGenericObjectActionResult<ITokenDetails | "InvalidToken">

            type TDropTokenResult = WebAPI._.TGenericActionResult | "InvalidToken";

            type TGetAllTokensResult = WebAPI._.TGetAllActionResult<ITokenDetails[]>

            type TGetTokenTypesResult = WebAPI._.TGetAllActionResult<string[]>
        }

        namespace InviteAPI {
            interface IInviteDetails {
                token: string
                email: string
                creationDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }

            type TInviteGenResult = _.TGenericObjectActionResult<string, "InviteExists" | "AccountExists" | "InvalidEmail">

            type TGetInviteDetailsResult = _.TGenericObjectActionResult<IInviteDetails | "InvalidToken">
    
            type TDropInviteResult = WebAPI._.TGenericActionResult | "InvalidToken";

            type TGetAllTokensResult = WebAPI._.TGetAllActionResult<IInviteDetails[]>
        }

        interface ILastFailureReasonObject {
            error: import("mysql").MysqlError | null
            reason: "NoConnection" | "DBError" | "Success"
        }

        interface IWebAuthManager {

            /**
             * Session API
             */

            /**
             * Checks user credentials and if they match, creates new authentication session.
             * @param email Account's email address
             * @param password Password in plain form.
             * @param ipAddress Client's IP address
             */
            tryLogin(email: string, password: string,ipAddress: string): Promise<SessionAPI.TLoginResult>

            /**
             * Checks whether session with that session token exists and hasn't exipired.
             * @param sessionToken Session Token.
             * 
             * @async
             * @returns Boolean on successfull request with either True if it is or False if it isn't, string error code on failure.
             */
            isSessionValid(sessionToken: string): Promise<SessionAPI.TGetSessionValidResult>

            /**
             * Tries to prolong session with given token, if it exists and hasn't expired yet.
             * @param sessionToken Session token.
             * @param ipAddress In case session exists, this will be new IP address stored.
             * 
             * @async
             * @returns Boolean on successfull request with either True if it was prolonged or False if it wasn't, string error code on failure.
             */
            prolongSession(sessionToken: string, ipAddress: string): Promise<SessionAPI.TProlongSessionResult>

            /**
             * Returns details about auth session with given session token.
             * @param sessionToken Session token.
             * 
             * @async
             * @returns Object with string result and session object in data prop if result is Success
             */
            getSessionDetails(sessionToken: string): Promise<SessionAPI.TGetSessionDetailsResult>
            
            /**
             * Removes session with given session token.
             * @param sessionToken Session token
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            dropSession(sessionToken: string): Promise<SessionAPI.TDropSessionResult>

            /**
             * Returns all not expired authentication sessions
             * @param userID Can be used to limit actions only to these of specified user.
             * 
             * @async
             * @returns Object with string result and session objects array in data prop if result is Success
             */
            getAllSessions(userID?: number): Promise<SessionAPI.TGetAllSessionsResult>

            /**
             * Removes all expired authentication sessions.
             */
            dropAllExpiredSessions(): Promise<WebAPI._.TGenericActionResult>




            /**
             * User API
             */

            /**
             * Creates new user based on the provided data.
             * Implementation guarantees that the user will be valid when created or not created at all.
             * 
             * @param userData User Details object
             * @param userData.email Valid email address. Will fail if given doesn't match pattern.
             * @param userData.password Password matching requirements. Will fail if it doesn't.
             * @param userData.name First name
             * @param userData.surname Last name
             * @param userData.gender Sex coded m for male, f for female and o for other. Defaults to other if given invalid.
             * 
             * @async
             * 
             * @returns True on successfull request, string error code on failure.
             */
            createUser(userData: UserAPI.IUserRegistrationData): Promise<UserAPI.TCreateUserResult>

            /**
             * Checks whether user with given user key exists or not.
             * @param userKey Email address or UserID
             * 
             * @async
             * @returns Boolean on successfull request with either True if exists or False if it doesn't, string error code on failure.
             */
            userExists(userKey: string | number): Promise<UserAPI.TUserExistsResult>

            /**
             * Returns details about user that matches given query specifics.
             * @param userKey Either address email or userID.
             * 
             * @async
             * @returns Object with string result and User details object in data prop if result is Success
             */
            getUser(userKey: string | number): Promise<UserAPI.TGetUserResult>

            /**
             * Sets new password for specified user
             * @param userKey Either userID or email
             * @param newPassword Password in plain form. It will be hashed and salted before putting it into db.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            setPassword(userKey: number | string, newPassword: string): Promise<UserAPI.TSetPasswordResult>

            /**
             * Returns all registered users.
             * 
             * @async
             * @returns Object with string result and User details objects array in data prop if result is Success
             */
            getAllUsers(): Promise<UserAPI.TGetAllUsersResult>

            /**
             * Will delete account. Should we allow user initiated deletion? Do we remove the content user posted or
             * maybe we set flag for an account that it was deleted and just hide their personal information in UI?
             * All systems need to handle situations, where user doesn't exist.
             * @todo Not implemented yet. Needs whole concept of deleting account figured.
             *
             */
            dropAccount(): Promise<void>


            /**
             * Accounts Token API
             */
            
            /**
             * Creates new token with specified action for given user.
             * @param userKey Either email address or userID.
             * @async
             * 
             * @returns Object with string result and token in data prop if result is Success
             */
            createToken(actionType: AccountsTokenAPI.TAccountActionName, userKey: number | string): Promise<AccountsTokenAPI.TCreateTokenResult>

            /**
             * Returns number of active tokens for given user.
             * Note that only not expired tokens will be considered.
             * @param userKey Either email address or userID.
             * @param actionTypeID Account action type.
             * 
             * @async
             * @returns Object with string result and number of tokens in data prop if result is Success
             */
            getTokensCount(userKey: number | string, actionTypeID: AccountsTokenAPI.TAccountActionName): Promise<AccountsTokenAPI.TGetTokenCountResult>

            /**
             * Returns account action details with given token.
             * Note that this method will return only actions that are not expired.
             * Even if action with such token exists, but is expired, it will not be returned.
             * @param token Token ID.
             * 
             * @async
             * @returns Object with string result and account action details in data prop if result is Success
             */
            getTokenDetails(token: string): Promise<AccountsTokenAPI.TGetTokenDetailsResult>

            /**
             * Removes account action with given token.
             * @param token Token ID.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            dropToken(token: string): Promise<AccountsTokenAPI.TDropTokenResult>

            /**
             * Returns all account actions, even these expired.
             * @param userID Can be used to limit actions only to these of specified user.
             * 
             * @async
             * @returns
             */
            getAllTokens(userID?: number): Promise<AccountsTokenAPI.TGetAllTokensResult>

            /**
             * Removes all account actions that already expired.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            dropAllExpiredTokens(): Promise<WebAPI._.TGenericActionResult>

            /**
             * Returns all possible account action types
             * 
             * @async
             * @return Object with string result and account action types array in data prop if result is Success
             */
            getTokenTypes(): Promise<AccountsTokenAPI.TGetTokenTypesResult>

            



            /**
             * Invites API
             */

            /**
             * Returns details about the invite in question.
             * Note that this method will return invite that isn't expired. 
             * Even if there is an invite with given token, but it's expired, it will return InvalidToken.
             * 
             * @param query Either invite ID or email address.
             * @async
             * @returns Object with string result and invite details in data prop if result is Success
             */
            getInviteDetails(query: string): Promise<InviteAPI.TGetInviteDetailsResult>

            /**
             * Generates new invite for given email, but only if there is no account with that email and
             * there is no invite already for that email address.
             * @param email Valid email address. Will fail if doesn't meet requirement.
             * @async
             * @returns Object with string result and invite token in data prop if result is Success
             */
            generateInvite(email: string): Promise<InviteAPI.TInviteGenResult>

            /**
             * Deletes invite with given invite ID.
             * @param token Invite ID
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            dropInvite(token: string): Promise<InviteAPI.TDropInviteResult>

            /**
             * Returns all defined invites (even these expired)
             * @async
             * @returns Object with string result and invites details array in data prop if result is Success
             */
            getAllInvites(): Promise<InviteAPI.TGetAllTokensResult>

            /**
             * Deletes all expired invites.
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            dropAllExpiredInvites(): Promise<WebAPI._.TGenericActionResult>
        }
    }

    type TRouteSourceFile = Array<import("fastify").RouteOptions> | {[exportName: string]: any, default: Array<import("fastify").RouteOptions>}

    interface IGetRequestQuery {
        [param: string]: string | undefined
    }
    
    interface IDownloadsManager {
        /**
         * Creates new download item or edits existing one.
         * @param downloadName Download entry name
         * @param path Path to a file to download
         * @param static Allows for creating a link that will be available 
         * for the rest of the server session (unless deleted)
         * @throws
        */
        public setLink(downloadName: string,path: string, static?: boolean): Promise<void>
    
        /**
         * Removes download item with given name.
         * @param downloadName Download entry name
         */
        public removeLink(downloadName: string)
    
        /**
         * Returns path to file from entry with given name
         * @param downloadName Download entry name
         */
        public getLink(downloadName: string) : string | undefined
    
        /**
         * Clear all download entries.
         */
        public clearLinks()
    }


}