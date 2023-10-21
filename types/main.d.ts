declare namespace NodeJS  {
    interface Global {
        app: IApp
        logs: ILogsCollections
        APP_ROOT: string
    }
}

interface IApp {
    /**
     * App version.
     */
    public readonly version: string;

    /**
     * Filesystem interaction class.
     */
	public readonly fs: IFileSystem;

    /**
     * Read-only environment config.
     */
	public readonly env: IEnvironmentConfig;

    /**
     * API server used for communication between server and clients as well as hosting website.
     */
    public readonly server : import("../src/modules/network/FramAPI/fram-api").FramAPI | null

    /**
     * Whether server is secure
     */
    public readonly isHTTPS: boolean

    /**
     * Downloads manager for publishing local server files.
     */
    public readonly localDownloads: IDownloadsManager;

    /**
     * Handles all actions related with the users, authentication and
     * actions on accounts.
     */
    public readonly webAuthManager: WebAPI.Auth.IWebAuthManager;
    
    /**
     * Handles all actions related with the Schedule API
     */
    public readonly scheduleManager: WebAPI.Schedule.IScheduleManager;

    public readonly userStatsManager: WebAPI.Statistics.IUserStatsManager;

    public readonly mailer: Mailer.IMailer;

    public readonly commands: CommandsHandling.ICommandsHandler;

    public readonly userAuth: CLIUserAuthentication.IAuthenticationManager;

    /**
     * Reloads server's session, by reloading config and reinitializing main services.
     * Note that it will NOT reload API server.
     */
	public async reload();

    /**
     * Gracefully shutdowns server.
     */
    public async shutdown();
}

/**
 * Makes all object's properties mandatory.
 */
 type Concrete<Type> = {
    [Property in keyof Type]-?: Type[Property];
};

/**
 * Makes all object's properties optional.
 */
type Optional<Type> = {        
    [Property in keyof Type]+?:Type[Property];
}

