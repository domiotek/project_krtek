import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";

const appVersion: WebAPI.IRouteOptions<API.App.Version.IEndpoint> = {
    method: "GET",
    url: "/api/app/version",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(200);

        const result: API.App.Version.IEndpoint["returnPacket"] = {
            status: "Success",
            data: {
                version: global.app.version,
                buildType: global.app.env.environmentName,
                buildDate: global.app.buildDate.toISODate()
            }
        }

        return result;
    },
    errorHandler
}

const basicData: WebAPI.IRouteOptions<API.App.BasicData.IEndpoint> = {
    method: "GET",
    url: "/api/user/basic-data",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.BasicData.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {
                const user = await auth.getUser(session.userID);

                if(user) {
                    result = {
                        status: "Success",
                        data: {
                            name: user.name,
                            surname: user.surname,
                            rankName: user.rankName
                        }
                    }

                    res.status(200);
                }
            }
        }

        return result;
    },
    errorHandler
}

const fullUserData: WebAPI.IRouteOptions<API.App.UserData.IEndpoint> = {
    method: "GET",
    url: "/api/user/details",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.UserData.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {
                const user = await auth.getUser(session.userID);

                if(user) {
                    const roles = await auth.getUserRoles(user.userID) as NonNullable<Awaited<ReturnType<typeof auth["getUserRoles"]>>>;
                    const rolesResult = [];

                    for (const role of roles) {
                        rolesResult.push(role.displayName);
                    }

                    result = {
                        status: "Success",
                        data: {
                            name: user.name,
                            surname: user.surname,
                            rankName: user.rankName,
                            roles: rolesResult,
                            email: user.email,
                            gender: user.gender,
                            lastPasswordChangeDate: user.lastPasswordChangeDate.toISO(),
                            creationDate: user.creationDate.toISO()
                        }
                    }

                    res.status(200);
                }
            }
        }

        return result;
    },
    errorHandler
}

const navMenu: WebAPI.IRouteOptions<API.App.NavMenu.IEndpoint> = {
    method: "GET",
    url: "/api/user/nav-menu",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.NavMenu.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {
                const entries = [
                    {displayName: "Home", linkDest: "/Home", imageName: "/ui/home.png", imageAlt: "Home tab link"},
                    {displayName: "Schedule",linkDest: "/Schedule",imageName: "/ui/schedule.png",imageAlt: "Schedule tab link"},
                    {displayName: "My Statistics",linkDest: "/Statistics",imageName: "/ui/stats.png",imageAlt: "Statistics tab link"}
                ];

                result = {
                    status: "Success",
                    data: entries
                }

                res.status(200);
            }
        }

        return result;
    },
    errorHandler
}

const getRoles: WebAPI.IRouteOptions<API.App.GetRoles.IEndpoint> = {
    method: "GET",
    url: "/api/app/roles",
    handler: async (req, res)=>{
        let result: API.App.GetRoles.IEndpoint["returnPacket"] = {
            status: "Success",
            data: await global.app.webAuthManager.getDefinedRoles()
        }

        return result;
    },
    errorHandler
}

const userRoles: WebAPI.IRouteOptions<API.App.GetUserRoles.IEndpoint> = {
    method: "GET",
    url: "/api/user/roles",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.GetUserRoles.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {

                const roles = await global.app.webAuthManager.getUserRoles(session.userID);
                if(roles) {
                    res.status(200);

                    result = {
                        status: "Success",
                        data: roles
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}

export default [
    appVersion,
    basicData,
    fullUserData,
    navMenu,
    getRoles,
    userRoles
];