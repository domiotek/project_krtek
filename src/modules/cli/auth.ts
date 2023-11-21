import { randomInt } from "crypto";
import Output from "../output.js";

export default class AuthenticationManager implements CLIAPI.UserAuthentication.IAuthenticationManager {
    /**
     * AuthKeys and details(user data) assigned to them.
     */
    readonly #_authKeys: Map<string,CLIAPI.UserAuthentication.IAuthKeyDetails>;

    /**
     * ActionsNames with the Arraries of users(username) that are allowed to perform said action.
     */
    readonly #_actions: Map<string, Array<string>>;

    /**
     * Auth tokens(alive in the current session) and the corresponding authKeys.
     * Tokens are introduced to minimize authKeys exposure - these are available only within this class.
     * Keys are even removed from environment config after the AuthenticationManager initializes.
     */
    readonly #_activeAuthKeys: Map<string, string>;
    
    /**
     * Whether authentication is enabled during the session.
     */
    private readonly _isActive: boolean;

    /**
     * Authentication Logs notebook.
     */
    readonly #_logs: ILogsCollection | null;

    public get isActive(): boolean {
        return this._isActive;
    }

    constructor(auth: IEnvironmentConfig["auth"]) {
        this.#_authKeys = new Map();
        this.#_actions = new Map();
        this.#_activeAuthKeys = new Map();
        this.#_logs = global.logs.access("auth");

        this.#_logs?.write(`------------- Authentication Manager initialization -------------`);

        if(auth&&auth.useAuth) {
            this._isActive = true;

            for (const key of Object.keys(auth.authKeys)) {
                if(key.length<32||key.search(/[`~!@#$%^&*()_|+\-=?;:'",.<>\d\{\}\[\]\\\/]/gi)==-1) {
                    Output.category("debug").print("warning",`[Client Auth] Key for {${auth.authKeys[key].userName}} is not secure enough. Authentication keys should be at least 32 characters long and include numbers, special characters and letters, both in lowercase and uppercase.`);
                    this.#_logs?.write(`[WARN] Insecure key for {${auth.authKeys[key].userName}}.`);
                }
                this.#_authKeys.set(key,auth.authKeys[key]);
            }

            for (const action of Object.keys(auth.actions)) 
                this.#_actions.set(action, auth.actions[action as CLIAPI.UserAuthentication.ActionNames]);

            if(this.#_authKeys.size==0) {
                Output.category("debug").print("warning","[Client Auth] No Auth keys defined.");
                this.#_logs?.write(`[WARN] No Auth keys defined.`);
            }
            setImmediate(()=>{
                if(!global.app.isHTTPS&&!global.app.env.flags.disableHTTPAuthWarning)
                Output.category("debug").print("warning",`[Client Auth] Server doesn't use HTTPS protocol. It's not recommended to utilize authentication on insecure server.`);
                this.#_logs?.write(`[WARN] Server doesn't use HTTPS protocol.`);
            });
        }else this._isActive = false;
    }

    authenticateUser(authKey: string, ip: string): CLIAPI.UserAuthentication.IAuthenticationDetails | null {
        if(!this._isActive) return null;

        const data = this.#_authKeys.get(authKey);
        if(Array.from(this.#_activeAuthKeys.values()).includes(authKey)) {
            Output.category("debug").print("notice",`[Client Auth] Cannot complete authentication request. ${data?.userName} is already logged in.`);
            this.#_logs?.write(`[WARN] {${data?.userName}} requested to authenticate for the second time.`);
            return null;
        }
        if(data?.enforcedIPAddress&&ip!=data.enforcedIPAddress) {
            Output.category("debug").print("notice",`[Client Auth] Cannot complete authentication request. ${data?.userName} is trying to login from the disallowed IP address.`);
            this.#_logs?.write(`[WARN] {${data?.userName}} requested to authenticate from {${ip}} IP address, but is enforced to login from {${data.enforcedIPAddress}} one.`);
            return null;
        }
        this.#_logs?.write(`${data?.userName} authenticated from ${ip}.`);
        const token = randomInt(100000000000000,281474976710655).toString();
        this.#_activeAuthKeys.set(token,authKey);

        return data?{token, userName: data.userName, enforcedIPAddress: data.enforcedIPAddress}:null;
    }

    deauthenticateUser(token: string) {
        if(this.#_activeAuthKeys.has(token)) {
            this.#_logs?.write(`{${this.#_authKeys.get(this.#_activeAuthKeys.get(token) as string)?.userName}} disconnected.`);
            this.#_activeAuthKeys.delete(token);

        }
    }

    isActionAllowedFor(token: string, action: CLIAPI.UserAuthentication.ActionNames): boolean {
        if(this.isActive) {
            const actionData = this.#_actions.get(action) ?? [];
            const userData = this.#_authKeys.get(this.#_activeAuthKeys.get(token)??"");
            const response = actionData?.includes(userData?.userName ?? "") || actionData.length==0;
            this.#_logs?.write(`{${userData?.userName ?? "Anonymous"}} requested access to the {${action}} action. Request was ${response?"successfull":"rejected"}.`);
            return response;
        }else return true;
    }

    getClientAllowedActions(token: string): string[] {
        const resultArray = [];
        const userData = this.#_authKeys.get(this.#_activeAuthKeys.get(token)??"");
        for (const [action, users] of this.#_actions.entries()) {
            if(users.includes(userData?.userName ?? "")||users.length==0) 
                resultArray.push(action);
        }
        return resultArray;
    }

    isActionAvailableForEveryone(action: CLIAPI.UserAuthentication.ActionNames): boolean {
        return this.#_actions.get(action)?.length===0;
    }

    getActiveUsers(): string[] {
        const resultArray = [];
        for (const key of this.#_activeAuthKeys.values()) {
            resultArray.push((this.#_authKeys.get(key) as CLIAPI.UserAuthentication.IAuthKeyDetails).userName);
        }
        return resultArray;
    }
}