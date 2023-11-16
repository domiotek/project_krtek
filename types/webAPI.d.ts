
namespace WebAPI {
    type DateTime = import("luxon").DateTime;

    namespace Mysql {
        interface IConnectionRecord {
            timeout: NodeJS.Timeout
            acquiringLocation: string
            lastQuery: string | null
            queryingLocation: string | null
        }

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
             * Escape an untrusted string to be used as a SQL value. Use this on user provided data.
             */
            escapeValue(value: string): string;

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
            getLastQueryFailureReason(): "NoConnection" | "DBError"
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

    namespace Auth {

        type TAuthAPITypes = "UserAPI" | "RoleAPI" | "AccountTokenAPI" | "InviteAPI";
        type TErrorTypes<T extends "All" | TAuthAPITypes="All"> = 
            (T extends "All" | "SessionAPI"?SessionAPI.TErrorTypes:never) |
            (T extends "All" | "UserAPI"?UserAPI.TErrorTypes:never) | 
            (T extends "All" | "RoleAPI"?RoleAPI.TErrorTypes:never) | 
            (T extends "All" | "AccountTokenAPI"?AccountsTokenAPI.TErrorTypes:never) | 
            (T extends "All" | "InviteAPI"?InviteAPI.TErrorTypes:never);

        namespace SessionAPI {
            type TErrorTypes = "InvalidSession"
            interface ISessionDetails {
                sessionID: string
                userID: number
                ipAddress: string
                creationDate: import("luxon").DateTime
                lastAccessDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }
        }

        namespace UserAPI {
            type TErrorTypes = TUserCreationErrors | TSetPasswordErrors | TAssignRankErrors

            type TUserCreationErrors = "InvalidEmail" | "InvalidPassword" | "UserExists";
            type TSetPasswordErrors = "NoUser";
            type TAssignRankErrors = "InvalidRank";

            interface IUserRegistrationData {
                email: string
                password: string
                name: string
                surname: string
                gender: string
            }

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

            interface IRankDetails {
                ID: number
                rankName: string
                displayName: string
            }
        }

        namespace RoleAPI {
            type TErrorTypes = THasRoleErrors | TAssignRoleErrors | TUnAssignRoleErrors;

            type THasRoleErrors = "InvalidRole" | "NoUser";
            type TAssignRoleErrors = "RoleAlreadyAssigned" | THasRoleErrors;
            type TUnAssignRoleErrors = "NotAssigned" | THasRoleErrors;

            interface IRoleDetails {
                ID: number
                name: string
                displayName: string
            }

        }

        namespace AccountsTokenAPI {
            type TErrorTypes = TTokenCreationErrors | "InvalidToken";

            type TTokenCreationErrors = "TooMuchTokens" | "InvalidAction";


            type TAccountActionName = "ChangePassword";

            interface ITokenDetails {
                tokenID: string
                userID: number
                actionTypeID: string
                actionTypeName: string
                creationDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }
        }

        namespace InviteAPI {
            type TErrorTypes = TInviteCreationErrors;

            type TInviteCreationErrors = "InviteExists" | "UserExists" | "InvalidEmail"

            interface IInviteDetails {
                token: string
                email: string
                creationDate: import("luxon").DateTime
                expirationDate: import("luxon").DateTime
            }
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
             * 
             * @returns Either new session ID or null if credentials are incorrect.
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            tryLogin(email: string, password: string,ipAddress: string): Promise<string | null>

            /**
             * Checks whether session with that session token exists and hasn't exipired.
             * @param sessionToken Session Token.
             * 
             * @async
             * @returns Boolean on successfull request with either True if it is or False if it isn't
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            isSessionValid(sessionToken: string): Promise<boolean>

            /**
             * Tries to prolong session with given token, if it exists and hasn't expired yet.
             * @param sessionToken Session token.
             * @param ipAddress In case session exists, this will be new IP address stored.
             * 
             * @async
             * @returns Boolean on successfull request with either True if it was prolonged or False if it wasn't
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            prolongSession(sessionToken: string, ipAddress: string): Promise<boolean>

            /**
             * Returns details about auth session with given session token.
             * @param sessionToken Session token.
             * 
             * @async
             * @returns session object or null if session not found
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            getSessionDetails(sessionToken: string): Promise<SessionAPI.ISessionDetails | null>
            
            /**
             * Removes session with given session token.
             * @param sessionToken Session token
             * 
             * @async
             * @returns True on successfull request, false if not found.
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            dropSession(sessionToken: string): Promise<boolean>

            /**
             * Returns all not expired authentication sessions
             * @param userID Can be used to limit actions only to these of specified user.
             * 
             * @async
             * @returns Session objects array
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            getAllSessions(userID?: number): Promise<SessionAPI.ISessionDetails[]>

            /**
             * Removes all expired authentication sessions.
             * 
             * @async
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            dropAllExpiredSessions(): Promise<void>




            /**
             * User API
             */

