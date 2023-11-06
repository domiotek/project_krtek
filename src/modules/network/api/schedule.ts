import { RouteOptions } from "fastify";
import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";
import * as yup from "yup";
import { DateTime } from "luxon";

const getScheduleRequestSchema = yup.object().shape({
    withDay: yup.string().required()
});


const getSchedule: RouteOptions = {
    method: "GET",
    url: "/api/app/schedule",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.GetSchedule.TResponse = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                let params: API.App.Schedule.GetSchedule.IRequest;

                try {
                    params = await getScheduleRequestSchema.validate(req.query)
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDays = await global.app.scheduleManager.getWeek(DateTime.fromISO(params.withDay));

                if(workDays) {
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

                        const dayData: API.App.Schedule.GetSchedule.IResponseData["workDays"][number] = {
                            ID: day.ID,
                            date: day.date.toString(),
                            slots: []
                        }

                        for (const slotID in slots) {
                            const slot = slots[slotID] as WebAPI.Schedule.WorkDayAPI.IShiftSlot;

                            const role = await global.app.webAuthManager.getRoleDisplayName(slot.requiredRole);

                            let user, startTime, endTime;
                            if(slot.assignedShift) {
                                let userResult;
                                try {
                                    userResult = await slot.assignedShift?.getUser();
                                    user = userResult;
                                } catch (error: any) {
                                    if(!error.errCode) throw error;
                                }

                                startTime = slot.assignedShift.startTime ?? slot.plannedStartTime;
                                endTime = slot.assignedShift.endTime;
                            }else {
                                startTime = slot.plannedStartTime;
                                endTime = slot.plannedEndTime;
                            }
                            dayData.slots.push({
                                ID: parseInt(slotID),
                                requiredRole: role ?? "Invalid Role",
                                employeeName: user?.name ?? null,
                                startTime: startTime.toString(),
                                endTime: endTime?.toString() ?? null
                            });
                        }
                        result.data.workDays.push(dayData);
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}

export default [
    getSchedule
];