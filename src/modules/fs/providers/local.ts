import * as fs from 'fs';
import * as Addr from "../../network/addr.js";
import PathUtil from "path";
import Output from '../../output.js';
import {now, getDifference} from "../../time.js";

let config : LocalFsProviderConfig;
let util : IfsUtilityFunctions;

interface LocalFsProviderConfig {
    strictMode: boolean
}

export const provider : IfsProvider = {
    name: "local",

    
    init: (cfg: IfsProviderConfig, utility : IfsUtilityFunctions) : boolean => {
        config = {
            strictMode: cfg.strictMode ?? false
        }
        util = utility
        return true;
    },

   
    load: (path:string) : Promise<string | false> => {
        return new Promise(resolve=>{
            let start = now();
            let pathInfo = util.analyzePath(path);

            if(pathInfo.startsWithSlash||pathInfo.type=='relative') {
                resolve(false); 
                return;
            }

            
            fs.readFile(PathUtil.join(global.APP_ROOT, path),"utf-8",(err,data)=>{
                let end = now();
                Output.category("debug").print("notice",`[FILESYSTEM] Load operation of '${path}' file took ${getDifference(start,end,['milliseconds']).milliseconds}ms`,"filesystem");
                if(err) resolve(false);
                else resolve(data);
            });
        });
    },

    
    save: async (path:string,data:string) : Promise<boolean> => {
        let start = now();
        let pathInfo = util.analyzePath(path);
        let result : boolean;

        if(pathInfo.startsWithSlash||pathInfo.type=='relative') result = false;
        else {
            await __createDir(util.analyzePath(path).directory);
            result = await __save(path, data);
        }
        Output.category("debug").print("notice",`[FILESYSTEM] Save operation of '${path}' file took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
        return result;
    },

    
    append: (path:string,data:string) : Promise<boolean> => {
        return new Promise(async resolve=>{
            let start = now();
            let pathInfo = util.analyzePath(path);

            if(pathInfo.startsWithSlash||pathInfo.type=='relative') {
                resolve(false); 
                return;
            }

            await __createDir(util.analyzePath(path).directory);
            fs.appendFile(PathUtil.join(global.APP_ROOT, path),data,err=>{
                let end = now();
                Output.category("debug").print("notice",`[FILESYSTEM] Append operation of '${path}' file took ${getDifference(start,end,['milliseconds']).milliseconds}ms`,"filesystem");
                if(err) resolve(false);
                else resolve(true);
            });
        });
    },


    exists: async (path:string) : Promise<boolean> => {
        let start = now();
        let pathInfo = util.analyzePath(path);
        let result : boolean;

        if(pathInfo.startsWithSlash||pathInfo.type=='relative'||path[path.length-1]=='/') result = false;
        else result = await __exists(path);

        Output.category("debug").print("notice",`[FILESYSTEM] Exists operation of '${path}' object took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
        return result;
            
    },

    
    create: (path:string) : Promise<boolean> =>{
        return new Promise(async resolve=>{
            let start = now();
            let pathInfo = util.analyzePath(path);
            let result : boolean;

            if(pathInfo.startsWithSlash||pathInfo.type=='relative'||path[path.length-1]=='/') result = false;
            else {
                if(pathInfo.isDirectory) result = await __createDir(path);
                else {
                    let createdDir = true;
                    if(pathInfo.directory) createdDir = await __createDir(pathInfo.directory);
                    
                    if(createdDir) result = await __save(path,""); 
                    else result = false; 
                }
            }
            
            Output.category("debug").print("notice",`[FILESYSTEM] Create operation of '${path}' path took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
            resolve(result);
        });
    },

    
    remove: (path: string) : Promise<boolean> => {
        return new Promise(async resolve=>{
            let start = now();
            const pathInfo = util.analyzePath(path);
            let result : boolean;

            if(pathInfo.startsWithSlash||pathInfo.type=='relative'||path[path.length-1]=='/') result = false;
            else {
                if(pathInfo.isDirectory) result = await __removeDir(path);
                else result = await __removeFile(path);
            }

            Output.category("debug").print("notice",`[FILESYSTEM] Remove operation of '${path}' path took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");     
            resolve(result);
        });
    },

    
    copy: (source:string, destination:string) : Promise<boolean> => {
        return new Promise(async resolve=>{
            let start = now();
            const srcInfo = util.analyzePath(source);
            const destInfo = util.analyzePath(destination);
            let result : boolean;

            if(source==destination) result = true;
            else if(!await __exists(source)||
                    (srcInfo.startsWithSlash||srcInfo.type=="relative"||source[source.length-1]=='/') || 
                    (destInfo.startsWithSlash || destInfo.type=="relative"||destination[destination.length-1]=='/')) 
                        result = false;
            else {
                if(srcInfo.isDirectory) {
                    let dirCopyResult = await __copyDir(source,destInfo.isDirectory?destination:destInfo.directory);
                    if(config?.strictMode)result = dirCopyResult.copied==dirCopyResult.total;
                    else {
                        if(dirCopyResult.copied>0) result = true;
                        else result = false;
                    }
                }else {
                    let dirCreate : string;
                    if(destInfo.isDirectory) {
                        dirCreate = destination;
                        destination = `${destination}/${srcInfo.name}`;
                    }else dirCreate = destInfo.directory;

                    await __createDir(dirCreate);
                    result = await __copyFile(source,destination);
                }
            }
            Output.category("debug").print("notice",`[FILESYSTEM] Copy operation of '${source}' to '${destination}' took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
            resolve(result);
        });
    },

    
    move: (source:string, destination: string) : Promise<boolean> => {
        return new Promise(async resolve=>{
            let start = now();
            const srcInfo = util.analyzePath(source);
            const destInfo = util.analyzePath(destination);
            let result : boolean;
            
            if(source==destination) result = true;
            else if(!await __exists(source)||
                    (srcInfo.startsWithSlash||srcInfo.type=="relative"||source[source.length-1]=='/') || 
                    (destInfo.startsWithSlash || destInfo.type=="relative"||destination[destination.length-1]=='/'))
                        result = false;
            else {
                if(srcInfo.isDirectory) {
                    let dirMoveResult = await __moveDir(source, (destInfo.isDirectory?destination:destInfo.directory));
                    if(config?.strictMode)result = dirMoveResult.moved==dirMoveResult.total;
                        else {
                            if(dirMoveResult.moved>0) result = true;
                            else result = false;
                        }
                }else {
                    let dirCreate : string;
                    if(destInfo.isDirectory) {
                        dirCreate = destination;
                        destination = `${destination}/${srcInfo.name}`;
                    }else dirCreate = destInfo.directory;
                    await __createDir(dirCreate);

                    if(await __copyFile(source,destination)) result = await __removeFile(source);
                    else result = false;
                }
            }
            Output.category("debug").print("notice",`[FILESYSTEM] Move operation of '${source}' to '${destination}' took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
            resolve(result);
        });
    },

    
    rename: async (path:string, newName:string) : Promise<boolean> => {
        let start = now();
        const pathInfo = util.analyzePath(path);
        const nameInfo = util.analyzePath(newName);
        let result : boolean;

        if(pathInfo.name==nameInfo.name) result = true;
        else if(await __exists(`${pathInfo.directory}/${nameInfo.name}`) || pathInfo.startsWithSlash || pathInfo.type=="relative" || path[path.length-1]=="/") result = false;
        else {
            result = await new Promise(resolve=>{
                fs.rename(PathUtil.join(global.APP_ROOT, path), PathUtil.join(global.APP_ROOT,pathInfo.directory,nameInfo.name),err=>{
                    if(err) resolve(false);
                    else resolve(true);
                });
            });
        }

        Output.category("debug").print("notice",`[FILESYSTEM] Rename operation of '${path}' to '${newName}' took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
        return result;
    },

    getFileSize: async (path) : Promise<number | null> => {
        let start = now();
        let pathInfo = util.analyzePath(path);
        let result : number | null;

        if(pathInfo.isDirectory||pathInfo.startsWithSlash||pathInfo.type=='relative'||path[path.length-1]=='/') result = null;
        else {
            result = await new Promise(resolve=>{
                fs.stat(PathUtil.join(global.APP_ROOT, path),(err, stats)=>{
                    if(err) resolve(null);
                    else resolve(stats.size);
                });
            });
        }
        
        Output.category("debug").print("notice",`[FILESYSTEM] GetFileSize operation of '${path}' object took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
        return result;
    },
    
    getDownloadLink: (path:string) : Promise<string | false> => { 
        return new Promise(async resolve=>{
            let name;
            let pathInfo = util.analyzePath(path);
            if(pathInfo.isDirectory || !(await __exists(path)) || pathInfo.startsWithSlash || pathInfo.type=="relative") resolve(false);

            try {
                let parts = path.split("/");
                name = parts[parts.length-1];
                global.app.localDownloads.setLink(name,path[0]!="/"?"/"+path:path);
            }catch(error) {
                resolve(false);
                return;
            }
            let port = Addr.getPort();
            resolve(`http://${Addr.getAddress()}${port!=80?":"+port:""}/download/${name}`);
        });
    },

    
    listDirectory: async (directory:string) : Promise<Array<string> | false> => {
        let start = now();
        let dirInfo = util.analyzePath(directory);
        let result : boolean | Array<string>;
        if(!(await __exists(directory)) || !dirInfo.isDirectory || dirInfo.startsWithSlash || dirInfo.type=="relative" || directory[directory.length-1]=="/") result = false;
        else result = await __listObjects(directory);
        Output.category("debug").print("notice",`[FILESYSTEM] listDirectory operation of '${directory}' took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
        return result;
    },

    
    emptyDirectory: (directory:string) : Promise<boolean> => {
        return new Promise(async resolve=>{
            let start = now();
            let dirInfo = util.analyzePath(directory);
            let result : boolean;
            if(!(await __exists(directory)) || !dirInfo.isDirectory || dirInfo.startsWithSlash || dirInfo.type=="relative"|| directory[directory.length-1]=="/") result = false;
            else {
                if(await __removeDir(directory)) result = await __createDir(directory);
                else result = false;
            }
            Output.category("debug").print("notice",`[FILESYSTEM] emptyDirectory operation of '${directory}' took ${getDifference(start,now(),['milliseconds']).milliseconds}ms`,"filesystem");
            resolve(result);;  
        });
    }
}

/**
 * Private, internal function for handling file saving requests
 * @param path Path to the file
 * @param content Content to write
 */
function __save(path:string,data:string) : Promise<boolean>  {
    return new Promise(resolve=>{
        fs.writeFile(PathUtil.join(global.APP_ROOT, path),data,err=>{
            if(err) resolve(false);
            else resolve(true);
        });
    });
}

/**
 * Private, internal function for handling folder creating requests
 * @param path Path to the directory
 */
function __createDir(path:string) : Promise<boolean> {
    return new Promise(resolve=>{
        fs.mkdir(PathUtil.join(global.APP_ROOT, path),{recursive:true},err=>{
            if(err)resolve(false);
            else resolve(true);
        });
    });
}

/**
 * Private, internal function for handling file or folder existence checking requests
 * @param path Path to the file or folder
 */
function __exists(path: string) : Promise<boolean> {
    return new Promise(resolve=>{
        fs.stat(PathUtil.join(global.APP_ROOT, path),err=>{
            if(err) resolve(false);
            else resolve(true);
        });
    });
}
/**
 * Private, internal function for handling file copying requests.
 * @param source Source path.
 * @param destination Destination path.
 */
function __copyFile(source: string, destination: string) : Promise<boolean> {
    return new Promise(resolve=>{
        fs.copyFile(PathUtil.join(global.APP_ROOT, source),PathUtil.join(global.APP_ROOT, destination),err=>{
            if(err) resolve(false);
            else resolve(true);
        });
    });
}

/**
 * Private, internal function for handling folder copying requests.
 * @param source Source path.
 * @param destination Destination path.
 */
function __copyDir(source:string, destination: string) : Promise<{copied: number, total: number}> {
    return new Promise(async resolve=>{
        let objects = await __listObjects(source);
        let result = {copied: 0, total: objects.length};

        if(destination.indexOf(source+"/")==0) {
            resolve(result);
            return;
        }
        await __createDir(destination);
        for (const object of objects) {
            if(util.analyzePath(object).isDirectory) {
                let stats = await __copyDir(`${source}/${object}`,`${destination}/${object}`);
                if(config?.strictMode) {
                    if(stats.copied==stats.total) result.copied++;
                }else if(stats.copied>0) result.copied++;
            }else if(await __copyFile(`${source}/${object}`,`${destination}/${object}`)) result.copied++;
        }
        resolve(result);
    });
}

/**
 * Private, internal function for handling folder copying requests.
 * @param source Source path.
 * @param destination Destination path.
 */
function __moveDir(source:string, destination: string) : Promise<{moved: number, total: number}> {
    return new Promise(async resolve=>{
        let objects = await __listObjects(source);
        let result = {moved: 0, total: objects.length}

        if(destination.indexOf(source+"/")==0) {
            resolve(result);
            return;
        }

        await __createDir(destination);
        for (const object of objects) {
            if(util.analyzePath(object).isDirectory) {
                let copyResult = await __moveDir(`${source}/${object}`,`${destination}/${object}`);
                if(config?.strictMode) {
                    if(copyResult.moved==copyResult.total) result.moved++;
                }else if(copyResult.moved>0) result.moved++;
            }else {
                if(await __copyFile(`${source}/${object}`,`${destination}/${object}`)) {
                    await __removeFile(`${source}/${object}`);
                    result.moved++;
                }
            }
        }
        let check = await __listObjects(source);
        if(check.length==0) await __removeDir(source);
        resolve(result);
    });
}

/**
 * Private, internal function for handling directory listing requests.
 * @param destination Destination path.
 */
function __listObjects(directory: string) : Promise<Array<string>> {
    return new Promise(resolve=>{
        fs.readdir(PathUtil.join(global.APP_ROOT, directory), (err, objects) => {
            resolve(objects ?? []);
        });
    });
}

/**
 * Private, internal function for handling directory removing requests.
 * @param path Target directory
 */
function __removeDir(path:string) : Promise<boolean> {
    return new Promise(resolve=>{
        fs.rmdir(PathUtil.join(global.APP_ROOT, path),{recursive:true},err=>{
            if(err) resolve(false);
            else resolve(true);
        });
    });
}

/**
 * Private, internal function for handling file removing requests.
 * @param path Target file
 */
function __removeFile(path:string) : Promise<boolean> {
    return new Promise(async resolve=>{
        if(!(await __exists(path))) resolve(true);
        fs.rm(PathUtil.join(global.APP_ROOT, path),err=>{ 
            if(err) resolve(false);
            else resolve(true);
        });
    });
}