            /**
             * Resolves userKey into userID.
             * @param conn existing connection. Can be passed to avoid creating another connection just for that.
             * @param hideSystemUser Whether to hide existence of the system user, by default true. Should be changed
             * only, when dealing with data, where system user could be assigned as owner, creator or is involved in any other way.
             * Shouldn't be used in methods that result in creation of objects designed specifically for real users.
             * @returns userID or null if user is not found.
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            resolveUserKey(userKey: string | number, hideSystemUser?: boolean=true): Promise<number | null>

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
             * @throws Can throw with NoConnection, DBError, InvalidEmail, UserExists or InvalidPassword errors.
             */
            createUser(userData: UserAPI.IUserRegistrationData): Promise<void>

            /**
             * Checks whether user with given user key exists or not.
             * @param userKey Email address or UserID
             * @param hideSystemUser Whether to hide existence of the system user, by default true. Should be changed
             * only, when dealing with data, where system user could be assigned as owner, creator or is involved in any other way.
             * Shouldn't be used in methods that result in creation of objects designed specifically for real users.
             * 
             * @async
             * @returns Boolean on successfull request with either True if exists or False if it doesn't.
             * 
             * @throws Can throw with NoConnection and DBError errors
             */
            userExists(userKey: string | number, hideSystemUser?: boolean=true): Promise<boolean>

            /**
             * Returns details about user that matches given query specifics.
             * @param userKey Either address email or userID.
             * @param hideSystemUser Whether to hide existence of the system user, by default true. Should be changed
             * only, when dealing with data, where system user could be assigned as owner, creator or is involved in any other way.
             * Shouldn't be used in methods that result in creation of objects designed specifically for real users.
             * 
             * @async
             * @returns User details object or null if user not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getUser(userKey: string | number, hideSystemUser?: boolean=true): Promise<UserAPI.IUserDetails | null>

            /**
             * Sets new password for specified user
             * @param userKey Either userID or email
             * @param newPassword Password in plain form. It will be hashed and salted before putting it into db.
             * 
             * @async
             * 
             * @throws Can throw with NoConnection, DBError, InvalidPassword or NoUser errors.
             */
            setPassword(userKey: number | string, newPassword: string): Promise<void>

            /**
             * Returns all registered users.
             * 
             * @async
             * @returns User details objects array
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getAllUsers(): Promise<UserAPI.IUserDetails[]>

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
             * 
             * @throws Can throw with NoConnection, DBError, NoUser or InvalidRank errors.
             */
            assignRank(userKey: string | number, rankName: string): Promise<void>

            /**
             * Returns details of the specified rank.
             * @param rankName Rank's code name.
             * 
             * @async
             * @returns Rank details object or null if rank not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getRank(rankName: string): Promise<UserAPI.IRankDetails | null>

            /**
             * Returns details of all defined ranks.
             * 
             * @async
             * @returns Rank details objects array.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getRanks(): Promise<UserAPI.IRankDetails[]>

            /**
             * Returns all users that have specified rank.
             * @param rankName Rank's code name.
             * 
             * @async
             * @returns User details objects array.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getUsersWithRank(rankName: string): Promise<UserAPI.IUserDetails[]>



            /**
             * Role API
             */

