import { RequiredStringSchema } from "yup/lib/string.js";
import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";

import * as yup from "yup";
import { isAPIError } from "../../util.js";

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
                            rankName: user.rankName,
                            gender: user.gender
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
                        rolesResult.push(role.name);
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
                    {displayName: "beta_intro", linkDest: "/Beta", imageName: "/ui/announcement.png", imageAlt: "Beta intro tab link"},
                    {displayName: "home", linkDest: "/Home", imageName: "/ui/home.png", imageAlt: "Home tab link"},
                    {displayName: "schedule",linkDest: "/Schedule",imageName: "/ui/schedule.png",imageAlt: "Schedule tab link"},
                    {displayName: "statistics",linkDest: "/Statistics",imageName: "/ui/stats.png",imageAlt: "Statistics tab link"},
                    {displayName: "feedback", linkDest: "/Feedback", imageName: "/ui/feedback.png", imageAlt: "Feedback tab link"},
                    {displayName: "settings",linkDest: "/Settings",imageName: "/ui/settings.png", imageAlt: "Settings tab link"}
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

const postFeedbackRequestSchema = yup.object().shape({
    type: yup.string().required().oneOf(["opinion", "problem"]) as RequiredStringSchema<"opinion" | "problem">,
    title: yup.string().required(),
    desc: yup.string().required(),
    anonymity: yup.boolean().required()
});

const postFeedback: WebAPI.IRouteOptions<API.App.PostFeedback.IEndpoint> = {
    method: "POST",
    url: "/api/app/feedback",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.PostFeedback.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {
                res.code(400);

                let params: API.App.PostFeedback.IFeedbackData;
                
                try {
                    params = await postFeedbackRequestSchema.validate(req.body);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }
                
                const ticketID = await global.app.feedbackManager.createTicket(params.type,params.title, params.desc, params.anonymity?null:session.userID);

                if(ticketID!=null) {
                    res.code(201);
                    result = {
                        status: "Success",
                        data: undefined
                    }

                    return result;
                }

                result.errCode = "BadRequest";
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
    userRoles,
    postFeedback
];