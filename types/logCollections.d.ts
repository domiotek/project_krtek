

interface ILogsCollectionConfig {
    state: boolean
    actionTrigger?: "Initialization" | "LimitReached"
    /**
     * File size in bytes.
     */
    sizeLimit?: number
    /**
     * Defaults to 'Clear' if not provided.
     */
    action?: "Clear" | "Archive"
}

interface ILogsCollections {

    /**
     * Initializes all logs collections defined in env file.
     */
    public async initialize(env: IEnvironmentConfig);

    /**
     * Gets access to logs collection.
     * @param name 
     */
    public access(name: LogsCollectionName) : ILogsCollection | null;
}

interface ILogsCollection {
    /**
     * Returns content of logs file
     */
    public get() : Promise<string | false>

    /**
     * Writes new log entry. Each entry begins at new line along with included timestamp.
     * @param message Log entry to write.
     * @param allowMultiLine Determines, whether log entry can be multiline. 
     * If not allowed (by default), all new line characters will be removed.
     */
    public write(message: string, allowMultiLine: boolean=false) : Promise<boolean>

    /**
     * Clears logs file
     */
    public clear() : Promise<boolean>

    /**
     * Returns url to a log file for download
     */
    public getDownloadLink() : Promise<string | false>
}