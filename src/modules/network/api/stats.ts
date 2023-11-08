import { RouteOptions } from "fastify";
import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";
import * as yup from "yup";
import { DateTime } from "luxon";

const getStatisticsURLParamsSchema = yup.object().shape({
    ofMonth: yup.string().required()
});


const getStatistics: WebAPI.IRouteOptions<API.App.Statistics.GetStatistics.IEndpoint> = {
    method: "GET",
    url: "/api/app/statistics/:ofMonth",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.Statistics.GetStatistics.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);
                let params: API.App.Statistics.GetStatistics.IURLParams;

                try {
                    params = await getStatisticsURLParamsSchema.validate(req.params)
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