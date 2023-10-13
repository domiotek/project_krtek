
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
    }

    namespace Auth {
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
                rankID: number
                rankName: string
                creationDate: import("luxon").DateTime
                lastAccessDate: import("luxon").DateTime
                lastPasswordChangeDate: import("luxon").DateTime
            }

            type TGetUserResult = _.TGenericObjectActionResult<IUserDetails, "NoUser">

            type TSetPasswordResult = WebAPI._.TGenericActionResult | "InvalidPassword" | "NoUser";

            type TGetAllUsersResult = WebAPI._.TGetAllActionResult<IUserDetails[]>

            interface IRankDetails {
                ID: number
                rankName: string
                displayName: string
            }

            type TAssignRankResult = _.TGenericActionResult | "NoUser" | "InvalidRank"

            type TGetRankResult = _.TGenericObjectActionResult<IRankDetails,"InvalidRank">

            type TGetRanksResult = _.TGenericObjectActionResult<IRankDetails[], _.TGenericAPIError>

            type TGetUsersWithRankResult = _.TGenericObjectActionResult<IUserDetails[],"InvalidRank">
        }

        namespace RoleAPI {
            interface IRoleDetails {
                ID: number
                name: string
                displayName: string
            }

            type TGetRoleIDResult = _.TGenericObjectActionResult<number, "InvalidRole">
            type TGetDefinedRolesResult = _.TGenericObjectActionResult<IRoleDetails[], _.TGenericAPIError>
            type TListRoleUsersResult = _.TGenericObjectActionResult<UserAPI.IUserDetails[], "InvalidRole">
            type TGetRolesResult = _.TGenericObjectActionResult<IRoleDetails[], "NoUser">
            type THasRoleResult = boolean | _.TGenericAPIError | "NoUser" | "InvalidRole"
            type TAssignRoleResult = _.TGenericActionResult | "NoUser" | "InvalidRole" | "AlreadyAssigned"
            type TUnassignRoleResult = _.TGenericActionResult | "InvalidRole" | "NoUser" | "NotAssigned"
            type TUnassignAllRolesResult = _.TGenericActionResult | "NoUser"

        }

        namespace AccountsTokenAPI {

            type TCreateTokenResult = _.TGenericObjectActionResult<string, "NoUser" | "TooMuchTokens" | "InvalidAction">

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
             * Assigns rank to the specified user.
             * @param userKey Either email or user ID.
             * @param rankName Rank's code name.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            assignRank(userKey: string | number, rankName: string): Promise<UserAPI.TAssignRankResult>

            /**
             * Returns details of the specified rank.
             * @param rankName Rank's code name.
             * 
             * @async
             * @returns Object with string result and rank details object in data prop if result is Success
             */
            getRank(rankName: string): Promise<UserAPI.TGetRankResult>

            /**
             * Returns details of all defined ranks.
             * 
             * @async
             * @returns Object with string result and rank details objects array in data prop if result is Success
             */
            getRanks(): Promise<UserAPI.TGetRanksResult>

            /**
             * Returns all users that have specified rank.
             * @param rankName Rank's code name.
             * 
             * @async
             * @returns Object with string result and User details objects array in data prop if result is Success
             */
            getUsersWithRank(rankName: string): Promise<UserAPI.TGetUsersWithRankResult>



            /**
             * Role API
             */

            /**
             * Returns internal DB roleID of role with given codeName
             * @param roleName role's codeName
             */
            getRoleID(roleName: string): Promise<RoleAPI.TGetRoleIDResult>

            /**
             * Returns details of all defined roles
             * 
             * @async
             * @returns Object with string result and role detail objects array in data prop if result is Success
             */
            getDefinedRoles(): Promise<RoleAPI.TGetDefinedRolesResult>

            /**
             * Returns array of all users that have specified role assigned.
             * @param roleName Role's code name.
             * 
             * @async
             * @returns Object with string result and User details objects array in data prop if result is Success
             */
            listUsersWithRole(roleName: string): Promise<RoleAPI.TListRoleUsersResult>

            /**
             * Returns details of all roles that have been assigned to the specified user.
             * @param userKey Either email or user ID
             * 
             * @async
             * @returns Object with string result and role detail objects array in data prop if result is Success
             */
            getUserRoles(userKey: string | number): Promise<RoleAPI.TGetRolesResult>

            /**
             * Checks whether given user has specified role assigned. 
             * @param userKey Either email or user ID.
             * @param roleName Role's code name.
             * 
             * @async
             * @returns Boolean on successfull request with either True if they have or False if they don't, string error code on failure.
             */
            hasRole(userKey: string | number, roleName: string): Promise<RoleAPI.THasRoleResult>

            /**
             * Assigns specified role to the given user.
             * @param userKey Either email or user ID.
             * @param roleName Role's code name.
             * 
             * @async 
             * @returns True on successfull request, string error code on failure.
             */
            assignRole(userKey: string | number, roleName: string): Promise<RoleAPI.TAssignRoleResult>

            /**
             * Unassigns specified role from the given user.
             * @param userKey Either email or userID.
             * @param roleName Role's code name.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            unassignRole(userKey: string | number, roleName: string): Promise<RoleAPI.TUnassignRoleResult>
            
            /**
             * Unassigns all roles that the specified user was given.
             * @param userKey Either email or userID.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            unassignAllRoles(userKey: string | number): Promise<RoleAPI.TUnassignAllRolesResult>



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

    namespace Schedule {

        type DateTime = import("luxon").DateTime;

        namespace ScheduleManager {
            interface IDateRangeOptions {
                before?: DateTime
                after?: DateTime
            }

            interface IUserShifts {
                shifts: IWorkDay[]
                userSlots: number[]
            }

            type TGetWorkDayResult = _.TGenericObjectActionResult<IWorkDay, "InvalidDate">
            type TGetUserShiftsResult = WebAPI._.TGenericObjectActionResult<IUserShifts,"InvalidUser" | "InvalidRange">
            type TGetWeekResult = WebAPI._.TGenericObjectActionResult<IWorkDay[],"InvalidDate">
            
        }

        namespace WorkDayAPI {
            interface ISlots {
                [privateID: number]: IShiftSlot | undefined
            }

            interface IShiftSlot {
                plannedStartTime: DateTime
                plannedEndTime: DateTime | null
                requiredRole: string
                assignedShift: IShift | null
            }
            
            type TSetNoteResult = WebAPI._.TGenericActionResult | "NoteTooLong"
            type TGetSlotResult = WebAPI._.TGenericObjectActionResult<IShiftSlot, "InvalidSlot">
            type TGetSlotIDsResult = WebAPI._.TGenericObjectActionResult<number[],WebAPI._.TGenericAPIError>
            type TGetAllSlots = WebAPI._.TGetAllActionResult<ISlots>
            type TAddSlot = WebAPI._.TGenericActionResult | "InvalidRole" | "InvalidDateTimeInput" | "MaxSlotCountReached"
            type TEditSlotResult = WebAPI._.TGenericActionResult | "InvalidRole" | "InvalidDateTimeInput"
            type TDeleteSlot = WebAPI._.TGenericActionResult | "InvalidSlot"
            type TAssignUserResult = WebAPI._.TGenericActionResult | "InvalidSlot" | "NoUser" | "UserWithoutRole" | "AlreadyAssigned"
            type TUnassignUserResult = WebAPI._.TGenericActionResult | "InvalidSlot"
        }

        namespace ShiftAPI {
            type TGetUserResult = WebAPI._.IActionSuccess<Auth.UserAPI.IUserDetails> | WebAPI._.IActionFailure<"NoUser">
            type TUpdateDataResult = WebAPI._.TGenericActionResult | "InvalidInput" | "InvalidShift"
        }

        interface IScheduleManager {

            /**
             * Returns details about the specified work day.
             * @param when DateTime object with the requested day.
             * 
             * @async
             * @returns Object with string result and Workday instance in data prop if result is Success
             */
            getWorkDay(when: DateTime): Promise<ScheduleManager.TGetWorkDayResult>

            /**
             * Returns all shifts from specified period of time, where given user was in one of the slots.
             * @param from Optional parameter, when omitted, all records are searched. It's an object with two
             * properties - before and after. You can use both or only one of them to specify search range.
             * 
             * @async 
             * @returns Object with string result and user shifts object in data prop if result is Success. 
             * User shifts object consists of two properties - shifts which is an array of work days where user is assigned
             * and userSlots which is also an array and its values are the slot IDs to which user is assigned in the corresponding work day.
             */
            getUserShifts(userID: number, from?: ScheduleManager.IDateRangeOptions): Promise<ScheduleManager.TGetUserShiftsResult>

            /**
             * Returns all work days from the current week.
             * 
             * @async
             * @returns Object with string result and work day instance array in data prop if result is Success
             */
            getCurrentWeek(): Promise<ScheduleManager.TGetWeekResult>

            /**
             * Returns all work days from the week from the given day is.
             * @param ofDay Target date.
             * 
             * @async
             * @returns Object with string result and work day instance array in data prop if result is Success
             */
            getWeek(ofDay: DateTime): Promise<ScheduleManager.TGetWeekResult>
        }

        interface IWorkDay {
            readonly ID: number
            readonly note: string | null
            readonly date: DateTime

            /**
             * Sets new note for the workday.
             * @param newNote Maximum of 255 characters. Note can be cleared if null is given.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            setNote(newNote: string | null): Promise<WorkDayAPI.TSetNoteResult>;

            /**
             * Returns details about the slot with given slot ID
             * @param id Slot ID
             * 
             * @async 
             * @returns Object with string result and slot details object in data prop if result is Success
             */
            getSlot(id: number): Promise<WorkDayAPI.TGetSlotResult>

            /**
             * Returns IDs of all defined slots.
             * 
             * @async
             * @returns Object with string result and IDs array in data prop if result is Success
             */
            getSlotIDs(): Promise<WorkDayAPI.TGetSlotIDsResult>

            /**
             * Returns details of all defined slots.
             * 
             * @async
             * @returns Object with string result and slots object in data prop if result is Success.
             * Slots object is a key-value map with slot IDs as keys and slot details object as value.
             */
            getAllSlots(): Promise<WorkDayAPI.TGetAllSlots>

            /**
             * Adds new slot to the work day. 
             * Note that there is a limit of how much slots there can be.
             * See MAX_SLOT_COUNT static property to see the limit.
             * @param requiredRole Role that user has to have in order to be assigned to a slot.
             * @param startTime Planned start time for that slot.
             * @param endTime Planned end time for that slot. Optional.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            addSlot(requiredRole: string, startTime: DateTime, endTime?: DateTime): Promise<WorkDayAPI.TAddSlot>

            /**
             * Edits existing slot with given data.
             * @param slotID Target slot ID
             * @param requiredRole Role that user has to have in order to be assigned to a slot.
             * @param startTime Planned start time for that slot.
             * @param endTime Planned end time for that slot. Optional.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            editSlot(slotID: number, requiredRole: string, startTime: DateTime, endTime?: DateTime): Promise

            /**
             * Deletes existing slot with specified ID. Will also delete shift details associated with it.
             * @param id Target slot ID.
             * 
             * @async 
             * @returns True on successfull request, string error code on failure.
             */
            deleteSlot(id: number): Promise<WorkDayAPI.TDeleteSlot>

            /**
             * Deletes all defined slots and shifts associated with them.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            deleteAllSlots(): Promise<WebAPI._.TGenericActionResult>

            /**
             * Assigns given user to the specified slot.
             * @param slotID Target slot ID.
             * @param userID User to assign. User has to have the required role and cannot be
             * already assigned to any other slot on the same work day.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            assignUser(slotID: number, userID: number): Promise<WorkDayAPI.TAssignUserResult>


            /**
             * Unassigns user from the specified slot.
             * @param slotID Target slot.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            unassignUser(slotID: number): Promise<WorkDayAPI.TUnassignUserResult>
        }

        interface IShift {
            readonly ID: number;
            readonly startTime: DateTime;
            readonly endTime: DateTime | null;

            /**
             * Returns details of the user associated with the shift.
             * 
             * @async 
             * @returns Object with string result and User details object in data prop if result is Success
             */
            getUser(): Promise<ShiftAPI.TGetUserResult>

            /**
             * Updates start and end times for this shift.
             * 
             * @async
             * @returns True on successfull request, string error code on failure.
             */
            updateData(startTime: DateTime, endTime: DateTime): Promise<ShiftAPI.TUpdateDataResult>
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