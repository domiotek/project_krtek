
namespace CLIUserAuthentication {
    interface IAuthenticationManager {
        /**
         * Whether authentication is enabled or not.
         */
        readonly isActive: boolean;

        /**
         * Tries to authenticate user with given authKey.
         * IP is required, because some users might be restricted
         * to connect only from the specific IP address.
         */
        authenticateUser(authKey: string, ip: string): IAuthenticationDetails | null;

        /**
         * Deauthenticates user.
         */
        deauthenticateUser(token: string);

        /**
         * Checks whether user can perform specified action. To be allowed, 
         * user must be either added to the list of the allowed users or the list
         * must be empty.
         */
        isActionAllowedFor(token: string, action: ActionNames): boolean

        /**
         * Returns all actions, that the user represented by the authkey can perform.
         */
        getClientAllowedActions(token: string): Array<string>

        /**
         * Returns users, that are currently connected.
         */
        getActiveUsers(): Array<string>

        /**
         * Checks whether given action is available for everyone or only for specific users.
         */
        isActionAvailableForEveryone(action: ActionNames): boolean
    
    }

    interface IAuthKeyDetails {
        userName: string
        enforcedIPAddress: string | false
    }

    interface IAuthenticationDetails extends IAuthKeyDetails {
        token: string
    }

    type Actions = {
        [Property in ActionNames]: Array<string>
    }

    /**
     * This type if part of a mechanism, that will enforce all actions to be initialized inside
     * environment.ts. Thanks to that mechanic, there is no chance for situation, where newly added
     * action wasn't fully integrated with the Authentication system.
     */
    interface IAuthSecuringEnvironmentConfig extends IEnvironmentConfig {
        auth: IAuthObjectWithOptionalProps;
    }
    type IAuthObjectWithOptionalProps = Optional<Concrete<IEnvironmentConfig>["auth"]>;

}

