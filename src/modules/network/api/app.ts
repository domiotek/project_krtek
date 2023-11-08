import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";

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