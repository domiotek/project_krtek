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

                const date = DateTime.fromISO(params.ofMonth).startOf("month");

                const stats = await global.app.userStatsManager.getStatsOf(session.userID, date);
                const shifts = await global.app.scheduleManager.getUserShifts(session.userID,{before: date.plus({months: 1}).minus({days: 1}), after: date});
                let goal = null;
                let historicGoalAmount = undefined;

                if(date.equals(DateTime.now().startOf("month"))) {
                    goal = await global.app.userStatsManager.getGoalOf(session.userID);
                }else {
                    const props = await global.app.userStatsManager.getHistoricUserData(session.userID,date);
                    historicGoalAmount = props?.goalAmount ?? null;
                }

                if(stats&&shifts) {
                    res.status(200);

                    result = {
                        status: "Success",
                        data: {
                            stats: Object.assign(stats,{totalEarnings: stats.totalWage?stats.totalWage + stats.totalTip + (stats.externalIncome ?? 0) - stats.totalDeduction:0}),
                            goal: await goal?.getMilestones() ?? null,
                            shifts: await shifts.getJSON() as API.App.Statistics.IUserShifts,
                            historicGoal: historicGoalAmount
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