            /**
             * Returns internal DB roleID of role with given codeName
             * @param roleName role's codeName
             * @async
             * 
             * @returns role's ID in number format or null if role not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getRoleID(roleName: string): Promise<number | null>

            /**
             * Returns friendly, display name of the role
             * @param roleName role's code name.
             * 
             * @async
             * 
             * @returns role's display name in string format or null if role not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getRoleDisplayName(roleName: string): Promise<string | null>

            /**
             * Returns details of all defined roles
             * 
             * @async
             * @returns Role detail objects array.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getDefinedRoles(): Promise<RoleAPI.IRoleDetails[]>

            /**
             * Returns array of all users that have specified role assigned.
             * @param roleName Role's code name.
             * 
             * @async
             * @returns User details objects array or null if role not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            listUsersWithRole(roleName: string): Promise<UserAPI.IUserDetails[] | null>

            /**
             * Returns details of all roles that have been assigned to the specified user.
             * @param userKey Either email or user ID
             * 
             * @async
             * @returns Role detail objects array or null if user not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getUserRoles(userKey: string | number): Promise<RoleAPI.IRoleDetails[] | null>

            /**
             * Checks whether given user has specified role assigned. 
             * @param userKey Either email or user ID.
             * @param roleName Role's code name.
             * 
             * @async
             * @returns Boolean on successfull request with either True if they have or False if they don't.
             * 
             * @throws Can throw with NoConnection, DBError, NoUser or InvalidRole errors.
             */
            hasRole(userKey: string | number, roleName: string): Promise<boolean>

            /**
             * Assigns specified role to the given user.
             * @param userKey Either email or user ID.
             * @param roleName Role's code name.
             * 
             * @async 
             * 
             * @throws Can throw with NoConnection, DBError, NoUser, InvalidRole or RoleAlreadyAssigned errors.
             */
            assignRole(userKey: string | number, roleName: string): Promise<void>

            /**
             * Unassigns specified role from the given user.
             * @param userKey Either email or userID.
             * @param roleName Role's code name.
             * 
             * @async
             * 
             * @throws Can throw with NoConnection, DBError, NoUser, InvalidRole or NotAssigned, errors.
             */
            unassignRole(userKey: string | number, roleName: string): Promise<void>
            
            /**
             * Unassigns all roles that the specified user was given.
             * @param userKey Either email or userID.
             * 
             * @async
             * @returns True on successfull request or false if user not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            unassignAllRoles(userKey: string | number): Promise<boolean>



            /**
             * Accounts Token API
             */
            
            /**
             * Creates new token with specified action for given user.
             * @param userKey Either email address or userID.
             * @async
             * 
             * @returns New Token in string form.
             * 
             * @throws Can throw with NoConnection, DBError, TooMuchTokens, NoUser or InvalidAction errors.
             */
            createToken(actionType: AccountsTokenAPI.TAccountActionName, userKey: number | string): Promise<string>

            /**
             * Returns number of active tokens for given user.
             * Note that only not expired tokens will be considered.
             * @param userKey Either email address or userID.
             * @param actionTypeID Account action type.
             * 
             * @async
             * @returns Number of tokens or null if user not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getTokensCount(userKey: number | string, actionTypeID: AccountsTokenAPI.TAccountActionName): Promise<number | null>

            /**
             * Returns account action details with given token.
             * Note that this method will return only actions that are not expired.
             * Even if action with such token exists, but is expired, it will not be returned.
             * @param token Token ID.
             * 
             * @async
             * @returns Account action details or null if token not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getTokenDetails(token: string): Promise<AccountsTokenAPI.ITokenDetails | null>

            /**
             * Removes account action with given token.
             * @param token Token ID.
             * 
             * @async
             * @returns True on successfull request, false if token not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            dropToken(token: string): Promise<boolean>

            /**
             * Returns all account actions, even these expired.
             * @param userID Can be used to limit actions only to these of specified user.
             * 
             * @async
             * @returns Array of token objects.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getAllTokens(userID?: number): Promise<AccountsTokenAPI.ITokenDetails[]>

            /**
             * Removes all account actions that already expired.
             * 
             * @async
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            dropAllExpiredTokens(): Promise<void>

            /**
             * Returns all possible account action types
             * 
             * @async
             * @return Array of account action types
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getTokenTypes(): Promise<string[]>

            



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
             * @returns Invite details
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getInviteDetails(query: string): Promise<InviteAPI.IInviteDetails | null>

            /**
             * Generates new invite for given email, but only if there is no account with that email and
             * there is no invite already for that email address.
             * @param email Valid email address. Will fail if doesn't meet requirement.
             * @async
             * @returns New Invite token
             * 
             * @throws Can throw with NoConnection, DBError, InvalidEmail, UserExsits or InviteExists errors.
             */
            generateInvite(email: string): Promise<string>

