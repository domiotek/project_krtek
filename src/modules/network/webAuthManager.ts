import { randomBytes} from "crypto";
import { hash, compare} from "bcrypt";
import { DateTime } from "luxon";
import { APIError } from "../util.js";

class WebAuthAPIError extends APIError<"Auth"> {
    constructor(errCode: WebAPI.APIErrors<"Auth">) {
        super(WebAuthManager.name, errCode);
    }
}

/**
 * 
 * Internal note: when connection is passed as the parameter of one of the method
 * and that method throws an error, the passed connection should be considered as released.
 */
export class WebAuthManager implements WebAPI.Auth.IWebAuthManager {
    private readonly db: WebAPI.Mysql.IMysqlController;

    private readonly MAX_SLOT_COUNT = 7;

    /**
     * Manager that has all necessary tools to interact with authentication database.
     * Is capable of managing users, their sessions, actions on those accounts as well as registration invites.
     * @param mysqlConn MySQL connection controller
     */
    constructor(mysqlConn: WebAPI.Mysql.IMysqlController) {
        this.db = mysqlConn;
    }

    /**
     * Translates userKey into more descriptive form.
     * @returns object containing field property which holds db field name in users table to search in and userKey which still
     * holds either userID or email, but with email lowercased.
     */
    private _translateUserKey(userKey: string | number): {field: "email" | "userID", userKey: string | number} {
        switch(typeof userKey) {
            case "string": return {field: "email", userKey: userKey.toLowerCase()};
            case "number": return {field: "userID", userKey};
            default: throw new TypeError("Invalid user key. Expected either number or a string.");
        }
    }

    //Session API

