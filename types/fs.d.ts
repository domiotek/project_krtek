
interface IFileSystem {
    /**
     * Returns local fs provider.
     */
    local : ()=>IfsProvider

    /**
     * Gets desired filesystem provider
     * @param provider Provider file name (without .js)
     */
    useProvider : (provider: string) => Promise<IfsProvider | null>

    /**
     * Clears cache for fs providers
     */
    clearCache: ()=>void

    /**
     * Allows passing configs for fs providers. Can be called only once.
     * @param configs Object containing all defined configs.
     */
    passConfigs: (configs: IFsProvidersConfigs)=>void

    /**
     * Removes all files inside the directories defined inside the environment file.
     */
    clearTempDirectories: ()=>Promise<void>
}

interface IfsProvider {
    /**
     * Name of the provider
     */
    name: string

    /**
     * Initiates fs provider by loading all necessary config.
     */
    init: (config: IfsProviderConfig, utils : IfsUtilityFunctions) => boolean | string

     /**
     * Loads data from the file.
     * @param path Path to the file. Path must be absolute, starting from root dir. It also can't start with slash. 
     * @example 
     * let result : string | false = await load("file.txt") - Loading from root dir
     * let result : string | false = await load("subDir/file.txt") - Loading from subdirectory
     * load("folder/anotherOne/file.txt").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Data in form of string if successfull, false when not
     */
    load: (fileName:string)=> Promise<string | false>

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
    save: (fileName: string, data: string) => Promise<boolean>

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
    append: (fileName: string, data: string) => Promise<boolean>

    /**
     * Checks whether file or directory exists.
     * @param path Target file or directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example
     * let result : boolean = await exists("subDir/file.txt") - Checks whether file exists inside sub directory.
     * let result : boolean = await exists("subDir") - Checks whether folder named 'subDir' exists inside root directory.
     * exists("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    exists: (path: string) => Promise<boolean>

    /**
     * Creates folder or empty file based on provided path. Any missing folders along given path will be created automaticly.
     * @param path Target file or folder. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await create("subDir/file.txt") - Creates file inside sub directory.
     * let result : boolean = await create("subDir") - Creates folder named 'subDir' inside root directory.
     * create("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation.
     */
    create: (path: string) => Promise<boolean>

    /**
     * Deletes file or folder. Note, that folder will be removed even if it has content inside of it.
     * @param path Target file or folder. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await remove("subDir/file.txt") - Removes file from sub directory.
     * let result : boolean = await remove("subDir") - Removes folder named 'subDir' from root directory.
     * remove("folder/anotherOne/file.txt").then((r: boolean)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on the result of operation. Note that, when trying to remove unexisting object, function will return true, as it doesn't exist, therefore goal is achieved.
     */
    remove: (path: string) => Promise<boolean>

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
    copy: (source: string, destination: string) => Promise<boolean>

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
    move: (source: string, destination: string) => Promise<boolean>

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
    rename: (path: string, newName: string) => Promise<boolean>

    /**
     * Returns file size in bytes or null if the file does not exist or cannot be accessed.
     * @param file Path to the file. Path must be absolute, starting from root dir. It also can't start or end with slash.
     */
    getFileSize: (path: string) => Promise<number | null>

    /**
     * Returns download link to a file. Link may look and behave differently, depending on provider.
     * @param path Path to the file. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : string | false = await getDownloadLink("subDir/file.txt") - Gets download link for file inside subdirectory.
     * let result : false = await getDownloadLink("subDir") - Returns false, since tried to get link for folder.
     * getDownloadLink("folder/anotherOne/file.txt").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Link if successfull, false otherwise.
     */
    getDownloadLink: (file: string) => Promise<string | false>

    /**
     * Returns array of file and folder names present in provided directory.
     * @param directory Target directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : Array<string> | false = await listDirectory("subDir") - Lists content of folder inside root directory.
     * let result : false = await listDirectory("file.txt") - Returns false, since tried to list file.
     * listDirectory("folder/anotherOne").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Array of file and folder names or false when directory doesn't exist or other error occured.
     */
    listDirectory: (directory: string) => Promise<Array<string> | false>

    /**
     * Removes all content from provided directory. Note, that emptying is being done by removing directory and creating it again. If you don't want that behaviour, you may need to list all objects inside folder and delete them one by one.
     * @param directory Target directory. Path must be absolute, starting from root dir. It also can't start or end with slash.
     * @example 
     * let result : boolean = await emptyDirectory("subDir") - Removes whole content from folder inside root directory.
     * let result : false = await emptyDirectory("file.txt") - Returns false, since tried to clear content of file.
     * emptyDirectory("folder/anotherOne").then((r: string | false)=>{}) - Example using .then(). There is no point implementing .catch() since it will never throw anything.
     * @returns Either true or false depending on operation result.
     */
    emptyDirectory: (directory: string) => Promise<boolean>
}

interface IfsUtilityFunctions {
    analyzePath(path:string) : IanalyzePathResult
}

interface IanalyzePathResult {
    directory: string, 
    name: string, 
    isDirectory: boolean, 
    type: "absolute" | "relative",
    startsWithSlash: boolean
}
interface IFsProvidersConfigs {
    [providerName: string] : IfsProviderConfig
}

interface IfsProviderConfig {
    [property: string] : any
}

interface IfsCache {
    [providerName: string] : IfsProvider
}