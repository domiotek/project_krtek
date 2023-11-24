import { DateTime } from "luxon";
import { API } from "../../../public/types/networkAPI";
import { errorHandler } from "./common/error.js";
import prepareWorkDayArrayResponse from "./common/responsePreps.js";

const getUpcomingShifts: WebAPI.IRouteOptions<API.App.Widgets.GetUpcomingShifts.IEndpoint> = {
    method: "GET",
    url: "/api/widgets/upcoming-shifts",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.Widgets.GetUpcomingShifts.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {

                const shifts = await global.app.scheduleManager.getUserShifts(session.userID, {after: DateTime.now().minus({days: 1})},3);

                if(shifts) {
                    res.status(200);
                    
                    result = {
                        status: "Success",
                        data: await shifts.getJSON() as API.App.Statistics.IUserShifts
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}

const getEarnings: WebAPI.IRouteOptions<API.App.Widgets.GetEarnings.IEndpoint> = {
    method: "GET",
    url: "/api/widgets/earnings",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.Widgets.GetEarnings.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {

                const goal = await global.app.userStatsManager.getGoalOf(session.userID);

                if(goal) {
                    res.status(200);
                    
                    result = {
                        status: "Success",
                        data: {
                            setGoal: await goal.getTotalAmount(),
                            totalEarnings: await goal.getCurrentProgress()
                        }
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}

const getCurrentSchedule: WebAPI.IRouteOptions<API.App.Widgets.CurrentSchedule.IEndpoint> = {
    method: "GET",
    url: "/api/widgets/current-schedule",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Widgets.CurrentSchedule.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                const from = DateTime.now().minus({days: 3});
                const to = DateTime.now().plus({days: 3});

                const workDays = await global.app.scheduleManager.getWorkDays(from, to);

                res.status(200);
                result = {
                    status: "Success",
                    data: {
                        rangeStart: from.toISODate(),
                        rangeEnd: to.toISODate(),
                        workDays: await prepareWorkDayArrayResponse(workDays ?? [])
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}


export default [
    getUpcomingShifts,
    getEarnings,
    getCurrentSchedule
]