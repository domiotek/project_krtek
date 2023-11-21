
/**
 * Environment config. Unchangable after it was 
 */
interface IEnvironmentConfig {

    /**
     * Environment, server was run in.
     */
    environmentName: string

    server: {
        /**
         * Used for identification purpouses on the CLI side.
         */
        name: string

        /**
         * Whether server is used in local network or is available on global internet. Cosmetic.
         */
        type: "Local" | "Public"

        /**
         * How to resolve address used for server listening. 
         * When 'address' is selected, you must also specify 'address' config field with the IP address to use.
         * When 'interface' is selected, you must also specify 'interfaceName' config field with the interface name to use.
         */
        addressMode: "address" | "interface"

        /**
         * Used when addressMode is set to 'address'. Static IP address, which will be used for listening.
         * When '0.0.0.0' is provided, server will listen on all available IPv4 addresses.
         */
        address: string | undefined

        /**
         * Used when addressMode is set to 'interface'. Name of the server's network interface, which will be used for listening.
         */
        interfaceName: string

        /**
         * Port to listen on. Can be provided as specific number or 'auto' value, which means that server will listen on port provided by PORT env variable.
         * You would like to use 'auto' on services deployed on external server, since they provide port to listen on in such way.
         */
        port: number | "auto"

        /**
         * Allows for switching to the HTTPS protocol. If provided data turns to be invalid, app will fallback to the http server.
         * Properties shown in this object are the properties, that required for HTTPS to work. There is a lot of other options that
         * can be tweaked. For details see import("https").ServerOptions
         */
        https?: {
            key: string
            cert: string
            passphrase: string
        }

        /**
         * URL of server. Used for links pointing to this server or resources on it. Should look something like this: http://example.com.
         */
        url: string
    }
    
    /**
     * Details for the mysql database connection
     */
    mysql: {
        connectionLimit: number
        address: string
        port: number
        user: string
        password: string
        database: string
    }

    /**
     * Flags used for development, debug and experimental features.
     */
    flags: {
        [name: string]: boolean
        enableStaticCommandVerification: boolean
        disableHTTPAuthWarning: boolean
        allowNoMysqlRuns: boolean
        suppressEmailSending: boolean
        disablePortalTokenChecking: boolean
        printMySQLQueries: boolean
    }

    /**
     * Decide which debug info to print on screen.
     */
    outputChannels: {
        [Property in DebugOutputChannel]: boolean
    }
    
    /**
     * Decide which internal messages to log.
     */
    logsCollections: {
        [Property in LogsCollectionName]: ILogsCollectionConfig
    }

    /**
     * Which services should be enabled on startup. Services can be later enabled or disabled during runtime via command.
     */
    subscriptionServices: {
        [index: string]: boolean | undefined
        outputForwarder: boolean
    }

    /**
     * How long to wait until client should be kicked because of inactivity.
     */
    clientInactivityTimeout: number

    /**
     * Whether server's output supports colors.
     */
    supportsColors: boolean

    /**
     * Whether to allow debugging features or not. If disabled, debug command will be unavailable and certain messages may not appear.
     */
    debuggingEnabled: boolean

    /**
     * Server's timezone. Usefull, when server is deployed in foreign country, yet you serve clients from your homeland.
     */
    timezone: string

    auth?: {
        useAuth: boolean
        /**
         * Pairs of authKey - userData
         */
        authKeys: {[authKey: string]: CLIAPI.UserAuthentication.IAuthKeyDetails};

        /**
         * Pairs of actionName - list of users that are allowed to perform said action. 
         * If list is empty, everyone will be allowed to execute the action. If you want
         * to ban some action for everyone, just add nonexisting user to the list - it can be anything.
         */
        actions: CLIAPI.UserAuthentication.Actions
    }

    /**
     * Config related to filesystem
     */
    fs: {
        /**
         * Provider's configs.
         */
        config: IFsProvidersConfigs

        /**
         * Which provider to use for specific operation.
         */
        bindings: {
            [index: string] : string
            logs: string
        }
    }

    /**
     * Configs of external services.
     */
    externalServices: {
        [serviceName: string]: Object
        Mailtrap?: {
            production?: {
                token?: string
                endpoint?: string
            }
            development?: {
                host?: string
                port?: number
                auth?: {
                    user?: string
                    pass?: string
                }
            },
            senderList?: Mailer.ISenderList
        }
    }

    /**
     * Directories that should be emptied on server's startup.
     */
    clearOnInit: Array<string | 
        {path: string, fs: string}
    >
}