            /**
             * Deletes invite with given invite ID.
             * @param token Invite ID
             * @async
             * @returns True on successfull request, false if invite not found.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            dropInvite(token: string): Promise<boolean>

            /**
             * Returns all defined invites (even these expired)
             * @async
             * @returns Array of invite details.
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            getAllInvites(): Promise<InviteAPI.IInviteDetails[]>

            /**
             * Deletes all expired invites.
             * @async
             * 
             * @throws Can throw with NoConnection and DBError errors.
             */
            dropAllExpiredInvites(): Promise<void>
        }
    }

    namespace Schedule {
        type TScheduleAPITypes = "ScheduleManager" | "WorkDayAPI" | "ShiftAPI";
        type TErrorTypes<T extends "All" | TScheduleAPITypes="All"> = 
            (T extends "All" | "ScheduleManager"?ScheduleManager.TErrorTypes:never) | 
            (T extends "All" | "WorkDayAPI"?WorkDayAPI.TErrorTypes:never) | 
            (T extends "All" | "ShiftAPI"?ShiftAPI.TErrorTypes:never);

        namespace ScheduleManager {
            type TErrorTypes = TGetUserShiftsErrors;
            type TGetUserShiftsErrors = "NoUser" | "InvalidRange"

            interface IDateRangeOptions {
                before?: DateTime
                after?: DateTime
            }

            interface IUserShifts {
                shifts: IWorkDay[]
                userSlots: number[]
                getJSON(): Promise<IJSONUserShifts>
            }

            interface IJSONUserShifts {
                shifts: WorkDayAPI.IJSONWorkDay[],
                userSlots: number[]
            }
        }

        namespace WorkDayAPI {
            type TErrorTypes = TSetNoteErrors | TAddSlotErrors | TEditSlotErrors | TAssignUserErrors;

            type TSetNoteErrors = "NoteTooLong";
            type TAddSlotErrors = TEditSlotErrors | "MaxSlotCountReached";
            type TEditSlotErrors = "InvalidDate" | "InvalidRole"
            type TAssignUserErrors = "UserWithoutRole" | "UserAlreadyAssigned" | "InvalidSlot"

            interface ISlots {
                [privateID: number]: IShiftSlot | undefined
            }

            interface IJSONSlots {
                [privateID: number]: IJSONShiftSlot | undefined
            }

            interface IShiftSlot {
                status: "Unassigned" | "Assigned" | "Pending" | "Finished"
                plannedStartTime: DateTime
                plannedEndTime: DateTime | null
                requiredRole: string
                requiredRoleDisplayName: string
                assignedShift: IShift | null
            }

            interface IAssignedShiftSlot extends IShiftSlot {
                assignedShift: IShift
            }

            interface IJSONShiftSlot {
                status: "Unassigned" | "Assigned" | "Pending" | "Finished"
                plannedStartTime: string
                plannedEndTime: string | null
                requiredRole: string
                requiredRoleDisplayName: string
                assignedShift: ShiftAPI.IJSONShift | null
            }

            interface IJSONWorkDay {
                ID: number
                note: string | null
                noteUpdateTime: string | null
                noteLastUpdater: string | null
                date: string
                slots: IJSONSlots
            }

        }

        namespace ShiftAPI {
            type TErrorTypes =  TGetUserErrors | TUpdateDataErrors;
            type TGetUserErrors = "NoUser"
            type TUpdateDataErrors = "InvalidTime" | "InvalidCurrency" | "InvalidDuration";

            interface IJSONShift {
                shiftID: number,
                startTime: string | null,
                endTime: string | null,
                tip: number,
                deduction: number,
                userID: number,
                userName: string
                note: string | null
            }
        }

        interface IScheduleManager {

            /**
             * Returns details about the specified work day.
             * @param when DateTime object with the requested day.
             * 
             * @async
             * @returns Workday instance or null if when is not valid date.
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getWorkDay(when: DateTime): Promise<IWorkDay | null>

            /**
             * Returns all shifts from specified period of time, where given user was in one of the slots.
             * @param from Optional parameter, when omitted, all records are searched. It's an object with two
             * properties - before and after. You can use both or only one of them to specify search range.
             * 
             * @async 
             * @returns User shifts object.
             * User shifts object consists of two properties - shifts which is an array of work days where user is assigned
             * and userSlots which is also an array and its values are the slot IDs to which user is assigned in the corresponding work day.
             * 
             * @throws Can throw NoConnection, DBError, NoUser or InvalidRange errors.
             */
            getUserShifts(userID: number, from?: ScheduleManager.IDateRangeOptions): Promise<ScheduleManager.IUserShifts>

