//Include all necessary imports


/*
    Remember not to change methods in any way. Changes in names, additions or removal of methods is strictly prohibited. 
    Provider will not be loaded if such changes are found. Changing method parameters won't prevent provider from loading, but 
    can cause crashes or other undesired behaviours. All additional options and features should be added as config properties.
*/
export const provider : IfsProvider = {
    name: "<Name_of_provider>",
    
    /**
     * Initiates fs provider by loading all necessary config.
     */
    init: (cfg: IfsProviderConfig) : boolean => {
        /*
            Initialize provider by loading all necessary config. If something is missing, or anything else would prevent provider
            from working, you can return false and provider won't be allowed to be used.
            
            Remember to return true if everything is ready for provider to work or it won't be loaded.
        */
        return false;
    },

    /**
     * Loads data from the file.
     * @param path Path to the file. Path must be absolute, starting from root dir. It also can't start with slash. 
     * @example 
     * let result : string | false = await load("file.txt") - Loading from root dir
     * let result : string | false = await load("subDir/file.txt") - Loading from subdirectory
     * load("folder/anotherOne/file.txt").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Data in form of string if successfull, false when not
     */
    load: (path:string) : Promise<string | false> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - load file from every location inside root directory.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Saves data to the file. Any missing folders along given path will be created automaticly.
     * @param path Path to the file. Path must be absolute, starting from root dir. It also can't start with slash. 
     * @param data Data to save. Giving empty string will just create empty file. Creating files without extension is supported.
     * @example
     * let result : boolean = await save("file.txt","Some data to save") - Saving data to the file inside root directory.
     * let result : boolean = await save("subDir/file.txt","") - Creates empty file inside subdirectory.
     * save("folder/anotherOne/file.txt","Data").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    save: async (path:string,data:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - save data to files in every location inside root directory. 
                    - create file if such doesn't exist.
                    - properly handle calls with empty data, which is to create empty file.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                    - properly handle saving to files without extension.
                    - create all missing folders along target path.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Appends data to the existing file. If file doesn't exist, it will be created. Also, any missing folders along given path will be created automaticly.
     * @param path Path to file. Path must be absolute, starting from root dir. It also can't start with slash. 
     * @param data Data to append. Note, that data will be appended to the last line. If you want to create new line, you need to pass \n inside data.
     * @example
     * let result : boolean = await append("file.txt","Data to append") - Appending data to the file inside root dir.
     * let result : boolean = await append("subDir/file.txt","Another Data") - Appending data to the file inside sub directory.
     * append("folder/anotherOne/file.txt","Data").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    append: (path:string,data:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - append data to files in every location inside root directory. 
                    - create file if such doesn't exist.
                    - properly handle calls with empty data, which is to ignore it or at least to handle all errors.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                    - properly handle saving to files without extension.
                    - not append new line characters on it's own.
                    - create all missing folders along target path.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Checks whether file or directory exists.
     * @param path Target file or directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example
     * let result : boolean = await exists("subDir/file.txt") - Checks whether file exists inside sub directory.
     * let result : boolean = await exists("subDir") - Checks whether folder named 'subDir' exists inside root directory.
     * exists("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    exists: async (path:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - detect existence of file or folder in every location inside root directory.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        }); 
    },

    /**
     * Creates folder or empty file based on provided path. Any missing folders along given path will be created automaticly.
     * @param path Target file or folder. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await create("subDir/file.txt") - Creates file inside sub directory.
     * let result : boolean = await create("subDir") - Creates folder named 'subDir' inside root directory.
     * create("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    create: (path:string) : Promise<boolean> =>{
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - create file or folder in every location inside root directory.
                    - newly created file must be empty.
                    - support creating files without extension.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Deletes file or folder. Note, that folder will be removed even if it has content inside of it.
     * @param path Target file or folder. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await remove("subDir/file.txt") - Removes file from sub directory.
     * let result : boolean = await remove("subDir") - Removes folder named 'subDir' from root directory.
     * remove("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation. Note that, when trying to remove unexisting object, function will return true, as it doesn't exist, therefore goal is achieved.
     */
    remove: (path: string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - remove files and folders in every location inside root directory.
                    - report non existing objects as removed.
                    - remove folder with content inside of it (recursive remove).
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Copies file or folder to a new location. Note that it's not guaranteed, that the whole content from folder will be copied. Any missing folders along destination path will be created automaticly.
     * @param source File or folder to copy. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @param destination Destination. Can be provided in form of directory or file. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await copy("subDir/file.txt", "copied_file.txt") - Copies file from subdirectory to root directory and saves it to given name.
     * let result : boolean = await copy("subDir","inside_root/newName") - Copies folder from root directory into subdirectory 'inside_root' with new name 'newName'.
     * copy("folder/anotherOne/file.txt","folder/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation. In case of folders, result can be altered by enabling strictMode inside config. When enabled, all elements must be copied successfully for it to return true. When disabled, only one copied element will report copying successfull.
     */
    copy: (source:string, destination:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - copy file or folder from source to destination in every location inside root directory.
                    - detect and avoid situations of copying folder to it's subfolder.
                    - create all missing folders along destination path, but only when met all requirements.
                    - in case of copying folder and when given path to the file as destination, stip it and apply last folder's name
                    - in case of copying file and when given path to the folder as destination, it should append original filename.
                    - return true, when source and destination are the same.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                    - report copying process as successfull only when all content was copied successfully.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
                    - provide functionality to revert changes in case of copying error.
            */
        });
    },

    /**
     * Moves file or folder to a new location. Note that it's not guaranteed, that the whole content from folder will be moved. Any missing folders along destination path will be created automaticly.
     * @param source File or folder to move. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @param destination Destination for file or folder. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await move("subDir/file.txt", "moved_file.txt") - Moves file from subdirectory to root directory and saves it to given name.
     * let result : boolean = await move("subDir","inside_root/newName") - Moves folder from root directory into subdirectory 'inside_root' with new name 'newName'.
     * move("folder/anotherOne/file.txt","folder/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation. In case of folders, result can be altered by enabling strictMode inside config. When enabled, all elements must be moved successfully for it to return true. When disabled, only one moved element will report moving successfull.
     */
    move: (source:string, destination: string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - move file or folder from source to destination in every location inside root directory.
                    - detect and avoid situations of move folder to it's subfolder
                    - create all missing folders along destination path, but only when met all requirements..
                    - in case of moving folder and when given path to the file as destination, stip it and apply last folder's name
                    - in case of moving file and when given path to the folder as destination, it should append original filename.
                    - return true, when source and destination are the same.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                    - report moving process as successfull only when all content was moved successfully.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
                    - provide functionality to revert changes in case of moving error.
            */
        });
    },

    /**
     * Renames given file or folder with new name.
     * @param path Target file or directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @param newName New name for a file or directory.
     * @example 
     * let result : boolean = await rename("subDir/file.txt", "renamed_file.txt") - Renames file inside subdirectory to given name 'renamed_file.txt'.
     * let result : boolean = await rename("subDir","renamed") - Renames folder inside root dir to new name.
     * rename("folder/anotherOne/file.txt","name.json").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    rename: async (path:string, newName:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - rename file or folder from source to destination in every location inside root directory.
                    - return true, when tried to rename to the same name.
                    - handle situations, when given path as newName - path should be stripped and only name used.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                    - use native renaming capability.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
                    - if native renaming capability isn't available, use moving process instead.
            */
        });
    },

    /**
     * Returns file size in bytes or null if the file does not exist or cannot be accessed.
     * @param file Path to the file. Path must be absolute, starting from root dir. It also can't start or end with slash.
     */
    getFileSize: (file: string): Promise<number | null> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - return file size in bytes
                    - return null, when tried to get size of the folder or a file that does not exist or is not accessible.
                    - recognize invalid paths (relative or those starting or ending with slash) and return null for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Returns download link to a file. Link may look and behave differently, depending on provider.
     * @param path Path to the file. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : string | false = await getDownloadLink("subDir/file.txt") - Gets download link for file inside subdirectory.
     * let result : false = await getDownloadLink("subDir") - Returns false, since tried to get link for folder.
     * getDownloadLink("folder/anotherOne/file.txt").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Link if successfull, false otherwise.
     */
    getDownloadLink: (path:string) : Promise<string | false> => { 
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - return download link for a file in every location inside root directory.
                    - return false, when tried to get link for folder.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                    - return temporary links instead of permanent ones.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Returns array of file and folder names present in provided directory.
     * @param directory Target directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : Array<string> | false = await listDirectory("subDir") - Lists content of folder inside root directory.
     * let result : false = await listDirectory("file.txt") - Returns false, since tried to list file.
     * listDirectory("folder/anotherOne").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Array of file and folder names or false when directory doesn't exist or other error occured.
     */
    listDirectory: async (directory:string) : Promise<Array<string> | false> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - list content of folder in every location inside root directory.
                    - return false, when tried to list content of file.
                    - provide content in form of native array of strings.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
            */
        });
    },

    /**
     * Removes all content from provided directory. Note, that emptying is being done by removing directory and creating it again. If you don't want that behaviour, you may need to list all objects inside folder and delete them one by one.
     * @param directory Target directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await emptyDirectory("subDir") - Removes whole content from folder inside root directory.
     * let result : false = await emptyDirectory("file.txt") - Returns false, since tried to clear content of file.
     * emptyDirectory("folder/anotherOne").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on operation result.
     */
    emptyDirectory: (directory:string) : Promise<boolean> => {
        return new Promise(resolve=>{
            //Code goes here

            /*
                Your function:
                * MUST
                    - remove whole content of folder in every location inside root directory.
                    - return false, when tried to empty content of file.
                    - recognize invalid paths (relative or those starting or ending with slash) and return false for such requests.
                * SHOULD 
                    - implement timing calculation code and output result via output interface with 'filesystem' debug flag.
                * CAN
                    - Report additional error detail via error output interface. Just remember to mark, that the error comes from this module.
                    - use either of strategies: 
                        * removing folder and recreating it right after.
                        * iterating through content and removing it one by one.
            */
        });
    }
}

// Here you can define all other utility functions you may need for your provider to work. Just remember not to export them.


/**
 * Analyzes path and returns information about it.
 * @param path Path to analyze
 */
function __analyzePath(path:string) 
    : {
        directory: string, 
        name: string, 
        isDirectory: boolean, 
        type: "absolute" | "relative",
        startsWithSlash: boolean
    } {
    let pos = path.lastIndexOf("/");
    let parts = pos!=-1?[path.substr(0,pos),path.substr(pos+1)]:["",path];

    return {
        directory: parts[0],
        name: parts[1],
        isDirectory: parts[1].indexOf(".")==-1,
        type: path.indexOf("./")==-1?"absolute":"relative",
        startsWithSlash: path[0]=="/"?true:false
    }
}