    public async tryLogin(email: string, password: string,ipAddress: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["tryLogin"]> {
        const connection = conn ?? await this.db.getConnection();
        
        if(connection) {
            if(!conn) connection.beginTransaction();
            
            const user = await this.getUser(email, connection);
            let errCode: WebAPI.APIErrors<"Auth"> | null = null;

            if(user&&(await compare(password, user.password))) {

                const newSessionID = randomBytes(16).toString("hex");

                let queryStr = `INSERT INTO auth_sessions(sessionID, userID, ipAddress, expirationDate) VALUES(?, ?, ?,?);`;
                let response = await this.db.performQuery<"Other">(queryStr,[newSessionID, user.userID, ipAddress, DateTime.now().plus({days: 7}).toISO()]);
                if(response) {
                    if(response.affectedRows===1) {
                        queryStr = `UPDATE users SET lastAccessDate=NOW() WHERE userID=?`;
                        response = await this.db.performQuery<"Other">(queryStr,[user.userID],connection);
                        if(response) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return newSessionID;
                        }else errCode = this.db.getLastQueryFailureReason();
                    }else errCode = "DBError";
                }else errCode = this.db.getLastQueryFailureReason();
            }

            if(!conn || errCode) connection.release();
            if(errCode) throw new WebAuthAPIError(errCode);
            return null;
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async isSessionValid(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["isSessionValid"]> {
        const result = await this.db.performQuery<"Select">(`SELECT userID FROM auth_sessions WHERE sessionID=? AND now() < expirationDate`,[sessionToken], conn);

        if(result) {
            return result.length===1;
        }else {
            conn?.release();
            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        }
    }

    public async prolongSession(sessionToken: string, ipAddress: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["prolongSession"]> {

        const connection = conn ?? await this.db.getConnection();
        if(connection) {
            if(!conn) connection.beginTransaction();

            let errCode: WebAPI.APIErrors<"Auth"> | null = null;

            const session = await this.getSessionDetails(sessionToken, connection);

            if(session) {
                let queryStr = `UPDATE auth_sessions SET lastAccessDate=current_timestamp(), ipAddress=? WHERE sessionID=? AND NOW() < expirationDate;`;
                let response = await this.db.performQuery<"Other">(queryStr,[ipAddress,sessionToken],conn);

                if(response) {
                    if(response.affectedRows===1) {
                        queryStr = `UPDATE users SET lastAccessDate=NOW() WHERE userID=?`;     

                        response = await this.db.performQuery<"Other">(queryStr,[session.userID]);

                        if(response) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            
                            return true;
                        }else errCode = this.db.getLastQueryFailureReason();
                    }
                }else errCode = this.db.getLastQueryFailureReason();
            }
            
            if(!conn || errCode) connection.release();

            if(errCode) throw new WebAuthAPIError(errCode);
            return false;
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async getSessionDetails(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getSessionDetails"]> {

        let queryStr = `SELECT * FROM auth_sessions WHERE sessionID=? AND now() < expirationDate;`;
        const response = await this.db.performQuery<"Select">(queryStr,[sessionToken],conn);

        if(response) {
            if(response.length===1) {
                return {
                    sessionID: response[0]["sessionID"],
                    userID: response[0]["userID"],
                    ipAddress: response[0]["ipAddress"],
                    creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                    lastAccessDate: DateTime.fromJSDate(response[0]["lastAccessDate"]),
                    expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                }
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async dropSession(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropSession"]> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM auth_sessions WHERE sessionID=?`,[sessionToken],conn);

        if(result) {
            if(result.affectedRows===1) {
                return true;
            }else return false;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getAllSessions(userID: number, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getAllSessions"]> {
        let errCode: WebAPI.APIErrors<"Auth">;

        let conditionQuery = userID?`WHERE userID=${this.db.escapeValue(userID.toString())}`:"";

        const query = `SELECT * FROM auth_sessions ${conditionQuery};`;
        const response = await this.db.performQuery<"Select">(query,[],conn);

        if(response) {
            const result = [];
            for (const row of response) {
                result.push({
                    sessionID: row["sessionID"],
                    userID: row["userID"],
                    ipAddress: row["ipAddress"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    lastAccessDate: DateTime.fromJSDate(row["lastAccessDate"]),
                    expirationDate: DateTime.fromJSDate(row["expirationDate"])
                });
            }

            return result;
        }else errCode = this.db.getLastQueryFailureReason();


        conn?.release();
        throw new WebAuthAPIError(errCode);
    }

    public async dropAllExpiredSessions(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropAllExpiredSessions"]> {
        const response = await this.db.performQuery(`DELETE FROM auth_sessions WHERE now() > expirationDate;`,[],conn);    

        if(response==null) {
            conn?.release();
            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        }
            
    }

    //User API

    public async resolveUserKey(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["resolveUserKey"]> {
        switch(typeof userKey) {
            case "string": 
                const userData = await this.getUser(userKey,conn);
                if(userData) return userData.userID;
                else return null;
            case "number": return userKey;
            default: throw new TypeError("Invalid user key. Expected either number or a string.");
        }
    }

    public async createUser(userData: WebAPI.Auth.UserAPI.IUserRegistrationData, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["createUser"]> {
        const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        const connection = conn ?? await this.db.getConnection();
    

        if(connection) {
            let errCode: WebAPI.APIErrors<"Auth">;

            if(emailRegex.test(userData.email)) {
                if(!conn) connection.beginTransaction();
                const user = await this.userExists(userData.email,connection);

                if(user==false) {
                    const queryStr = `SELECT add_user(?,?,?,?);`;

                    const response = await this.db.performQuery<"Select">(queryStr, [userData.email.toLowerCase(), userData.name, userData.surname, userData.gender], connection);

                    if(response) {
                        if(response.length===1){

                            try {
                                await this.setPassword(userData.email,userData.password,connection);
                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                return;
                            } catch (error: any) {
                                if(!error.errCode) throw error;
                                throw new WebAuthAPIError("InvalidPassword");
                            }
                        }else errCode = "DBError";
                    }else errCode = this.db.getLastQueryFailureReason();
                }else errCode = "UserExists";
            }else errCode = "InvalidEmail";
            
            connection.release();
            throw new WebAuthAPIError(errCode);
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async userExists(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["userExists"]> {

        const {field, userKey: safeUserKey} = this._translateUserKey(userKey);

        const result = await this.db.performQuery<"Select">(`SELECT userID FROM users WHERE ${field}=?;`,[safeUserKey],conn);

        if(result) {
            return result.length===1;
        }

        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getUser(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getUser"]> { 
        const {field, userKey: safeUserKey} = this._translateUserKey(userKey);

        const response = await this.db.performQuery<"Select">(`SELECT * FROM users NATURAL JOIN ranks WHERE ${field}=?;`,[safeUserKey],conn);

        if(response) {
            if(response.length===1) {
                return {
                    userID: response[0]["userID"],
                    email: response[0]["email"],
                    password: response[0]["password"],
                    name: response[0]["name"],
                    surname: response[0]["surname"],
                    gender: response[0]["gender"],
                    rankID: response[0]["rankID"],
                    rankName: response[0]["displayName"],
                    creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                    lastAccessDate: DateTime.fromJSDate(response[0]["lastAccessDate"]),
                    lastPasswordChangeDate: DateTime.fromJSDate(response[0]["lastPasswordChangeDate"])
                }
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async setPassword(userKey: string | number, newPassword: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["setPassword"]> {

        const userID = await this.resolveUserKey(userKey, conn);

        if(userID===null) return;

        if(!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/.test(newPassword)) {
            conn?.release();
            throw new WebAuthAPIError("InvalidPassword");
        }

        const hashedPassword = await hash(newPassword,10);
        
        const result = await this.db.performQuery<"Other">(`UPDATE users SET password=?, lastPasswordChangeDate=NOW() WHERE userID=?`,[hashedPassword, userID],conn);

        if(!result||result.changedRows!==1) {
            conn?.release();
            throw new WebAuthAPIError(result?"NoUser":this.db.getLastQueryFailureReason());
        }
    }

    public async dropAccount(): Promise<void> {
        //[TODO]
    }

    public async getAllUsers(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getAllUsers"]> {
        const result = [];

        const query = `SELECT * FROM users NATURAL JOIN ranks;`;
        const response = await this.db.performQuery<"Select">(query,[],conn);

        if(response) {

            for (const row of response) {
                result.push({
                    userID: row["userID"],
                    email: row["email"],
                    password: row["password"],
                    name: row["name"],
                    surname: row["surname"],
                    gender: row["gender"],
                    rankID: row["rankID"],
                    rankName: row["displayName"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    lastAccessDate: DateTime.fromJSDate(row["lastAccessDate"]),
                    lastPasswordChangeDate: DateTime.fromJSDate(row["lastPasswordChangeDate"]),
                });
            }
            return result;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async assignRank(userKey: string | number, rankName: string,conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["assignRank"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            let errCode: WebAPI.APIErrors<"Auth">;

            const userID = await this.resolveUserKey(userKey, connection);

            if(userID!=null) {
                const rankDetails = await this.getRank(rankName, connection);

                if(rankDetails) {
                    const response = await this.db.performQuery<"Other">("UPDATE users SET rankID=? WHERE userID=?",[rankDetails.ID, userID]);

                    if(response) {
                        if(response.affectedRows===1) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            
                            return;
                        }else errCode = "DBError";
                    }else errCode = this.db.getLastQueryFailureReason();
                }else errCode = "InvalidRank";
            }else errCode = "NoUser";

            connection.release();
            throw new WebAuthAPIError(errCode);
        }
        
        throw new WebAuthAPIError("NoConnection");
    }

    public async getRank(rankName: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getRank"]> {
        const response = await this.db.performQuery<"Select">("SELECT rankID, displayName FROM ranks WHERE rankName=?",[rankName], conn);
        let errCode;

        if(response) {
            if(response.length===1) {
                return {
                    ID: response[0]["rankID"],
                    rankName,
                    displayName: response[0]["displayName"]
                }
            }
        }else errCode = this.db.getLastQueryFailureReason();

        if(errCode) {
            conn?.release();
            throw new WebAuthAPIError(errCode);
        }
        return null;
    }

    public async getRanks(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getRanks"]> {
        const response = await this.db.performQuery<"Select">("SELECT * FROM ranks",[], conn);
            
        if(response) {
            const result = [];

            for (const row of response) {
                result.push({
                    ID: row["rankID"],
                    rankName: row["rankName"],
                    displayName: row["displayName"]
                })
            }
            return result;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getUsersWithRank(rankName: string,conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getUsersWithRank"]> {
        const response = await this.db.performQuery<"Select">("SELECT * FROM users NATURAL JOIN ranks WHERE rankID=?",[rankName], conn);
            
        if(response) {
            const result = [];

            for (const row of response) {
                result.push({
                    userID: row["userID"],
                    email: row["email"],
                    password: row["password"],
                    name: row["name"],
                    surname: row["surname"],
                    gender: row["gender"],
                    rankID: row["rankID"],
                    rankName: row["displayName"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    lastAccessDate: DateTime.fromJSDate(row["lastAccessDate"]),
                    lastPasswordChangeDate: DateTime.fromJSDate(row["lastPasswordChangeDate"]),
                });
            }

            return result;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    //Role API

    public async getRoleID(roleName: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getRoleID"]> {
        const response = await this.db.performQuery<"Select">("SELECT roleID FROM roles where roleName=?",[roleName],conn);

        if(response) {
            if(response.length==1) {
                return response[0]["roleID"];
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getRoleDisplayName(roleName: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getRoleDisplayName"]> {
        const response = await this.db.performQuery<"Select">("SELECT displayName FROM roles where roleName=?",[roleName],conn);

        if(response) {
            if(response.length==1) {
                return response[0]["displayName"];
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getDefinedRoles(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getDefinedRoles"]> {
        const result = [];

        const response = await this.db.performQuery<"Select">("SELECT * from roles",[], conn);
        let errCode;

        if(response) {

            for (const row of response) {
                result.push({
                    ID: row["roleID"],
                    name: row["roleName"],
                    displayName: row["displayName"]
                })
            }
        }else errCode = this.db.getLastQueryFailureReason();

        if(errCode) {
            conn?.release();
            throw new WebAuthAPIError(errCode);
        }
        return result;
    }

    public async listUsersWithRole(roleName: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["listUsersWithRole"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            let errCode: WebAPI.APIErrors<"Auth"> | null = null;

            let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);
            if(roleDetails) {

                if(roleDetails.length===1) {
                    const response = await this.db.performQuery<"Select">("SELECT * from role_assignments NATURAL JOIN users WHERE roleID=?",[roleDetails[0]["roleID"]], connection);

                    if(response) {
                        const result = [];
    
                        for (const row of response) {
                            result.push({
                                userID: row["userID"],
                                email: row["email"],
                                password: row["password"],
                                name: row["name"],
                                surname: row["surname"],
                                gender: row["gender"],
                                rankID: row["rankID"],
                                rankName: row["displayName"],
                                creationDate: DateTime.fromJSDate(row["creationDate"]),
                                lastAccessDate: DateTime.fromJSDate(row["lastAccessDate"]),
                                lastPasswordChangeDate: DateTime.fromJSDate(row["lastPasswordChangeDate"]),
                            })
                        }
                        if(!conn) {
                            connection.commit();
                            connection.release();
                        }
                        
                        return result;
    
                    }else errCode = this.db.getLastQueryFailureReason();
                }
            }else errCode = this.db.getLastQueryFailureReason();

            if(!conn || errCode) connection.release();
            if(errCode) throw new WebAuthAPIError(errCode);
            return null;
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async getUserRoles(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getUserRoles"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const user = await this.getUser(userKey, connection);

            let errCode: WebAPI.APIErrors<"Auth"> | null = null;

            if(user) {
                const response = await this.db.performQuery<"Select">("SELECT * from role_assignments NATURAL JOIN roles WHERE userID=?",[user.userID], connection);

                if(response) {
                    const result = [];

                    for (const row of response) {
                        result.push({
                            ID: row["roleID"],
                            name: row["roleName"],
                            displayName: row["displayName"]
                        });
                    }

                    if(!conn) connection.release();
                    return result;
                }else errCode = this.db.getLastQueryFailureReason();
            }

            if(!conn || errCode) connection.release();
            if(errCode) throw new WebAuthAPIError(errCode);
            return null;
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async hasRole(userKey: string | number, roleName: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["hasRole"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const user = await this.getUser(userKey, connection);

            let errCode: WebAPI.APIErrors<"Auth">;

            if(user) {
                let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);

                if(roleDetails) {

                    if(roleDetails.length===1) {
                        const response = await this.db.performQuery<"Select">("SELECT * from role_assignments WHERE roleID=? AND userID=?",[roleDetails[0]["roleID"],user.userID], connection);

                        if(response) {
                            if(!conn) connection.release();
                            return response.length===1;
                        }else errCode = this.db.getLastQueryFailureReason();
                    }else errCode = "InvalidRole";
                }else errCode = this.db.getLastQueryFailureReason();
            }else errCode = "NoUser";

            if(!conn || errCode) connection.release();
            if(errCode) throw new WebAuthAPIError(errCode);
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async assignRole(userKey: string | number, roleName: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["assignRole"]> {
        const connection = await this.db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            let errCode: WebAPI.APIErrors<"Auth">;

            const user = await this.getUser(userKey, connection);

            if(user) {
                let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);

                if(roleDetails) {

                    if(roleDetails.length===1) {
                        const assignmentCheck = await this.db.performQuery<"Select">("SELECT * from role_assignments WHERE roleID=? AND userID=?",[roleDetails[0]["roleID"],user.userID], connection);

                        if(assignmentCheck) {
                            if(assignmentCheck.length===0) {
                                const response = await this.db.performQuery<"Other">("INSERT INTO role_assignments(roleID, userID) VALUES(?,?)",[roleDetails[0]["roleID"],user.userID]);
                                if(response) {
                                    if(response.affectedRows==1) {
                                        if(!conn) {
                                            connection.commit();
                                            connection.release();
                                        }
                                        return;
                                    }else errCode = "DBError";
                                }else errCode = this.db.getLastQueryFailureReason();
                            }else errCode = "RoleAlreadyAssigned";
                        }else errCode = this.db.getLastQueryFailureReason();
                    }else errCode = "InvalidRole";
                }else errCode = this.db.getLastQueryFailureReason();
            }else errCode = "NoUser";

            if(!conn || errCode) connection.release();
            if(errCode) throw new WebAuthAPIError(errCode);
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async unassignRole(userKey: string | number, roleName: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["unassignRole"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const userID = await this.resolveUserKey(userKey, connection);

            if(userID==null) {
                connection.release();
                throw new WebAuthAPIError("NoUser");
            }

            const roleID = await this.getRoleID(roleName, connection);

            if(roleID===null) {
                if(!conn) connection.release();
                throw new WebAuthAPIError("InvalidRole");
            }

            const response = await this.db.performQuery<"Other">("DELETE FROM role_assignments WHERE roleID=? AND userID=?;",[roleID,userID], connection);

            let errCode: WebAPI.APIErrors<"Auth">
            if(response) {
                if(response.affectedRows===1) {
                    if(!conn) connection.release();
                    return;
                }else errCode = "NotAssigned";
            }else errCode = this.db.getLastQueryFailureReason();

            connection.release();
            throw new WebAuthAPIError(errCode);
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async unassignAllRoles(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["unassignAllRoles"]> {
        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            const userID = await this.resolveUserKey(userKey, connection);

            if(userID==null) {
                if(!conn) connection.release();
                return false;
            }

            const response = await this.db.performQuery<"Other">("DELETE FROM role_assignments WHERE userID=?;",[userID], connection);
            if(!response || !conn) connection.release();

            if(response) return true;

            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        }

        throw new WebAuthAPIError("NoConnection");
    }

    //Account actions API

    public async createToken(actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName ,userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["createToken"]> {

        const userID = await this.resolveUserKey(userKey, conn);

        if(userID==null) {
            conn?.release();
            throw new WebAuthAPIError("NoUser");
        }

        const connection = conn ?? await this.db.getConnection();
        if(connection) {
            if(!conn) connection.beginTransaction();

            let response = await this.db.performQuery<"Select">("SELECT accountActionTypeID FROM account_action_types WHERE accountActionName=?",[actionName],connection);
            const actionTypeID = response?response[0]["accountActionTypeID"]:-1;

            let errCode: WebAPI.APIErrors<"Auth">;

            if(actionTypeID!=-1) {
                const tokenCount = await this.getTokensCount(userID,actionName,connection);
            
                if(tokenCount) {
                    if(tokenCount < this.MAX_SLOT_COUNT) {
                        const token = randomBytes(16).toString("hex");
                        const queryStr = `INSERT INTO account_actions(accountActionTokenID, accountActionTypeID, userID, expirationDate) VALUES(?,?,?,?)`;
                        const response = await this.db.performQuery<"Other">(queryStr,[token,actionTypeID,userID, DateTime.now().plus({hours: 24}).toISO()],connection);
                        
                        if(response) {
                            if(response.affectedRows===1)
                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                return token;
                        }else errCode = this.db.getLastQueryFailureReason();
                    }else errCode = "TooMuchTokens";
                }else errCode = "NoUser";
            }else if(response) errCode = "InvalidAction";
            else errCode = this.db.getLastQueryFailureReason();

            connection.release();
            throw new WebAuthAPIError(errCode);
        }
        
        throw new WebAuthAPIError("NoConnection");
    }

    public async getTokenDetails(token: string, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Auth.IWebAuthManager["getTokenDetails"]> {
        const response = await this.db.performQuery<"Select">(`SELECT * FROM account_actions NATURAL JOIN account_action_types WHERE accountActionTokenID=? AND now() < expirationDate;`,[token],conn);

        if(response) {
            if(response.length===1) {
                return {
                        tokenID: token,
                        actionTypeID: response[0]["accountActionTypeID"],
                        actionTypeName: response[0]["accountActionName"],
                        userID: response[0]["userID"],
                        creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                        expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                }
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getTokensCount(userKey: string | number, actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getTokensCount"]> {
        const user = await this.getUser(userKey, conn);

        if(user) {
            const response = await this.db.performQuery<"Select">(`SELECT COUNT(*) as count FROM account_actions NATURAL JOIN account_action_types WHERE userID=? AND accountActionName=? AND now() < expirationDate`,[user.userID,actionName],conn);
            
            if(response) return response[0]["count"];
            
            conn?.release();
            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        }else return null;
    }

    public async dropToken(token: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropToken"]> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM account_actions WHERE accountActionTokenID=?`,[token],conn);

        if(result) {
            if(result.affectedRows===1) return true;
            else return false;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getAllTokens(userID?: number | undefined, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getAllTokens"]> {
        let conditionQuery = userID?`WHERE userID=${this.db.escapeValue(userID.toString())}`:"";

        const query = `SELECT * FROM account_actions NATURAL JOIN account_action_types ${conditionQuery};`;
        const response = await this.db.performQuery<"Select">(query,[],conn);

        if(response) {
            const result = [];

            for (const row of response) {
                result.push({
                    tokenID: row["accountActionTokenID"],
                    actionTypeID: row["acccountActionTypeID"],
                    actionTypeName: row["accountActionName"],
                    userID: row["userID"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    expirationDate: DateTime.fromJSDate(row["expirationDate"])
                });
            }

            return result;
        }

        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async dropAllExpiredTokens(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropAllExpiredTokens"]> {
        const response = await this.db.performQuery(`DELETE FROM account_actions WHERE now() > expirationDate;`,[],conn);    

        if(response===null) {
            conn?.release();
            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        } 
           
    }

    public async getTokenTypes(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getTokenTypes"]> {
        const response = await this.db.performQuery<"Select">(`SELECT accountActionName FROM account_action_types;`,[],conn);

        if(response) {
            const result = [];

            for (const row of response) {
                result.push(row["accountActionName"]);
            }

            return result;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }
    
    //Invites API

    public async generateInvite(email: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["generateInvite"]> {
        const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        if(!emailRegex.test(email)) {
            conn?.release();
            throw new WebAuthAPIError("InvalidEmail");
        }

        const connection = conn ?? await this.db.getConnection();
        if(connection) {
            if(!conn) connection.beginTransaction();

            const userExists = await this.userExists(email, connection);

            let errCode: WebAPI.APIErrors<"Auth">;

            if(!userExists) {
                const tokenDetails = await this.getInviteDetails(email, connection);

                if(tokenDetails==null) {
                    const token = randomBytes(16).toString("hex");


                    const expirationDateStr = DateTime.now().plus({hours: 24}).toISO();

                    const response = await this.db.performQuery<"Other">(`INSERT INTO invites(inviteTokenID, email, expirationDate) VALUES(?,?,?)`,[token,email.toLowerCase(), expirationDateStr],connection);
                        
                    if(response) {
                        if(response.affectedRows===1){
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return token;
                        }else errCode="DBError";
                    }else errCode = this.db.getLastQueryFailureReason();
                }else errCode = "InviteExists";
            }else errCode = "UserExists";

            connection.release();
            throw new WebAuthAPIError(errCode);
        }

        throw new WebAuthAPIError("NoConnection");
    }

    public async getInviteDetails(query: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getInviteDetails"]> {
        const field = query.includes("@")?"email":"inviteTokenID";
        const queryStr = `SELECT * FROM invites WHERE ${field}=? AND now() < expirationDate;`;

        const response = await this.db.performQuery<"Select">(queryStr,[query.toLowerCase()],conn);

        if(response) {
            if(response.length===1) {
                return {
                    token: response[0]["inviteTokenID"],
                    email: response[0]["email"],
                    creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                    expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                }
            }else return null;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async dropInvite(token: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropInvite"]> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM invites WHERE inviteTokenID=?`,[token],conn);

        if(result) {
            if(result.affectedRows===1) return true;
            else return false;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async getAllInvites(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["getAllInvites"]> {
        const query = `SELECT * FROM invites;`;
        const response = await this.db.performQuery<"Select">(query,[],conn);

        if(response) {
            const result = [];

            for (const row of response) {
                result.push({
                    token: row["inviteTokenID"],
                    email: row["email"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    expirationDate: DateTime.fromJSDate(row["expirationDate"])
                });
            }

            return result;
        }
        
        conn?.release();
        throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
    }

    public async dropAllExpiredInvites(conn?: WebAPI.Mysql.IPoolConnection | undefined): ReturnType<WebAPI.Auth.IWebAuthManager["dropAllExpiredInvites"]> {
        const response = await this.db.performQuery(`DELETE FROM invites WHERE now() > expirationDate;`,[],conn);    

        if(response==null) {
            conn?.release();
            throw new WebAuthAPIError(this.db.getLastQueryFailureReason());
        }
    }
}