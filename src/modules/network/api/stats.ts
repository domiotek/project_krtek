import { FastifyError, FastifyRequest, RouteOptions } from "fastify";
import Output from "../../output.js";
import { API } from "../../../public/types/networkAPI.js";
import * as yup from "yup";
import { DateTime } from "luxon";

const errorHandler = async (err:FastifyError, req: FastifyRequest)=> {
    Output.category("debug").print("notice",`[API][Stats] "${req.method}:${req.url}" request failed with "${err.statusCode}" code. Reason: "${err.message}".`,"webapi");

    return {
        status: "Failure",
        errCode: "InternalError",
        message: "Uncaughted Internal Server Error."
    }
}

const getScheduleRequestSchema = yup.object().shape({
    fromMonth: yup.string()
});


const getStatistics: RouteOptions = {
    method: "GET",
    url: "/api/app/statistics",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        const sessionID = req.cookies.session;

        let result: API.App.Statistics.GetStatistics.TResponse = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                let params: API.App.Statistics.GetStatistics.IRequest;

                try {
                    params = await getScheduleRequestSchema.validate(req.query)
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const stats = await global.app.userStatsManager.getStatsOf(session.userID, params.fromMonth?DateTime.fromISO(params.fromMonth):DateTime.now());
                const goal = await global.app.userStatsManager.getGoalOf(session.userID);

                if(stats&&goal) {
                    result = {
                        status: "Success",
                        data: {
                            stats: stats,
                            goal: await goal.getMilestones()
                        }
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}

export default [
    getStatistics
];