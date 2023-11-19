import { FastifyInstance, FastifyReply } from "fastify";
import FastifyStatic from "@fastify/static";
import FastifyCookie from "@fastify/cookie";
import FastifyFormBody from "@fastify/formbody";
import FastifyMultipart from "@fastify/multipart";
import path from "path";
import Output from "../output.js";

/**
 * Initializes all network-related features such as 'waker' and 'localDownloads' or website hosting.
 * @param instance Fastify instance.
 */
export default async function initializeFeatures(instance: FastifyInstance | null) {

    //Enabling static serving of assets
    instance?.register(FastifyStatic,{root: path.join(global.APP_ROOT, 'public/assets'), setHeaders: (res: any, path: string)=>{
        if(global.app.env.environmentName=="production") {
            if(path.endsWith(".js")) {
                res.setHeader("cache-control","max-age=31536000, immutable");
            }else if(path.endsWith(".png") || path.endsWith(".svg")) {
                res.setHeader("cache-control", "max-age=172800");
            }
        }else {
            res.setHeader("cache-control","max-age=300, must-revalidate");
        }
       
    }});

    instance?.register(FastifyCookie);
    instance?.register(FastifyFormBody);
    instance?.register(FastifyMultipart);

    //Fetches all files inside api directory and then loads and registers routes defined in them
    const routeSourceFiles = await global.app.fs.local().listDirectory("modules/network/api");
    if(routeSourceFiles) {
        for(const fileName of routeSourceFiles) {
            if(fileName.endsWith(".js")) {
                Output.category("debug").print("notice",`Loading api routes from ${fileName} file.`,"webapi");
                let routes: WebAPI.TRouteSourceFile = await import(`./api/${fileName}`);
                if(!Array.isArray(routes)) routes = routes.default;

                for (const routeOpts of routes) {
                    instance?.route(routeOpts);
                }
            }
        }
    } 


    //Simple endpoint for external services to nudge server with minimal cost.
    instance?.get("/api/ping", async (req, res)=>{res.code(204);});

    // If request doesn't match with any api calls, then redirect to web portal, so react router can handle it.
    instance?.setNotFoundHandler(async (req,res)=>{
        const url=req.url.toLowerCase();

        if(url.startsWith("/api")) {
            res.status(404);
            res.send({
                status: "Failure",
                errCode: "InvalidEndpoint",
                message: "Requested API url and/or method isn't supported by the server."
            });
        }

        if(url.endsWith(".png")||url.endsWith(".svg")) {
            res.code(404);
            return;
        }

        const sessionID = req.cookies.session;
        const isTargetLoginPage =url.startsWith("/login");
        const anonymousRoutes = ["/p"];
        let isTargetAnonymousRoute = false;
        
        for(const route of anonymousRoutes) {
            if(url.startsWith(route)) {
                isTargetAnonymousRoute = true;
                break;
            }
        }

        if(!sessionID&&!isTargetLoginPage&&!isTargetAnonymousRoute) {
            res.redirect(302,"/login");
            return;
        }
        
        if(sessionID) {
            let isSessionValid: boolean;
            try {
                isSessionValid = await global.app.webAuthManager.prolongSession(sessionID,req.ip);
            } catch (error) {
                isSessionValid = false;
            }

            if(url.startsWith("/p/recover")||url.startsWith("/p/invite")) {
                res.redirect(302, `/Logout?then=${global.app.env.server.url}${url}`);
                return;
            }

            if(isSessionValid===false&&!isTargetLoginPage&&!isTargetAnonymousRoute) {
                res.clearCookie("session");
                res.redirect(302,"/login?r=session_expired");
                return;
            }

            if(isTargetLoginPage&&isSessionValid) {
                res.redirect(302,"/Home");
                return;
            }
        }

        const invalidLinkUrl = "/p/BrokenLink";
        if(!global.app.env.flags.disablePortalTokenChecking&&url.startsWith("/p")&&!url.startsWith(invalidLinkUrl.toLowerCase())) {
            if(typeof req.query == "object") {
                const query = req.query as WebAPI.IGetRequestQuery;


                const token = query["token"];

                let portalValidationResult: true | string = true;
                
                try {
                    switch(true) {
                        case url.startsWith("/p/invite"):
                            await global.app.webAuthManager.getInviteDetails(token ?? "");
                        break;
                        default: 
                            await global.app.webAuthManager.getTokenDetails(token ?? "")
                    }
                } catch (error: any) {
                    if(!error.errCode) throw error;
                    portalValidationResult = error.errCode;
                }

                if(portalValidationResult!==true) {
                    
                    if(portalValidationResult=="InvalidToken") {
                        res.redirect(302, invalidLinkUrl);
                        return;
                    }else {
                        res.redirect(302, `${invalidLinkUrl}?issue=ServerError`);
                        return;
                    }
                }
            }else {
                res.redirect(302, invalidLinkUrl);
                return;
            }
        }

       
        res.header("content-type","text/html; charset=UTF-8");
        res.header("cache-control","public, max-age=86400, must-revalidate");
        const content = await global.app.fs.local().load("public/index.html");
        if(!content) res.send("<h2>Error 500</h2><p>Website entry file couldn't be located. Has the website been built yet?</p>");
        else res.send(content);
    });

}