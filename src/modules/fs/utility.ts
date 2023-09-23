
export const utilites : IfsUtilityFunctions = {
    /**
     * Analyzes path and returns information about it.
     * @param path Path to analyze
     */
    analyzePath : (path:string) => {
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
}