            /**
             * Returns all work days from the current week.
             * 
             * @async
             * @returns WorkDay instance array
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getCurrentWeek(): Promise<IWorkDay[]>

            /**
             * Returns all work days from the week from the given day is.
             * @param ofDay Target date.
             * 
             * @async
             * @returns Work day instance array or null if ofDay isn't valid date.
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getWeek(ofDay: DateTime): Promise<IWorkDay[] | null>
        }

        interface IWorkDay {
            readonly ID: number
            readonly note: string | null
            readonly noteUpdateTime: DateTime | null
            readonly noteLastUpdater: Promise<Auth.UserAPI.IUserDetails | null>
            readonly date: DateTime

            /**
             * Returns data representation of workDay in JSON compatible format.
             * Using toJSON will throw an error.
             * 
             * @async Fetches slots data.
             */
            getJSON(): Promise<WorkDayAPI.IJSONWorkDay>

            /**
             * Sets new note for the workday.
             * @param newNote Maximum of 255 characters. Note can be cleared if null is given.
             * @param updater User that updates or creates note.
             * 
             * @async
             * @throws Can throw NoConnection, DBError or NoteTooLong errors.
             */
            setNote(newNote: string | null, updater: number): Promise<void>;

            /**
             * Returns details about the slot with given slot ID
             * @param id Slot ID
             * 
             * @async 
             * @returns Slot details object or null if slot not found.
             * @throws Can throw NoConnection and DBError errors.
             */
            getSlot(id: number): Promise<WorkDayAPI.IShiftSlot | null>


            /**
             * Returns details about the slot with specified user assigned
             * @param user Either userID or email.
             * 
             * @async 
             * @returns Slot details object or null if slot not found.
             * @throws Can throw NoConnection and DBError errors.
             */
            getUserSlot(user: string | number): Promise<WorkDayAPI.IAssignedShiftSlot | null>

            /**
             * Returns IDs of all defined slots.
             * 
             * @async
             * @returns IDs array
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getSlotIDs(): Promise<number[]>

            /**
             * Returns details of all defined slots.
             * 
             * @async
             * @returns Slot objects array.
             * Slots object is a key-value map with slot IDs as keys and slot details object as value.
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getAllSlots(): Promise<WorkDayAPI.ISlots>

            /**
             * Adds new slot to the work day. 
             * Note that there is a limit of how much slots there can be.
             * See MAX_SLOT_COUNT static property to see the limit.
             * @param definer User that creates the slot. Used to moderate user actions.
             * @param requiredRole Role that user has to have in order to be assigned to a slot.
             * @param startTime Planned start time for that slot.
             * @param endTime Planned end time for that slot. Optional.
             * 
             * @async
             * 
             * @returns ID of the new slot.
             * @throws Can throw NoConnection, DBError, InvalidTime, InvalidRole and MaxSlotCountReached errors.
             */
            addSlot(definer: number, requiredRole: string, startTime: DateTime, endTime?: DateTime): Promise<number>

            /**
             * Edits existing slot with given data.
             * @param slotID Target slot ID
             * @param requiredRole Role that user has to have in order to be assigned to a slot.
             * @param startTime Planned start time for that slot.
             * @param endTime Planned end time for that slot. Optional.
             * 
             * @async
             * @throws Can throw NoConnection, DBError, InvalidTime, InvalidSlot or InvalidRole errors.
             */
            editSlot(slotID: number, requiredRole: string, startTime: DateTime, endTime?: DateTime): Promise<void>

            /**
             * Deletes existing slot with specified ID. Will also delete shift details associated with it.
             * @param id Target slot ID.
             * 
             * @async 
             * @returns True on successfull request, false if slot doesn't exist.
             * @throws Can throw NoConnection and DBError errors.
             */
            deleteSlot(id: number): Promise<boolean>

            /**
             * Deletes all defined slots and shifts associated with them.
             * 
             * @async
             * @throws Can throw NoConnection and DBError errors.
             */
            deleteAllSlots(): Promise<void>

