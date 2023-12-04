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


const getSettings: WebAPI.IRouteOptions<API.App.Statistics.GetSettings.IEndpoint> = {
    method: "GET",
    url: "/api/user/stats-settings",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.Statistics.GetSettings.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);

                const props = await global.app.userStatsManager.getHistoricUserData(session.userID, DateTime.now());
                const goal = await global.app.userStatsManager.getGoalOf(session.userID);

                if(props&&goal) {
                    res.status(200);

                    result = {
                        status: "Success",
                        data: {
                            maxMilestoneCount: goal.MAX_MILESTONE_COUNT,
                            goal: await goal?.getMilestones() ?? null,
                            wageRate: props.wage,
                            externalIncome: props.externalIncome
                        }
                    }
                }
            }
        }

        return result;
    },
    errorHandler
}

const putSettingsRequestSchema = yup.object().shape({
    props: yup.object().shape({
        wage: yup.number().required().moreThan(-1),
        externalIncome: yup.number().required().moreThan(-1)
    }).default(undefined),
    milestones: yup.array().of(yup.object().shape({
        ID: yup.number().required(),
        title: yup.string().required(),
        amount: yup.number().required().moreThan(-1)
    })).required(),
    removedIDList: yup.array().of(yup.number().moreThan(0).required()).required(),
    addedMilestonesCount: yup.number().required(),
    changedMilestonesCount: yup.number().required(),
    reorderedMilestones: yup.bool().required()
});

const putSettings: WebAPI.IRouteOptions<API.App.Statistics.PutSettings.IEndpoint> = {
    method: "PUT",
    url: "/api/user/stats-settings",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);

        const sessionID = req.cookies.session;

        let result: API.App.Statistics.PutSettings.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);

                let params: API.App.Statistics.PutSettings.IRequest;

                try {
                    params = await putSettingsRequestSchema.validate(req.body);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                if(params.props) {
                    await global.app.userStatsManager.setHistoricUserData(session.userID,DateTime.now(),{
                        wage: params.props.wage==0?null:params.props.wage,
                        externalIncome: params.props.externalIncome==0?null:params.props.externalIncome
                    });

                    await global.app.userStatsManager.dropCacheState(session.userID);
                }

                if(params.addedMilestonesCount > 0 || params.changedMilestonesCount > 0 || params.removedIDList.length > 0 || params.reorderedMilestones) {
                    
                    const goal = await global.app.userStatsManager.getGoalOf(session.userID);
                    let nextOrderTag = 0;

                    for (const milestone of params.milestones) {
                        if(milestone.ID < 0&&params.removedIDList.length==0) {
                            await goal?.addMilestone(milestone.title, milestone.amount, nextOrderTag);
                        }else {
                            await goal?.setMilestone(milestone.ID < 0?params.removedIDList.pop() as number:milestone.ID, milestone.title, milestone.amount, nextOrderTag);
                        }

                        nextOrderTag++;
                    }

                    for (const ID of params.removedIDList) {
                        await goal?.dropMilestone(ID);
                    }
                }
                

                res.status(200);

                result = {
                    status: "Success",
                    data: undefined
                }

            }
        }

        return result;
    },
    errorHandler
}


export default [
    getStatistics,
    getSettings,
    putSettings
];