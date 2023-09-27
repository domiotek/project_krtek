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

    //Session API

    public async tryLogin(email: string, password: string,ipAddress: string, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.SessionAPI.TLoginResult> {
        let result: WebAPI.Auth.SessionAPI.TLoginResult = {
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
            let result: WebAPI.Auth.SessionAPI.TProlongSessionResult = "InvalidSession";
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
        let result: WebAPI.Auth.SessionAPI.TGetSessionDetailsResult = {
            result: "InvalidSession"
        }

        let queryStr = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(lastAccessDate, '%Y-%m-%dT%TZ') as lastAccessDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM auth_sessions WHERE sessionID=? AND now() < expirationDate;`;
        const response = await this.db.performQuery<"Select">(queryStr,[sessionToken],conn);

        if(response) {
            if(response.length===1) {
                result = {
                    result: "Success",
                    data: {
                        sessionID: response[0]["sessionID"],
                        userID: response[0]["userID"],
                        ipAddress: response[0]["ipAddress"],
                        creationDate: DateTime.fromISO(response[0]["creationDate"]),
                        lastAccessDate: DateTime.fromISO(response[0]["lastAccessDate"]),
                        expirationDate: DateTime.fromISO(response[0]["expirationDate"])
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
        let result: WebAPI.Auth.SessionAPI.TGetAllSessionsResult = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            let conditionQuery = userID?`WHERE userID=${connection.escape(userID)}`:"";

            const query = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(lastAccessDate, '%Y-%m-%dT%TZ') as lastAccessDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM auth_sessions ${conditionQuery};`;
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
                        creationDate: DateTime.fromISO(row["creationDate"]),
                        lastAccessDate: DateTime.fromISO(row["lastAccessDate"]),
                        expirationDate: DateTime.fromISO(row["expirationDate"])
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

        let result: WebAPI.Auth.UserAPI.TCreateUserResult = "DBError";
        
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
        let field;
        switch(typeof userKey) {
            case "number": field = "userID"; break;
            case "string": field = "email"; userKey = userKey.toLowerCase(); break;
            default: throw new Error("TypeError: Invalid user key in userExists. Expected either number or a string.");
        }

        const result = await this.db.performQuery<"Select">(`SELECT userID FROM users WHERE ${field}=?;`,[userKey],conn);

        if(result) {
            return result.length===1;
        }else return this.db.getLastQueryFailureReason();
    }

    public async getUser(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.UserAPI.TGetUserResult> {
        let field = "";

        let result: WebAPI.Auth.UserAPI.TGetUserResult = {
            result: "InvalidInput"
        }
        

        switch(typeof userKey) {
            case "number": field = "userID"; break;
            case "string": field = "email"; userKey = userKey.toLowerCase(); break;
            default: return result;
        }

        const values = [userKey];

        const response = await this.db.performQuery<"Select">(`SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(lastAccessDate, '%Y-%m-%dT%TZ') as lastAccessDate, DATE_FORMAT(lastPasswordChangeDate, '%Y-%m-%dT%TZ') as lastPasswordChangeDate FROM users NATURAL JOIN ranks WHERE ${field}=?;`,values,conn);

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
                        creationDate: DateTime.fromISO(response[0]["creationDate"]),
                        lastAccessDate: DateTime.fromISO(response[0]["lastAccessDate"]),
                        lastPasswordChangeDate: DateTime.fromISO(response[0]["lastPasswordChangeDate"])
                    }
                }
            }else result.result = "NoUser";
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async setPassword(userKey: string | number, newPassword: string, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.UserAPI.TSetPasswordResult> {
        let field = "";

        switch(typeof userKey) {
            case "number": field = "userID"; break;
            case "string": field = "email"; userKey = userKey.toLowerCase(); break;
            default: return "InvalidUser";
        }

        if(!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/.test(newPassword)) {
            return "InvalidPassword";
        }

        const hashedPassword = await hash(newPassword,10);
        
        const result = await this.db.performQuery<"Other">(`UPDATE users SET password=?, lastPasswordChangeDate=NOW() WHERE ${field}=?`,[hashedPassword, userKey],conn);

        if(result) {
            if(result.changedRows===1) return true;
            else return "InvalidUser";
        }else return this.db.getLastQueryFailureReason();
    }

    public async dropAccount(): Promise<void> {
        //[TODO]
    }

    public async getAllUsers(conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.UserAPI.TGetAllUsersResult> {
        let result: WebAPI.Auth.UserAPI.TGetAllUsersResult = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {

            const query = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(lastAccessDate, '%Y-%m-%dT%TZ') as lastAccessDate, DATE_FORMAT(lastPasswordChangeDate, '%Y-%m-%dT%TZ') as lastPasswordChangeDate FROM users NATURAL JOIN ranks;`;
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
                        creationDate: DateTime.fromISO(row["creationDate"]),
                        lastAccessDate: DateTime.fromISO(row["lastAccessDate"]),
                        lastPasswordChangeDate: DateTime.fromISO(row["lastPasswordChangeDate"])
                    });
                }
            }else result.result = this.db.getLastQueryFailureReason();

            connection.release();
        }

        return result;
    }

    //Account actions API

    public async createToken(actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName ,userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Auth.AccountsTokenAPI.TCreateTokenResult> {
        let userID: number | undefined;

        switch(typeof userKey) {
            case "number": userID = userKey; break;
            case "string": 
                const user = await this.getUser(userKey);
                if(user.result=="Success") userID = user.data.userID;
            break;
            default: return {result: "InvalidInput"}
        }

        if(userID!=undefined) {
            const connection = conn ?? await this.db.getConnection();
            if(connection) {
                let result: WebAPI.Auth.AccountsTokenAPI.TCreateTokenResult = {
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
        let result: WebAPI.Auth.AccountsTokenAPI.TGetTokenDetailsResult = {
            result: "InvalidToken"
        }

        const response = await this.db.performQuery<"Select">(`SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM account_actions NATURAL JOIN account_action_types WHERE accountActionTokenID=? AND now() < expirationDate;`,[token],conn);

        if(response) {
            if(response.length===1) {
                result = {
                    result: "Success",
                    data: {
                        tokenID: token,
                        actionTypeID: response[0]["accountActionTypeID"],
                        actionTypeName: response[0]["accountActionName"],
                        userID: response[0]["userID"],
                        creationDate: DateTime.fromISO(response[0]["creationDate"]),
                        expirationDate: DateTime.fromISO(response[0]["expirationDate"])
                    }
                }
            }
        }else result.result = this.db.getLastQueryFailureReason();

        return result;
    }

    public async getTokensCount(userKey: string | number, actionName: WebAPI.Auth.AccountsTokenAPI.TAccountActionName, conn?: WebAPI.Mysql.IPoolConnection | undefined): Promise<WebAPI.Auth.AccountsTokenAPI.TGetTokenCountResult> {
        const user = await this.getUser(userKey);
        let result: WebAPI.Auth.AccountsTokenAPI.TGetTokenCountResult = {
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
        let result: WebAPI.Auth.AccountsTokenAPI.TGetAllTokensResult = {
            result: "NoConnection"
        }

        const connection = conn ?? await this.db.getConnection();

        if(connection) {
            let conditionQuery = userID?`WHERE userID=${connection.escape(userID)}`:"";

            const query = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM account_actions NATURAL JOIN account_action_types ${conditionQuery};`;
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
                        creationDate: DateTime.fromISO(row["creationDate"]),
                        expirationDate: DateTime.fromISO(row["expirationDate"])
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
        let result: WebAPI.Auth.AccountsTokenAPI.TGetTokenTypesResult = {
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

        const result: WebAPI.Auth.InviteAPI.TInviteGenResult = {
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
        const result: WebAPI.Auth.InviteAPI.TGetInviteDetailsResult = {
            result: "InvalidToken"
        }

        const field = query.includes("@")?"email":"inviteTokenID";
        const queryStr = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM invites WHERE ${field}=? AND now() < expirationDate;`;

        const response = await this.db.performQuery<"Select">(queryStr,[query.toLowerCase()],conn);

        if(response) {
            if(response.length===1) {
                return {
                    result: "Success",
                    data: {
                        token: response[0]["inviteTokenID"],
                        email: response[0]["email"],
                        creationDate: DateTime.fromISO(response[0]["creationDate"]),
                        expirationDate: DateTime.fromISO(response[0]["expirationDate"])
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
        let result: WebAPI.Auth.InviteAPI.TGetAllTokensResult = {
            result: "NoConnection"
        }

        const query = `SELECT *, DATE_FORMAT(creationDate, '%Y-%m-%dT%TZ') as creationDate, DATE_FORMAT(expirationDate, '%Y-%m-%dT%TZ') as expirationDate FROM invites;`;
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
                    creationDate: DateTime.fromISO(row["creationDate"]),
                    expirationDate: DateTime.fromISO(row["expirationDate"])
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