            /**
             * Assigns given user to the specified slot.
             * @param slotID Target slot ID.
             * @param userID User to assign. User has to have the required role and cannot be
             * already assigned to any other slot on the same work day.
             * 
             * @async
             * @throws Can throw NoConnection, DBError, InvalidSlot, NoUser, UserWithoutRole or UserAlreadyAssigned errors.
             */
            assignUser(slotID: number, userID: number): Promise<void>


            /**
             * Unassigns user from the specified slot.
             * @param slotID Target slot.
             * 
             * @async
             * @returns True on successfull request, false if slot doesn't exist.
             * @throws Can throw NoConnection and DBError errors.
             */
            unassignUser(slotID: number): Promise<boolean>
        }

        interface IShift {
            readonly ID: number;
            readonly startTime: DateTime | null;
            readonly endTime: DateTime | null;
            readonly tip: number;
            readonly deduction: number;
            readonly note: string | null;
            readonly userID: number;

            /**
             * Returns shift details in JSON compatible format.
             * Doesn't have userName, but is faster and synchronous.
             */
            toJSON(): Omit<ShiftAPI.IJSONShift,"userName">

            /**
             * Returns shift details in JSON compatible format.
             * Has additional field userName, for which it makes
             * db request.
             * 
             * @async Fetches userName
             * 
             */
            getJSON(): Promise<ShiftAPI.IJSONShift>

            /**
             * Returns details of the user associated with the shift.
             * 
             * @async 
             * @returns User details object
             * 
             * @throws Can throw NoConnection, DBError or NoUser errors.
             */
            getUser(): Promise<Auth.UserAPI.IUserDetails>


            /**
             * Sets new note for the shift.
             * @param newNote Maximum of 255 characters. Note can be cleared if null is given.
             * 
             * @async
             * @throws Can throw NoConnection, DBError or NoteTooLong errors.
             */
            setNote(newNote: string | null): Promise<void>;


            /**
             * Updates details about user shift.
             * 
             * @async
             * @throws Can throw NoConnection, DBError, InvalidTime, InvalidCurrency or InvalidDuration errors.
             */
            updateData(startTime: DateTime, endTime: DateTime, tip: number, deduction: number, note?: string): Promise<void>
        }
    }

    namespace Statistics {
        type TStatsAPITypes = "StatsManager" | "GoalAPI";
        type TErrorTypes<T extends "All" | TStatsAPITypes="All"> = 
            (T extends "All" | "StatsManager"?TStatsErrorTypes:never) | 
            (T extends "All" | "GoalAPI"?GoalAPI.TErrorTypes:never);

        type TStatsErrorTypes = "NoUser" | "InvalidDate";
        
        interface IMonthUserStats {
            totalHours: number
            shiftCount: number
            finishedShiftCount: number
            wagePerHour: number | null
            totalWage: number | null
            totalTip: number
            totalDeduction: number
            externalIncome: number | null
        }

        interface IHistoricUserData {
            wage: number | null
            externalIncome: number | null
            goalAmount: number | null
        }

        interface IUnsureHistoricUserData {
            wage?: number | null
            externalIncome?: number | null
            goalAmount?: number | null
        }

        namespace GoalAPI {
            type TErrorTypes = "MilestoneLimitReached";

            interface IMilestonesDetails {
                milestones: IMilestone[]
                totalAmount: number
            }

            interface IMilestone {
                ID: string
                title: string
                amount: number
                orderTag: number
            }

            interface IMilestoneOrder {
                [milestoneID: number]: number
            }

            interface IGoalManager {

                readonly MAX_MILESTONE_COUNT: number;

                /**
                 * Returns defined milestones along with the total goal amount.
                 * 
                 * @returns Object with milestones and numeric totalAmount properties, 
                 * where milestones contain array of milestone details.
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                getMilestones(): Promise<IMilestonesDetails>

                /**
                 * Calculates total earnings of the user in current month.
                 * 
                 * @returns Total earnings
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                getCurrentAmount(): Promise<number | null>

                /**
                 * Adds new milestone at the end of the list.
                 * @param title Milestone's title. Max 30 characters.
                 * @param amount Target amount for the milestone. Decimal.
                 * @param orderTag Number representing position in the list of milestones.
                 * 
                 * @returns ID of newly added milestone.
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                addMilestone(title: string, amount: number, orderTag: number): Promise<number>

                /**
                 * Removes milestone with given ID.
                 * 
                 * @param ID Milestone's ID. Milestone must belong to the current user, 
                 * otherwise deletion will fail.
                 * 
                 * @returns True on successful deletion, false otherwise.
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                dropMilestone(ID: number): Promise<boolean>

                /**
                 * Removes all user milestones.
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                dropAllMilestones(): Promise<void>

                /**
                 * Updates details of the given milestone.
                 * @param ID milestoneID. Must belong to the current user.
                 * @param title New milestone title.
                 * @param amount New milestone target amount.
                 * @param orderTag Number representing position in the list of milestones.
                 * 
                 * @returns True on successful edist, false otherwise.
                 * 
                 * @throws Can throw NoConnection and DBError errors.
                 */
                setMilestone(ID: number, title: string, amount: number, orderTag: number): Promise<boolean>
            }
        }

        

