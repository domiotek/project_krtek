import Output from "./output.js";
import * as Time from "./time.js";

export class LogsCollections implements ILogsCollections {
    private _collections : {[name: string]: ILogsCollection | null} = {};
    private _provider : IfsProvider;
    private _initialized: boolean = false;

    constructor(fs: IfsProvider) {
        this._provider = fs;
    }

    public async initialize(env: IEnvironmentConfig) {
        if(this._initialized) return;
        if(this._provider) {
            if(!(await this._provider.exists(`logs`))) this._provider.create("logs");
            
            for (const collectionName in env.logsCollections) {
                const config = env.logsCollections[collectionName as LogsCollectionName];
                if(config&&config.state) 
                    this._collections[collectionName] = new LogsCollection(collectionName,this._provider,config);
            }
            this._initialized = true;
        }else Output.category("debug").print("error",new Error(`[Logs] Couldn't initialize logs collections. FS provider couldn't be initialized.`));
    }

    public access(name: string) : ILogsCollection | null {
        if(!this._initialized) return null;
        if(this._collections[name]!==undefined) return this._collections[name];
        return null;
    }
}

export default class LogsCollection implements ILogsCollection {
    private readonly _file : string;
    private readonly _provider: IfsProvider;
    private readonly _fileSizeLimit: number;
    private readonly _action: ILogsCollectionConfig['action'];

    public readonly name: string;

    private async _performAction(action: ILogsCollectionConfig['action']): Promise<boolean> {
        switch(action) {
            case "Clear": return this._provider.save(this._file,"");
            case "Archive": return this._provider.rename(this._file,`logs/${this.name}-${Date.now()}.txt`);
            default: return false;
        }
    }

    /**
     * Creates an instance of simple logger, designed to just write single line
     * of text, load and clear logs.
     * @param name Logs collection name.
     * @param provider File system provider.
     */
    constructor(name: string, provider: IfsProvider, config: ILogsCollectionConfig) {
        this.name = name;
        this._file = `logs/${name}.txt`;
        this._provider = provider;
        this._fileSizeLimit = -1;

        switch(config.actionTrigger) {
            case "Initialization":
                this._performAction(config.action ?? "Clear");
            break;
            case "LimitReached":
                this._fileSizeLimit = ((config.sizeLimit ?? -1)>0?config.sizeLimit:undefined) ?? 625000; //5MB
                this._action = config.action; 
            break;
        }
    }

    get() {
        return this._provider.load(this._file);
    }

    async write(message: string, allowMultiLine: boolean = false) {
        const size = await this._provider.getFileSize(this._file);
        if(size!=null&&this._fileSizeLimit>0&&size>this._fileSizeLimit) await this._performAction(this._action);

        return this._provider.append(this._file,`[${Time.formatDate(Time.now())}] ${allowMultiLine?message:message.replace(/\n/g,"")}\n`);
    }

    clear() {
        return this._performAction("Clear");
    }

    getDownloadLink() {
        return this._provider.getDownloadLink(this._file);
    }
}