import { FastifyError, FastifyRequest, RouteOptions } from "fastify";
import Output from "../../output.js";
import { API } from "../../../public/types/networkAPI.js";
import * as yup from "yup";
import { DateTime } from "luxon";

const errorHandler = async (err:FastifyError, req: FastifyRequest)=> {
    Output.category("debug").print("notice",`[API][Auth] "${req.method}:${req.url}" request failed with "${err.statusCode}" code. Reason: "${err.message}".`,"webapi");

    return {
        status: "Failure",
        errCode: "InternalError",
        message: "Uncaughted Internal Server Error."
    }
}

const getScheduleRequestSchema = yup.object().shape({
    withDay: yup.string().required()
});


const getSchedule: RouteOptions = {
    method: "GET",
    url: "/api/app/schedule",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        const session = req.cookies.session;

        let result: API.App.Schedule.GetSchedule.TResponse = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(session) {
            const sessionValidity = await global.app.webAuthManager.getSessionDetails(session);

            if(sessionValidity.result=="Success") {

                let params: API.App.Schedule.GetSchedule.IRequest;

                try {
                    params = await getScheduleRequestSchema.validate(req.query)
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const scheduleResponse = await global.app.scheduleManager.getWeek(DateTime.fromISO(params.withDay));

                if(scheduleResponse.result=="Success") {
                    const workDays = scheduleResponse.data;
                    result = {
                        status: "Success",
                        data: {
                            rangeStart: workDays[0].date.toString(),
                            rangeEnd: workDays[workDays.length - 1].date.toString(),
                            workDays: []
                        }
                    }

                    for (const day of workDays) {
                        const slots = await day.getAllSlots();

                        if(slots.result!="Success") {
                            result = {status: "Failure", errCode: "InternalError"}
                            return result;
                        }

                        const dayData: API.App.Schedule.GetSchedule.IResponseData["workDays"][number] = {
                            ID: day.ID,
                            date: day.date.toString(),
                            slots: []
                        }

                        for (const slotID in slots.data) {
                            const slot = slots.data[slotID] as WebAPI.Schedule.WorkDayAPI.IShiftSlot;

                            const user = await slot.assignedShift?.getUser();
                            const role = await global.app.webAuthManager.getRoleDisplayName(slot.requiredRole);
                            dayData.slots.push({
                                ID: parseInt(slotID),
                                requiredRole: role.result=="Success"?role.data:"Invalid Role",
                                employeeName: (user&&user.result=="Success")?user.data.name:null,
                                startTime: slot.plannedStartTime.toString(),
                                endTime: slot.plannedEndTime?.toString() ?? null
                            });
                        }

                        result.data.workDays.push(dayData);
                    }
                }else result.errCode = scheduleResponse.result;

            }else if(sessionValidity.result!="InvalidSession") result.errCode = sessionValidity.result;
        }

        return result;
    },
    errorHandler
}

export default [
    getSchedule
];