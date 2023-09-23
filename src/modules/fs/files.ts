import * as localfs from "./providers/local.js";
import { utilites } from "./utility.js";
//@ts-ignore
import Output from "../output.js";

let fsCache : IfsCache = {};
let fsConfigs: IFsProvidersConfigs | null = null;

export function local() : IfsProvider {
    if(!fsCache['local']) {
        if(fsConfigs) {
            localfs.provider.init(fsConfigs['local'] ?? {},utilites);
            fsCache['local'] = localfs.provider;
        }else {
            localfs.provider.init({},utilites);
            Output.category("debug").print("warning","Warning: Environment wasn't ready when tried to initialize local fs provider. Retrying on the next use attempt.");
            return localfs.provider;
        }
    }
    return fsCache['local'];
}


export function useProvider(provider:string) : Promise<IfsProvider | null> {
    return new Promise(async resolve=>{
        let cachedProvider : IfsProvider | undefined = fsCache[provider];

        if(provider=='local') resolve(local());
        else if(cachedProvider) resolve(cachedProvider)
        else {
            import(`./providers/${provider}.js`).then((fs:{provider: IfsProvider})=>{
                let methods = ['append', 'emptyDirectory', 'exists','copy','create','getDownloadLink', 'getFileSize', 'listDirectory', 'init', 'load','move','name', 'remove','rename','save'];
                let errMessage;
                let validStruct = true;
                let requiredMethodsCount = 0;

                for(const method of Object.getOwnPropertyNames(fs.provider)) {
                    if(methods.includes(method)) requiredMethodsCount++;
                    else {validStruct = false; break;}
                }

                if(requiredMethodsCount!=methods.length) validStruct = false;

                if(validStruct) {
                    let initiation;
                    if(fsConfigs) initiation = fs.provider.init(fsConfigs[provider] ?? {},utilites);
                    else initiation = fs.provider.init({},utilites);

                    if(initiation===true) {
                        if(fsConfigs) fsCache[provider] = fs.provider;
                        else Output.category("debug").print("error",new Error(`Warning: Environment wasn't ready when tried to initialize '${provider}' fs provider. Retrying on the next use attempt.`));

                        resolve(fs.provider);
                    }else {
                        errMessage = "Provider couldn't initialize."
                        if(typeof initiation=='string') errMessage += initiation;
                    }
                    return;
                }else errMessage = "Provider doesn't support required methods or exports additional ones, which isn't allowed.";
                
                Output.category("debug").print("error",new Error(`Couldn't load '${provider}.js' file system provider. ${errMessage}`));
                resolve(null);
            }).catch(err=>{
                Output.category("debug").print("error",new Error(`Couldn't load '${provider}.js' file system provider. ${err ?? ""}`));
                resolve(null);
            });
        }
    });
}


export function clearCache() {
    fsCache = {};
}

/**
 * Allows passing configs for fs providers. Can be called only once.
 * @param configs Object containing all defined configs.
 */
export function passConfigs(configs: IFsProvidersConfigs) {
    if(!fsConfigs) fsConfigs = configs;
    else throw new Error("FS configs can be passed only once.");
}

/**
 * Removes all files inside the directories defined inside the environment file.
 */
export async function clearTempDirectories() {
    for(const item of global.app.env.clearOnInit) {
        const path = typeof item == "string"?item:item.path;
        const fs = typeof item == "string"?global.app.fs.local():await global.app.fs.useProvider(item.fs);

        if((await fs?.exists(path))&&!(await fs?.emptyDirectory(path))) {
            Output.category("debug").print("warning",`Clearing of '${path}' content failed.`);
        } 		
    }
}