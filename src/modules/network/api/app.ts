import { FastifyError, FastifyRequest, RouteOptions } from "fastify";
import Output from "../../output.js";
import { API } from "../../../public/types/networkAPI.js";

const errorHandler = async (err:FastifyError, req: FastifyRequest)=> {
    Output.category("debug").print("notice",`[API][Auth] "${req.method}:${req.url}" request failed with "${err.statusCode}" code. Reason: "${err.message}".`,"webapi");

    return {
        status: "Failure",
        errCode: "InternalError",
        message: "Uncaughted Internal Server Error."
    }
}

const basicData: RouteOptions = {
    method: "GET",
    url: "/api/app/basic-user-data",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        const sessionID = req.cookies.session;

        let result: API.App.BasicData.TResponse = {
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
                }
            }
        }

        return result;
    },
    errorHandler
}

const navMenu: RouteOptions = {
    method: "GET",
    url: "/api/app/nav-menu-entries",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        const sessionID = req.cookies.session;

        let result: API.App.NavMenu.TResponse = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const auth = global.app.webAuthManager;

            let session = await auth.getSessionDetails(sessionID);

            if(session) {
                const entries = [
                    {displayName: "Home", linkDest: "/Home", imageName: "/ui/home.png", imageAlt: "Home tab link"},
                    {displayName: "Announcements", linkDest: "/Announcements", imageName: "/ui/announcement.png", imageAlt: "Announcement tab link"},
                    {displayName: "Schedule",linkDest: "/Schedule",imageName: "/ui/schedule.png",imageAlt: "Schedule tab link"},
                    {displayName: "My Statistics",linkDest: "/Statistics",imageName: "/ui/stats.png",imageAlt: "Statistics tab link"},
                    {displayName: "Resources",linkDest: "/Resources",imageName: "/ui/resources.png", imageAlt: "Resources tab link"},
                    {displayName: "Settings",linkDest: "/Settings",imageName: "/ui/settings.png",imageAlt: "Settings tab link"},
                    {displayName: "Feedback",linkDest: "/Feedback",imageName: "/ui/feedback.png",imageAlt: "Feedback tab link"},
                ];

                result = {
                    status: "Success",
                    data: entries
                }
            }
        }

        return result;
    },
    errorHandler
}

export default [
    basicData,
    navMenu
];