        interface IUserStatsManager {

            /**
             * Fetches user properties from the archive.
             * @param user Target user. Either userID or email.
             * @param date Target date. Only month and year are meaningful.  
             * 
             * @returns Archived user properties or null if there is no archive for that user in specified period.
             * 
             * @throws Can throw NoConnection, DBError, NoUser or InvalidDate errors.
             */
            getHistoricUserData(user: string | number, date: DateTime): Promise<IHistoricUserData | null>

            /**
             * Updates user properties archive with new data for the specified period.
             * @param user Target user. Either userID or email.
             * @param date Target date. Only month and year are meaningful.
             * @param data User properties.
             * 
             * @throws Can throw NoConnection, DBError, NoUser or InvalidDate errors.
             */
            setHistoricUserData(user: string | number, date: DateTime, data: IUnsureHistoricUserData): Promise<void>
            
            /**
             * Returns cached user statistics for the current month.
             * @param user Target user. Either userID or an email.
             * 
             * @returns User's statistics or null if there is no cache for specified user.
             * @throws Can throw NoConnection, DBError or NoUser errors.
             */
            getCacheState(user: string | number): Promise<IMonthUserStats | null>

            /**
             * Sets given user statistics as the cache for current month.
             * @param user Target user. Either userID or an email.
             * 
             * @throws Can throw NoConnection, DBError or NoUser errors.
             */
            setCacheState(user: string | number, stats: IMonthUserStats): Promise<void>

            /**
             * Drops statistics cache for specified user. Cache should be dropped 
             * when related properties, from which statistics are calculated, change.
             * @param user Target user. Either userID or an email.
             * 
             * @throws Can throw NoConnection, DBError or NoUser errors.
             */
            dropCacheState(user: string | number): Promise<void>

            /**
             * Returns user statistics for the given perdiod.
             * @param user Target user. Either userID or an email. 
             * @param date Target date. Only month and year are meaningful.
             * 
             * @returns User statistics or null if user doesn't exist.
             * 
             * @throws Can throw NoConnection and DBError errors.
             */
            getStatsOf(user: string | number, date: DateTime): Promise<IMonthUserStats | null>

            /**
             * Get user's monthly goal management API.
             * @param user Target user. Either userID or an email.
             * 
             * @returns GoalManager or null if such user doesn't exist.
             * @throws Can throw NoConnection and DBError errors.
             */
            getGoalOf(user: string | number): Promise<GoalAPI.IGoalManager | null>
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

    type APITypes = "Auth" | "Schedule" | "Stats";
    type SubAPITypes<T extends APITypes> =
        (T extends "Auth"?Auth.TAuthAPITypes:never) | 
        (T extends "Schedule"?Schedule.TScheduleAPITypes:never);

    type APIErrors<T extends APITypes, S extends "All" | SubAPITypes<T>="All"> = "NoConnection" | "DBError" | "NotImplemented"|
        (T extends "Auth"?Auth.TErrorTypes<S>:never) |
        (T extends "Schedule"?Schedule.TErrorTypes<S>:never) | 
        (T extends "Stats"?Statistics.TErrorTypes<S>:never);

    interface APIError<T extends APITypes=APITypes> extends Error {
        module: string
        errCode: APIErrors<T>
    }

    type TBaseRouteOptions = import("fastify").RouteOptions;
    interface IRouteOptions<T> extends TBaseRouteOptions {
        method: T["method"]
        url: T["url"]
        handler: (req: import("fastify").FastifyRequest, res: import("fastify").FastifyReply)=>Promise<T["returnType"]>
    }

}