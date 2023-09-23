import { RouteOptions } from "fastify";
import Output from "../../output.js";

/**
 * Class for managing local files download
 */
export class DownloadsManager {
    private _files: {[name: string]: string | undefined} = {};
    private _timeouts: {[name: string]: NodeJS.Timeout | undefined} = {};

    /**
     * Sets new link, which will expire after 5 minutes.
     * @async
     * @param downloadName Download identifier.
     * @param path Path to local file.
     * @throws
     */
    public async setLink(downloadName: string,path: string, makeStatic?:boolean) {
        if(await global.app.fs.local().exists(path)) {
            this._files[downloadName] = path;
            if(!makeStatic) this._timeouts[downloadName] = setTimeout(()=>this.removeLink(downloadName),300000);
        }else throw new Error(`[Local Downloads Manager] Couldn't create link for resource that doesn't exist. [${path}].`);
    }

    /**
     * Removes link making it unavaiable for download.
     * @param downloadName Download identifier.
     */
    public removeLink(downloadName: string) {
        delete this._files[downloadName];
        clearTimeout((this._timeouts[downloadName] ?? 0) as NodeJS.Timeout);
        delete this._timeouts[downloadName];
    }

    /**
     * Returns stored local path for specified download identifier.
     * @param downloadName Download identifier.
     * @returns 
     */
    public getLink(downloadName: string) : string | undefined {
        return this._files[downloadName];
    }

    /**
     * Removes all stored links.
     */
    public clearLinks() {
        for (const name in this._files) this.removeLink(name);
    }
}

/**
 * Utilizes DownloadsManager to handle downloads of local app files that were allowed to be downloaded.
 */
const downloadRoute: RouteOptions = {
    method: "GET",
    url: "/download/:name",
    handler: async (req, res)=>{
        const request : string = typeof (req.params as any).name=="string"?(req.params as any).name:"";

        const url = global.app.localDownloads.getLink(request);
        if(url) {
            try {
                if(await global.app.fs.local().exists(url)) {
                    res.sendFile(url,global.APP_ROOT);
                    res.type("application/octet-stream");
                }else {
                    global.app.localDownloads.removeLink(request);
                    throw new Error(`Local resource {${url}} isn't available anymore.`);
                }
            } catch (error: any) {
                error.message = `[Local file downloads] Couldn't send file data to the http client. ${error.message}`;
                Output.category("debug").print("error",error as Error);
            }
        }else {
            res.statusCode = 404;
            res.header("Content-Type","text/html");
            res.send("<h2>Error 404</h2><p>Specified resource couldn't be found.</p>");
        }
    }
}

export default [
    downloadRoute
]