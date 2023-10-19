import Output from "./modules/output.js";

export default async function initialize(local: IfsProvider | null) : Promise<IEnvironmentConfig> {
    if(!local) throw new Error(`Initialization failed. Local fs provider couldn't be loaded`);

    const envMode = process.env.NODE_ENV ?? "development";
    const envFile = `environment${envMode!="production"?"-"+envMode:""}.json`;

    let s_env = await local.load(envFile);
    let env : IEnvironmentConfig;
    if(s_env) env = JSON.parse(s_env);
    else {
        Output.category("debug").print("warning",`Warning: Couldn't open environment config file (${envFile}).\nWe will try create new configuration file with default values for you to edit.`);
        //@ts-expect-error
        env = {};
    }

    env.server = env.server ?? {};
    env.mysql = env.mysql ?? {};
    env.flags = env.flags ?? {};
    env.outputChannels = env.outputChannels ?? {};
    env.logsCollections = env.logsCollections ?? {};
    env.externalServices = env.externalServices ?? {};


    env.server.type = env.server.type ?? "Local";
    env.server.addressMode = env.server.addressMode ?? "address";
    if(env.server.addressMode=="address") 
         env.server.address = env.server.address ?? "127.0.0.1"; 
    else env.server.interfaceName = env.server.interfaceName ?? "eth0";

    env.server.port = env.server.port ?? "auto";

    env.debuggingEnabled = env.debuggingEnabled ?? (envMode=="development");

    let auth = (env.auth ?? {useAuth: false, authKeys: {}, actions: {}}) as CLIUserAuthentication.IAuthSecuringEnvironmentConfig["auth"];

    auth.useAuth = env.auth?.useAuth ?? false;
    auth.authKeys = env.auth?.authKeys ?? {};
    auth.actions = {
        manageServer: env.auth?.actions.manageServer ?? [],
        useDebug: env.auth?.actions.useDebug ?? [],
        manageUsers: env.auth?.actions.manageUsers ?? [],
        viewUsers: env.auth?.actions.viewUsers ?? [],
        viewInvites: env.auth?.actions.viewInvites ?? [],
        manageInvites: env.auth?.actions.manageInvites ?? [],
        viewSessions: env.auth?.actions.viewSessions ?? [],
        manageSessions: env.auth?.actions.manageSessions ?? [],
        viewTokens: env.auth?.actions.viewTokens ?? [],
        manageTokens: env.auth?.actions.manageTokens ?? [],
        viewSchedule: env.auth?.actions.viewSchedule ?? [],
        manageSchedule: env.auth?.actions.manageSchedule ?? []
    }
    env.auth = auth as any;


    /**
     * MYSQL configuration
     */
    if(!env.mysql) 
        throw new Error("Error: Couldn't locate database connection details. These are required for server to operate.");
    env.mysql.connectionLimit = env.mysql.connectionLimit ?? 10;


    env.clearOnInit = env.clearOnInit ?? [];
    env.fs = env.fs ?? {config: {}, bindings: {}};
    env.fs.bindings.logs = env.fs.bindings.logs ?? "local";


    env.outputChannels.filesystem = env.outputChannels.filesystem ?? false;
    env.outputChannels.mysql = env.outputChannels.mysql ?? false;
    env.outputChannels.webapi = env.outputChannels.webapi ?? false;

    env.logsCollections.alerts = handleLogsCollectionConfig(env.logsCollections.alerts,true);
    env.logsCollections.debug = handleLogsCollectionConfig(env.logsCollections.debug, (envMode=="development"));

    /**
     * External services
     */
    env.externalServices.Mailtrap = env.externalServices.Mailtrap ?? {};
    env.externalServices.Mailtrap.production = env.externalServices.Mailtrap.production ?? {};
    env.externalServices.Mailtrap.development = env.externalServices.Mailtrap.development ?? {};
    env.externalServices.Mailtrap.senderList = env.externalServices.Mailtrap?.senderList ?? {};

    /** Flags */

    await local.save(envFile,JSON.stringify(env,null,3));
    env.environmentName = envMode;

    return env;
}

function handleLogsCollectionConfig(config: ILogsCollectionConfig | boolean, defaultState: boolean=false) : ILogsCollectionConfig {
    if(typeof config == "object") {
        return {
            state: config.state ?? defaultState,
            actionTrigger: config.actionTrigger,
            action: config.action,
            sizeLimit: config.sizeLimit
        }
    }else return {
        state: config ?? defaultState
    }
}