import { MysqlError } from "mysql";
import { randomBytes} from "crypto";
import { hash, compare} from "bcrypt";
import { DateTime } from "luxon";



export class WebAuthManager implements WebAPI.Auth.IWebAuthManager {
    private readonly db: WebAPI.Mysql.IMysqlController;

    /**
     * Manager that has all necessary tools to interact with authentication database.
     * Is capable of managing users, their sessions, actions on those accounts as well as registration invites.
     * @param mysqlConn MySQL connection controller
     */
    constructor(mysqlConn: WebAPI.Mysql.IMysqlController) {
        this.db = mysqlConn;
    }

    /**
     * Resolves userKey into userID.
     * @param conn existing connection. Can be passed to avoid creating another connection just for that.
     * @returns userID or -1 if user is not found.
     */
    private async _resolveUserKey(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<number> {
        switch(typeof userKey) {
            case "string": 
                const userData = await this.getUser(userKey,conn);
                if(userData.result=="Success") return userData.data.userID;
                else return -1;
            case "number": return userKey;
            default: throw new TypeError("Invalid user key. Expected either number or a string.");
        }
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

    public async tryLogin(email: string, password: string,ipAddress: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.SessionAPI.TLoginResult> {
        let result: Awaited<ReturnType<WebAuthManager["tryLogin"]>> = {
            result:"NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();
        
        if(connection) {
            connection.beginTransaction();
            const user = await this.getUser(email, connection);

            if(user.result=="Success"&&(await compare(password, user.data.password))) {

                const newSessionID = randomBytes(16).toString("hex");

                let queryStr = `INSERT INTO auth_sessions(sessionID, userID, ipAddress, expirationDate) VALUES(?, ?, ?,?);`;
                let response = await this.db.performQuery<"Other">(queryStr,[newSessionID, user.data.userID, ipAddress, DateTime.now().plus({days: 7}).toISO()]);
                if(response) {
                    if(response.affectedRows===1) {
                        queryStr = `UPDATE users SET lastAccessDate=NOW() WHERE userID=?`;
                        response = await this.db.performQuery<"Other">(queryStr,[user.data.userID],connection);
                        if(response) {
                            result = {
                                result: "Success",
                                data: newSessionID
                            }
                            connection.commit();
                            connection.release();
                            return result;
                        }else result.result = this.db.getLastQueryFailureReason();
                    }else result.result = "DBError";
                }else result.result = this.db.getLastQueryFailureReason();
            }else result.result = "InvalidCredentials";

            connection.rollback();
            connection.release();
        }

        return result;
    }

    public async isSessionValid(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.SessionAPI.TGetSessionValidResult> {
        const result = await this.db.performQuery<"Select">(`SELECT userID FROM auth_sessions WHERE sessionID=? AND now() < expirationDate`,[sessionToken], conn);

        if(result) {
            return result.length===1;
        }else return this.db.getLastQueryFailureReason();
    }

    public async prolongSession(sessionToken: string, ipAddress: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.SessionAPI.TProlongSessionResult> {

        const connection = conn ?? await this.db.getConnection();
        if(connection) {
            let result: Awaited<ReturnType<WebAuthManager["prolongSession"]>> = "InvalidSession";
            connection.beginTransaction();

            const session = await this.getSessionDetails(sessionToken);

            if(session.result=="Success") {
                let queryStr = `UPDATE auth_sessions SET lastAccessDate=current_timestamp(), ipAddress=? WHERE sessionID=? AND NOW() < expirationDate;`;
                let response = await this.db.performQuery<"Other">(queryStr,[ipAddress,sessionToken],conn);
    
                if(response) {
                    if(response.affectedRows===1) {
                        queryStr = `UPDATE users SET lastAccessDate=NOW() WHERE userID=?`;     

                        response = await this.db.performQuery<"Other">(queryStr,[session.data.userID]);

                        if(response) {
                            connection.commit();
                            connection.release();
                            return true;
                        }else result = this.db.getLastQueryFailureReason();

                    }else result = false;
                }else result = this.db.getLastQueryFailureReason();
            }else result = "InvalidSession";

            connection.rollback();
            connection.release();
            return result;
        }return "NoConnection";
    }

    public async getSessionDetails(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.SessionAPI.TGetSessionDetailsResult> {
        let result: Awaited<ReturnType<WebAuthManager["getSessionDetails"]>> = {
            result: "InvalidSession"
        }

        let queryStr = `SELECT * FROM auth_sessions WHERE sessionID=? AND now() < expirationDate;`;
        const response = await this.db.performQuery<"Select">(queryStr,[sessionToken],conn);

        if(response) {
            if(response.length===1) {
                result = {
                    result: "Success",
                    data: {
                        sessionID: response[0]["sessionID"],
                        userID: response[0]["userID"],
                        ipAddress: response[0]["ipAddress"],
                        creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                        lastAccessDate: DateTime.fromJSDate(response[0]["lastAccessDate"]),
                        expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                    }
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async dropSession(sessionToken: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.SessionAPI.TDropSessionResult> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM auth_sessions WHERE sessionID=?`,[sessionToken],conn);

        if(result) {
            if(result.affectedRows===1) {
                return true;
            }else return "InvalidSession";
        }else return this.db.getLastQueryFailureReason();
    }

    public async getAllSessions(userID: number, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.SessionAPI.TGetAllSessionsResult> {
        let result: Awaited<ReturnType<WebAuthManager["getAllSessions"]>> = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            let conditionQuery = userID?`WHERE userID=${connection.escape(userID)}`:"";

            const query = `SELECT * FROM auth_sessions ${conditionQuery};`;
            const response = await this.db.performQuery<"Select">(query,[],connection);

            if(response) {
                result = {
                    result: "Success",
                    data: []
                }

                for (const row of response) {
                    result.data.push({
                        sessionID: row["sessionID"],
                        userID: row["userID"],
                        ipAddress: row["ipAddress"],
                        creationDate: DateTime.fromJSDate(row["creationDate"]),
                        lastAccessDate: DateTime.fromJSDate(row["lastAccessDate"]),
                        expirationDate: DateTime.fromJSDate(row["expirationDate"])
                    });
                }
            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }

        return result;
    }

    public async dropAllExpiredSessions(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI._.TGenericActionResult> {
        const response = await this.db.performQuery(`DELETE FROM auth_sessions WHERE now() > expirationDate;`,[],conn);    

        if(response) {
            return true;
        }return this.db.getLastQueryFailureReason();
    }

    //User API

    public async createUser(userData: WebAPI.Auth.UserAPI.IUserRegistrationData, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.UserAPI.TCreateUserResult> {
        const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        const connection = conn ?? await this.db.getConnection();

        let result: Awaited<ReturnType<WebAuthManager["createUser"]>> = "DBError";
        
        if(connection) {
            if(emailRegex.test(userData.email)) {
                connection.beginTransaction();
                const user = await this.getUser(userData.email,connection);

                if(user.result!="Success") {
                    const queryStr = `INSERT INTO users(email, password, name, surname, gender, roleID) VALUES(?,"",?,?,?,1);`;

                    if(!["m","f","o"].includes(userData.gender)) userData.gender = 'o';

                    const response = await this.db.performQuery<"Other">(queryStr, [userData.email.toLowerCase(), userData.name, userData.surname, userData.gender], connection);

                    if(response) {
                        if(response.affectedRows===1){

                            const passwordSetResult = await this.setPassword(userData.email,userData.password,connection);
                            if(passwordSetResult===true) {
                                
                                connection.commit();
                                connection.release();

                                return true;
                            }else result = "InvalidPassword";
                        }
                    }else result = this.db.getLastQueryFailureReason();
                }else result = "UserExists";

                connection.rollback();
            }else result = "InvalidEmail";
            
            connection.release();
        }else result = "NoConnection";

        return result;
    }

    public async userExists(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.UserAPI.TUserExistsResult> {

        const {field, userKey: safeUserKey} = this._translateUserKey(userKey);

        const result = await this.db.performQuery<"Select">(`SELECT userID FROM users WHERE ${field}=?;`,[safeUserKey],conn);

        if(result) {
            return result.length===1;
        }else return this.db.getLastQueryFailureReason();
    }

    public async getUser(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.UserAPI.TGetUserResult> {

        let result: Awaited<ReturnType<WebAuthManager["getUser"]>> = {
            result: "NoUser"
        }
        
        const {field, userKey: safeUserKey} = this._translateUserKey(userKey);

        const response = await this.db.performQuery<"Select">(`SELECT * FROM users NATURAL JOIN ranks WHERE ${field}=?;`,[safeUserKey],conn);

        if(response) {
            if(response.length===1) {
                result = {
                    result: "Success",
                    data: {
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
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async setPassword(userKey: string | number, newPassword: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.UserAPI.TSetPasswordResult> {

        const {field, userKey: safeUserKey} = this._translateUserKey(userKey);

        if(!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/.test(newPassword)) {
            return "InvalidPassword";
        }

        const hashedPassword = await hash(newPassword,10);
        
        const result = await this.db.performQuery<"Other">(`UPDATE users SET password=?, lastPasswordChangeDate=NOW() WHERE ${field}=?`,[hashedPassword, safeUserKey],conn);

        if(result) {
            if(result.changedRows===1) return true;
            else return "NoUser";
        }else return this.db.getLastQueryFailureReason();
    }

    public async dropAccount(): Promise<void> {
        //[TODO]
    }

    public async getAllUsers(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.UserAPI.TGetAllUsersResult> {
        let result: Awaited<ReturnType<WebAuthManager["getAllUsers"]>> = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {

            const query = `SELECT * FROM users NATURAL JOIN ranks;`;
            const response = await this.db.performQuery<"Select">(query,[],connection);

            if(response) {
                result = {
                    result: "Success",
                    data: []
                }

                for (const row of response) {
                    result.data.push({
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
                        lastPasswordChangeDate: DateTime.fromJSDate(row["lastPasswordChangeDate"])
                    });
                }
            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }

        return result;
    }

    //Role API

    public async getRoleID(roleName: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.RoleAPI.TGetRoleIDResult> {
        let result: Awaited<ReturnType<WebAuthManager["getRoleID"]>> = {
            result:"InvalidRole"
        }

        const response = await this.db.performQuery<"Select">("SELECT roleID FROM roles where roleName=?",[roleName],conn);

        if(response) {
            if(response.length==1) {
                result = {
                    result: "Success",
                    data: response[0]["roleID"]
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async getDefinedRoles(): Promise<WebAPI.Auth.RoleAPI.TGetDefinedRolesResult> {
        let result: Awaited<ReturnType<WebAuthManager["getDefinedRoles"]>> = {
            result: "NoConnection"
        }

        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const response = await this.db.performQuery<"Select">("SELECT * from roles",[], connection);

            if(response) {
                result = {
                    result: "Success",
                    data: []
                }

                for (const row of response) {
                    result.data.push({
                        ID: row["roleID"],
                        name: row["roleName"],
                        displayName: row["displayName"]
                    })
                }

                connection.commit();

            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }


        return result;
    }

    public async listUsersWithRole(roleName: string): Promise<WebAPI.Auth.RoleAPI.TListRoleUsersResult> {
        let result: Awaited<ReturnType<WebAuthManager["listUsersWithRole"]>>= {
            result: "NoConnection"
        }

        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);
            if(roleDetails) {

                if(roleDetails.length===1) {
                    const response = await this.db.performQuery<"Select">("SELECT * from role_assignments NATURAL JOIN users WHERE roleID=?",[roleDetails[0]["roleID"]], connection);

                    if(response) {
                        result = {
                            result: "Success",
                            data: []
                        }
    
                        for (const row of response) {
                            result.data.push({
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
                                lastPasswordChangeDate: DateTime.fromJSDate(row["lastPasswordChangeDate"])
                            })
                        }
    
                        connection.commit();
    
                    }else result.result = this.db.getLastQueryFailureReason();

                }else result.result = "InvalidRole"
            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }


        return result;
    }

    public async getUserRoles(userKey: string | number): Promise<WebAPI.Auth.RoleAPI.TGetRolesResult> {
        let result: Awaited<ReturnType<WebAuthManager["getUserRoles"]>> = {
            result: "NoConnection"
        }

        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const user = await global.app.webAuthManager.getUser(userKey);

            if(user.result=="Success") {
                const response = await this.db.performQuery<"Select">("SELECT * from role_assignments NATURAL JOIN roles WHERE userID=?",[user.data.userID], connection);

                if(response) {
                    result = {
                        result: "Success",
                        data: []
                    }

                    for (const row of response) {
                        result.data.push({
                            ID: row["roleID"],
                            name: row["roleName"],
                            displayName: row["displayName"]
                        })
                    }

                    connection.commit();

                }else result.result = this.db.getLastQueryFailureReason();
            }else result.result = user.result;

            connection.release();
        }


        return result;
    }

    public async hasRole(userKey: string | number, roleName: any): Promise<WebAPI.Auth.RoleAPI.THasRoleResult> {
        let result: Awaited<ReturnType<WebAuthManager["hasRole"]>> = "NoConnection";

        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const user = await global.app.webAuthManager.getUser(userKey);

            if(user.result=="Success") {
                let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);

                if(roleDetails) {

                    if(roleDetails.length===1) {
                        const response = await this.db.performQuery<"Select">("SELECT * from role_assignments WHERE roleID=? AND userID=?",[roleDetails[0]["roleID"],user.data.userID], connection);

                        if(response) {
                            result = response.length===1;
                        }else result = this.db.getLastQueryFailureReason();
                    }else result = "InvalidRole";
                }else result = this.db.getLastQueryFailureReason();
            }else result = user.result;

            connection.release();
        }


        return result;
    }

    public async assignRole(userKey: string | number, roleName: string): Promise<WebAPI.Auth.RoleAPI.TAssignRoleResult> {
        let result: Awaited<ReturnType<WebAuthManager["assignRole"]>> = "NoConnection";

        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const user = await global.app.webAuthManager.getUser(userKey);

            if(user.result=="Success") {
                let roleDetails = await this.db.performQuery<"Select">("SELECT roleID FROM roles WHERE roleName=?",[roleName], connection);

                if(roleDetails) {

                    if(roleDetails.length===1) {
                        const assignmentCheck = await this.db.performQuery<"Select">("SELECT * from role_assignments WHERE roleID=? AND userID=?",[roleDetails[0]["roleID"],user.data.userID], connection);

                        if(assignmentCheck) {
                            if(assignmentCheck.length===0) {
                                const response = await this.db.performQuery<"Other">("INSERT INTO role_assignments(roleID, userID) VALUES(?,?)",[roleDetails[0]["roleID"],user.data.userID]);
                                if(response) {
                                    if(response.affectedRows==1) return true;
                                    else return "DBError";
                                }else result = this.db.getLastQueryFailureReason();
                            }else result = "AlreadyAssigned";
                        }else result = this.db.getLastQueryFailureReason();
                    }else result = "InvalidRole";
                }else result = this.db.getLastQueryFailureReason();
            }else result = user.result;

            connection.release();
        }


        return result;
    }

    public async unassignRole(userKey: string | number, roleName: string): Promise<WebAPI.Auth.RoleAPI.TUnassignRoleResult> {
        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const userID = await this._resolveUserKey(userKey, connection);

            if(userID==-1) {
                connection.release();
                return "NoUser";
            }

            const roleIDResult = await this.getRoleID(roleName, connection);

            let roleID;

            if(roleIDResult.result=="Success") 
                roleID = roleIDResult.data;
            else {
                connection.release();
                return roleIDResult.result;
            }


            let result: Awaited<ReturnType<WebAuthManager["unassignRole"]>>
            const response = await this.db.performQuery<"Other">("DELETE FROM role_assignments WHERE roleID=? AND userID=?;",[roleID,userID], connection);

            if(response) {
                if(response.affectedRows===1) result = true;
                else result = "NotAssigned";
            }else result = this.db.getLastQueryFailureReason();

            connection.release();
            return result;
        }else return "NoConnection";
    }

    public async unassignAllRoles(userKey: string | number): Promise<WebAPI.Auth.RoleAPI.TUnassignAllRolesResult> {
        const connection = await this.db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const userID = await this._resolveUserKey(userKey, connection);

            if(userID==-1) {
                connection.release();
                return "NoUser";
            }

            let result: Awaited<ReturnType<WebAuthManager["unassignAllRoles"]>>
            const response = await this.db.performQuery<"Other">("DELETE FROM role_assignments WHERE userID=?;",[userID], connection);

            if(response) result = true;
            else result = this.db.getLastQueryFailureReason();

            connection.release();
            return result;
        }else return "NoConnection";
    }

    //Account actions API

    public async createToken(actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName ,userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.AccountsTokenAPI.TCreateTokenResult> {

        const userID = await this._resolveUserKey(userKey);

        if(userID!=-1) {
            const connection = conn ?? await this.db.getConnection();
            if(connection) {
                let result: Awaited<ReturnType<WebAuthManager["createToken"]>> = {
                    result: "DBError"
                }

                connection.beginTransaction();

                let response = await this.db.performQuery<"Select">("SELECT accountActionTypeID FROM account_action_types WHERE accountActionName=?",[actionName],connection);
                const actionTypeID = response?response[0]["accountActionTypeID"]:-1;

                if(actionTypeID!=-1) {
                    const tokenCount = await this.getTokensCount(userID,actionName,connection);
                
                    if(tokenCount.result=="Success") {
                        if(tokenCount.data < 7) {
                            const token = randomBytes(16).toString("hex");
                            const queryStr = `INSERT INTO account_actions(accountActionTokenID, accountActionTypeID, userID, expirationDate) VALUES(?,?,?,?)`;
                            const response = await this.db.performQuery<"Other">(queryStr,[token,actionTypeID,userID, DateTime.now().plus({hours: 24}).toISO()],connection);
                            
                            if(response) {
                                if(response.affectedRows===1)
                                    result = {result: "Success", data: token}
                            }else result.result = this.db.getLastQueryFailureReason();
                        }else result.result = "TooMuchTokens";
                    }else result.result = tokenCount.result;
                }else if(response) result.result = "InvalidAction";
                else result.result = this.db.getLastQueryFailureReason();

                connection.commit();
                connection.release();
                return result;
            }else return {result: "NoConnection"};
        }else return {result: "NoUser"};
    }

    public async getTokenDetails(token: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.AccountsTokenAPI.TGetTokenDetailsResult> {
        let result: Awaited<ReturnType<WebAuthManager["getTokenDetails"]>> = {
            result: "InvalidToken"
        }

        const response = await this.db.performQuery<"Select">(`SELECT * FROM account_actions NATURAL JOIN account_action_types WHERE accountActionTokenID=? AND now() < expirationDate;`,[token],conn);

        if(response) {
            if(response.length===1) {
                result = {
                    result: "Success",
                    data: {
                        tokenID: token,
                        actionTypeID: response[0]["accountActionTypeID"],
                        actionTypeName: response[0]["accountActionName"],
                        userID: response[0]["userID"],
                        creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                        expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                    }
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async getTokensCount(userKey: string | number, actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.AccountsTokenAPI.TGetTokenCountResult> {
        const user = await this.getUser(userKey);
        let result: Awaited<ReturnType<WebAuthManager["getTokensCount"]>> = {
            result: "NoUser"
        }

        if(user.result=="Success") {
            const response = await this.db.performQuery<"Select">(`SELECT COUNT(*) as count FROM account_actions NATURAL JOIN account_action_types WHERE userID=? AND accountActionName=? AND now() < expirationDate`,[user.data.userID,actionName],conn);
            
            if(response) {
                result = {
                    result: "Success",
                    data: response[0]["count"]
                }
            }else result.result = this.db.getLastQueryFailureReason();
        }

        return result;
    }

    public async dropToken(token: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.AccountsTokenAPI.TDropTokenResult> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM account_actions WHERE accountActionTokenID=?`,[token],conn);

        if(result) {
            if(result.affectedRows===1) return true;
            else return "InvalidToken";
        }else return this.db.getLastQueryFailureReason();
    }

    public async getAllTokens(userID?: number | undefined, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.AccountsTokenAPI.TGetAllTokensResult> {
        let result: Awaited<ReturnType<WebAuthManager["getAllTokens"]>> = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            let conditionQuery = userID?`WHERE userID=${connection.escape(userID)}`:"";

            const query = `SELECT * FROM account_actions NATURAL JOIN account_action_types ${conditionQuery};`;
            const response = await this.db.performQuery<"Select">(query,[],connection);

            if(response) {
                result = {
                    result: "Success",
                    data: []
                }

                for (const row of response) {
                    result.data.push({
                        tokenID: row["accountActionTokenID"],
                        actionTypeID: row["acccountActionTypeID"],
                        actionTypeName: row["accountActionName"],
                        userID: row["userID"],
                        creationDate: DateTime.fromJSDate(row["creationDate"]),
                        expirationDate: DateTime.fromJSDate(row["expirationDate"])
                    });
                }
            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }

        return result;
    }

    public async dropAllExpiredTokens(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI._.TGenericActionResult> {
        const response = await this.db.performQuery(`DELETE FROM account_actions WHERE now() > expirationDate;`,[],conn);    

        if(response) {
            return true;
        }return this.db.getLastQueryFailureReason();
    }

    public async getTokenTypes(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.AccountsTokenAPI.TGetTokenTypesResult> {
        let result: Awaited<ReturnType<WebAuthManager["getTokenTypes"]>> = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            const response = await this.db.performQuery<"Select">(`SELECT accountActionName FROM account_action_types;`,[],connection);

            if(response) {
                result = {
                    result: "Success",
                    data: []
                }

                for (const row of response) {
                    result.data.push(row["accountActionName"]);
                }

            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }

        return result;
    }
    
    //Invites API

    public async generateInvite(email: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.InviteAPI.TInviteGenResult> {
        const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        const connection = conn ?? await this.db.getConnection();

        const result: Awaited<ReturnType<WebAuthManager["generateInvite"]>> = {
            result: "NoConnection"
        }

        if(emailRegex.test(email)) {
            if(connection) {
                connection.beginTransaction();
    
                const userExists = await this.userExists(email, conn);
    
                if(!userExists) {
                    const tokenDetails = await this.getInviteDetails(email, conn);
    
                    if(tokenDetails.result=="InvalidToken") {
                        const token = randomBytes(16).toString("hex");
    
    
                        const expirationDateStr = DateTime.now().plus({hours: 24}).toISO();
    
                        const response = await this.db.performQuery<"Other">(`INSERT INTO invites(inviteTokenID, email, expirationDate) VALUES(?,?,?)`,[token,email.toLowerCase(), expirationDateStr],conn);
                            
                        if(response) {
                            if(response.affectedRows===1){
                                connection.commit();
                                connection.release();
                                return {result: "Success", data: token};
                            }else result.result="DBError";
                        }else result.result = this.db.getLastQueryFailureReason();
                    }else {
                        if(tokenDetails.result=="Success") result.result="InviteExists";
                        else result.result=tokenDetails.result;
                    }
                }else result.result = "AccountExists";
    
                connection.rollback();
                connection.release();
            }
        }else result.result = "InvalidEmail";
        

        return result;
    }

    public async getInviteDetails(query: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.InviteAPI.TGetInviteDetailsResult> {
        const result: Awaited<ReturnType<WebAuthManager["getInviteDetails"]>> = {
            result: "InvalidToken"
        }

        const field = query.includes("@")?"email":"inviteTokenID";
        const queryStr = `SELECT * FROM invites WHERE ${field}=? AND now() < expirationDate;`;

        const response = await this.db.performQuery<"Select">(queryStr,[query.toLowerCase()],conn);

        if(response) {
            if(response.length===1) {
                return {
                    result: "Success",
                    data: {
                        token: response[0]["inviteTokenID"],
                        email: response[0]["email"],
                        creationDate: DateTime.fromJSDate(response[0]["creationDate"]),
                        expirationDate: DateTime.fromJSDate(response[0]["expirationDate"])
                    }
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async dropInvite(token: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.InviteAPI.TDropInviteResult> {
        const result = await this.db.performQuery<"Other">(`DELETE FROM invites WHERE inviteTokenID=?`,[token],conn);

        if(result) {
            if(result.affectedRows===1) return true;
            else return "InvalidToken";
        }else return this.db.getLastQueryFailureReason();
    }

    public async getAllInvites(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.InviteAPI.TGetAllTokensResult> {
        let result: Awaited<ReturnType<WebAuthManager["getAllInvites"]>> = {
            result: "NoConnection"
        }

        const query = `SELECT * FROM invites;`;
        const response = await this.db.performQuery<"Select">(query,[],conn);

        if(response) {
            result = {
                result: "Success",
                data: []
            }

            for (const row of response) {
                result.data.push({
                    token: row["inviteTokenID"],
                    email: row["email"],
                    creationDate: DateTime.fromJSDate(row["creationDate"]),
                    expirationDate: DateTime.fromJSDate(row["expirationDate"])
                });
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async dropAllExpiredInvites(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI._.TGenericActionResult> {
        const response = await this.db.performQuery(`DELETE FROM invites WHERE now() > expirationDate;`,[],conn);    

        if(response) {
            return true;
        }return this.db.getLastQueryFailureReason();
    }
}