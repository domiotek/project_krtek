import { API } from "../../../public/types/networkAPI.js";
import { errorHandler } from "./common/error.js";
import * as yup from "yup";
import { DateTime } from "luxon";
import prepareWorkDayArrayResponse from "./common/responsePreps.js";
import { RequiredStringSchema } from "yup/lib/string.js";

const getScheduleRequestSchema = yup.object().shape({
    withDay: yup.string().required()
});

const getSchedule: WebAPI.IRouteOptions<API.App.Schedule.GetSchedule.IEndpoint> = {
    method: "GET",
    url: "/api/schedule/:withDay",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.GetSchedule.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                let params: API.App.Schedule.GetSchedule.IURLParams;
                res.status(400);

                try {
                    params = await getScheduleRequestSchema.validate(req.params);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDays = await global.app.scheduleManager.getWeek(DateTime.fromISO(params.withDay));

                if(workDays) {
                    res.status(200);
                    result = {
                        status: "Success",
                        data: {
                            rangeStart: workDays[0].date.toString(),
                            rangeEnd: workDays[workDays.length - 1].date.toString(),
                            workDays: await prepareWorkDayArrayResponse(workDays)
                        }
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}

const updateShiftRequestBodySchema = yup.object().shape({
    startTime: yup.string().required(),
    endTime: yup.string().required(),
    tip: yup.number().required().moreThan(-1),
    deduction: yup.number().required().moreThan(-1),
    note: yup.string(),
    sharedNote: yup.string()
});

const updateShiftURLParamsSchema = yup.object().shape({
    when: yup.string().required()
});

const updateShiftDetails: WebAPI.IRouteOptions<API.App.Schedule.UpdateShift.IEndpoint> = {
    method: "PUT",
    url: "/api/schedule/shift/:when",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.UpdateShift.IResponse = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);

                let data: API.App.Schedule.UpdateShift.IRequestData;
                let params: API.App.Schedule.UpdateShift.IURLParams;

                try {
                    data = await updateShiftRequestBodySchema.validate(req.body);
                    params = await updateShiftURLParamsSchema.validate(req.params);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDay = await global.app.scheduleManager.getWorkDay(DateTime.fromISO(params.when));

                if(workDay) {
                    const userSlot = await workDay.getUserSlot(session.userID);

                    if(userSlot) {
                        const startTime = DateTime.fromISO(data.startTime);
                        const endTime = DateTime.fromISO(data.endTime);

                        if(startTime.isValid&&endTime.isValid) {
                            await userSlot.assignedShift.updateData(startTime, endTime, data.tip, data.deduction, data.note);

                            if(data.sharedNote !== workDay.note) {
                                await workDay.setNote(data.sharedNote ?? null, session.userID);
                            }

                            await global.app.userStatsManager.dropCacheState(session.userID);
                            res.status(200);
                            result = {
                                status: "Success"
                            }
                        }else result.errCode = "InvalidTime";
                    }else {
                        res.status(404);
                        result.errCode = "NoSlot";
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}

const updateShiftNotesRequestSchema = yup.object().shape({
    note: yup.string(),
    sharedNote: yup.string()
});

const updateShiftNotes: WebAPI.IRouteOptions<API.App.Schedule.UpdateShiftNotes.IEndpoint> = {
    method: "PUT",
    url: "/api/schedule/shift/:when/notes",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.UpdateShiftNotes.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);
                let data: API.App.Schedule.UpdateShiftNotes.IRequest;
                let params: API.App.Schedule.UpdateShiftNotes.IURLParams;

                try {
                    data = await updateShiftNotesRequestSchema.validate(req.body);
                    params = await updateShiftURLParamsSchema.validate(req.params);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDay = await global.app.scheduleManager.getWorkDay(DateTime.fromISO(params.when));

                if(workDay) {
                    const userSlot = await workDay.getUserSlot(session.userID);

                    if(userSlot) {

                        await userSlot.assignedShift?.setNote(data.note ?? null);

                        if(data.sharedNote !== workDay.note) {
                            await workDay.setNote(data.sharedNote ?? null, session.userID);
                        }
                        
                        res.status(200);
                        result = {
                            status: "Success",
                            data: undefined
                        }
                    }else {
                        res.status(404);
                        result.errCode = "NoSlot";
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}


const updateShiftNoteRequestSchema = yup.object().shape({
    data: yup.string().required()
});

const updateShiftNoteURLParamsSchema = yup.object().shape({
    when: yup.string().required(),
    scope: yup.string().oneOf(["note", "personal-note"]).required() as RequiredStringSchema<"note" | "personal-note", Record<"note" | "personal-note", any>>
});


const updateNote: WebAPI.IRouteOptions<API.App.Schedule.UpdateShiftNote.IEndpoint> = {
    method: "PUT",
    url: "/api/schedule/shift/:when/:scope",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.UpdateShiftNote.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);
                let data: API.App.Schedule.UpdateShiftNote.IRequest;
                let params: API.App.Schedule.UpdateShiftNote.IURLParams;

                try {
                    data = await updateShiftNoteRequestSchema.validate(req.body);
                    params = await updateShiftNoteURLParamsSchema.validate(req.params);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDay = await global.app.scheduleManager.getWorkDay(DateTime.fromISO(params.when));

                if(workDay) {
                    let note = data.data==""?null:data.data;

                    if(params.scope=="note") {
                        workDay.setNote(note,session.userID);
                    }else {
                        const userSlot = await workDay.getUserSlot(session.userID);

                        if(userSlot) {
                            await userSlot.assignedShift?.setNote(note);
                        }else {
                            res.status(404);
                            result.errCode = "NoSlot";
                        }
                    }

                    res.status(200);
                    result = {
                        status: "Success",
                        data: undefined
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    }
}

const addShiftRequestSchema = yup.object().shape({
    when: yup.string().required(),
    startTime: yup.string().required(),
    endTime: yup.string().required(),
    role: yup.string().required()
});

const addShift: WebAPI.IRouteOptions<API.App.Schedule.AddShift.IEndpoint> = {
    method: "POST",
    url: "/api/schedule/shift",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.AddShift.IEndpoint["returnPacket"]= {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                res.status(400);
                let params: API.App.Schedule.AddShift.IRequest;

                try {
                    params = await addShiftRequestSchema.validate(req.body);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDay = await global.app.scheduleManager.getWorkDay(DateTime.fromISO(params.when));

                if(workDay) {
                    const then = workDay.date.startOf("day");
                    const now = DateTime.now().startOf("day");

                    if(then >= now.minus({days: 3}) && then <= now) {

                        const userSlot = await workDay.getUserSlot(session.userID);

                        if(!userSlot) {
                            const slotID = await workDay.addSlot(session.userID, params.role, DateTime.fromISO(params.startTime), DateTime.fromISO(params.endTime));

                            await workDay.assignUser(slotID, session.userID);

                            res.status(201);
                            result = {
                                status: "Success",
                                data: undefined
                            }

                        }else result.errCode = "SlotExists";
                    }else result.errCode = "NotAllowed";
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}

const getWorkDayRequestSchema = yup.object().shape({
    date: yup.string().required()
});

const getWorkDay: WebAPI.IRouteOptions<API.App.Schedule.GetWorkDay.IEndpoint> = {
    method: "GET",
    url: "/api/schedule/workday/:date",
    handler: async (req, res)=>{
        res.header("cache-control","private, no-cache");
        res.status(401);
        const sessionID = req.cookies.session;

        let result: API.App.Schedule.GetWorkDay.IEndpoint["returnPacket"] = {
            status: "Failure",
            errCode: "NotSignedIn"
        }

        if(sessionID) {
            const session = await global.app.webAuthManager.getSessionDetails(sessionID);

            if(session) {
                let params: API.App.Schedule.GetWorkDay.IRequest;
                res.status(400);

                try {
                    params = await getWorkDayRequestSchema.validate(req.params);
                } catch (error) {
                    result.status = "Failure";
                    result.errCode = "BadRequest";
                    result.message = (error as yup.ValidationError).message;
                    return result;
                }

                const workDay = await global.app.scheduleManager.getWorkDay(DateTime.fromISO(params.date));

                if(workDay) {
                    res.status(200);
                    const jsonWorkDay = await workDay.getJSON();

                    const limitedSlots: {[ID: string]: API.App.Schedule.GetWorkDay.IShiftSlot} = {};

                    let personalSlot: API.App.Schedule.GetWorkDay.IPersonalShiftSlot | undefined;

                    for (const slotID in jsonWorkDay.slots) {
                        const slot = jsonWorkDay.slots[slotID] as WebAPI.Schedule.WorkDayAPI.IJSONShiftSlot;

                        limitedSlots[slotID] = Object.assign({privateSlotID: parseInt(slotID)}, slot);

                        if(slot.assignedShift) {
                            if(slot.assignedShift.userID === session.userID) {
                                //@ts-expect-error Slot won't be in Unassigned state, so it's ok.
                                personalSlot = Object.assign({privateSlotID: parseInt(slotID)}, slot);
                                delete limitedSlots[slotID];
                                continue;
                            }

                            limitedSlots[slotID].assignedShift = {
                                startTime: slot.assignedShift.startTime,
                                endTime: slot.assignedShift.endTime,
                                userID: slot.assignedShift.userID,
                                userName: slot.assignedShift.userName
                            }
                        }
                    }

                    const userProps = await global.app.userStatsManager.getHistoricUserData(session.userID, DateTime.now());

                    result = {
                        status: "Success",
                        data: {
                            day: {
                                date: params.date,
                                note: workDay.note,
                                noteLastUpdater: jsonWorkDay.noteLastUpdater,
                                noteUpdateTime: jsonWorkDay.noteUpdateTime,
                                otherSlots: limitedSlots,
                                personalSlot: personalSlot ?? null
                            },
                            wageRate: userProps?.wage ?? null
                        }    
                    }
                }else result.errCode = "InvalidDate";
            }
        }

        return result;
    },
    errorHandler
}

export default [
    getSchedule,
    updateShiftDetails,
    updateShiftNotes,
    updateNote,
    addShift,
    getWorkDay
];