import { DateTime } from "luxon";
import * as yup from "yup";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { APIError, getPrintableDataTable, initArrayOfArrays } from "../util.js";
import { describeAPIError, getCommandErrorDisplayText } from "./common/utils.js";
import { WebAuthManager } from "../network/webAuthManager.js";

export default function(){

    const command = new Command("schedule","Used to view and manage WebAPI schedule. ",[
        {
            name: "withDay",
            type: "date",
            desc: "Can be used to specify week to display. Current week will be displayed if omitted.",
            optional: true
        }
    ],false);

    command.mainHandler(async (request, data)=>{
        const dateParam = data.parameters["withDay"] as DateTime;

        const targetDate = dateParam?dateParam:DateTime.now();
        
        try {
            const scheduleResult = await global.app.scheduleManager.getWeek(targetDate);

            if(scheduleResult) {
                const dataTable = initArrayOfArrays<string>(7);

                for (let i=0; i < 7; i++) {
                    const day = scheduleResult[i];

                    dataTable[i].push(day.date.toFormat("cccc (dd/LL)"));

                    const slots = await day.getAllSlots();

                    for(const slotID in slots) {
                        const slot = slots[slotID] as NonNullable<typeof slots[number]>
                        let user, startTime, endTime;
                        if(slot.assignedShift) {
                            const userResult = await slot.assignedShift?.getUser();
                            user = userResult.name;
                            startTime = slot.assignedShift.startTime ?? slot.plannedStartTime;
                            endTime = slot.assignedShift.endTime;
                        }else {
                            user = "Unassigned";
                            startTime = slot.plannedStartTime;
                            endTime = slot.plannedEndTime;
                        }

                        dataTable[i].push(`${user} / ${startTime.toFormat("HH:mm")} - ${endTime?.toFormat("HH:mm") ?? "?"}`);
                    }

                    if(Object.keys(slots).length==0) {
                        dataTable[i].push("No shifts");
                    }
                }

                request.respond(getPrintableDataTable(dataTable));
            }
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch schedule", error.errCode, data.colorsMode));
        }
    });


    command.addSubCommand({
        name: "get",
        desc: "Displays details about given work day.",
        params: [
            {
                relation: "oneOf",
                parameters: [
                    {
                        name: "date",
                        desc: "Date of the target date.",
                        type: "date"
                    },
                    {
                        name: "today",
                        type: "literal",
                        desc: "Displays details of today."
                    }
                ]
                
            }
        ]
    }, async (req, data)=>{

        const date = data.parameters["date"] as DateTime | undefined;

        let day;
        try {
            day = await global.app.scheduleManager.getWorkDay(date ?? DateTime.now());
            if(!day) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't get details of the work day on: ${insertColor("fg_cyan",data.rawParameters["date"], data.colorsMode)}`, error, data.colorsMode));
            return;
        }

        req.respond("Work Day:\n========================================", false);
        req.respond(`ID: ${insertColor("fg_cyan",day.ID.toString(), data.colorsMode)}`, false);
        req.respond(`Date: ${insertColor("fg_cyan",day.date.toFormat("dd LLL yyyy"),data.colorsMode)}`,false);
        req.respond(`Note: ${insertColor("fg_cyan",day.note ?? "Not set",data.colorsMode)}`, false);
        req.respond(`Slots:`, false);

        let slots;
        try {
            slots = await day.getAllSlots();
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond("   Couldn't fetch slots.");
            return;
        }

        for (const slotID in slots) {
            const slot = slots[slotID] as NonNullable<typeof slots[number]>
            
            let user, startTime, endTime;
            if(slot.assignedShift) {
                let userResult;
                try {
                    userResult = await slot.assignedShift?.getUser();
                    user = userResult.name;
                } catch (error: any) {
                    if(!error.errCode) throw error;
                    user = insertColor("fg_yellow","Couldn't resolve", data.colorsMode);
                }

                startTime = slot.assignedShift.startTime ?? slot.plannedStartTime;
                endTime = slot.assignedShift.endTime;
            }else {
                user = "Unassigned";
                startTime = slot.plannedStartTime;
                endTime = slot.plannedEndTime;
            }

            req.respond(`\n   #${insertColor("fg_green",slotID, data.colorsMode)}`, false);
            req.respond(`   Status: ${insertColor("fg_cyan", slot.status,data.colorsMode)}`, false);
            req.respond(`   User: ${insertColor("fg_cyan", user, data.colorsMode)}`, false);
            req.respond(`   Start time: ${insertColor("fg_cyan", startTime.toFormat("HH:mm"), data.colorsMode)}`, false);
            req.respond(`   End time: ${insertColor("fg_cyan", endTime?.toFormat("HH:mm") ?? "Not set", data.colorsMode)}`, false);
        }
        req.respond(Object.keys(slots).length==0?"   No slots":"");
    });

    command.addSubCommand({ 
        name: "get-shifts",
        desc: "Displays all shifts of the specified user.",
        params: [
            {
                relation: "oneOf",
                parameters: [
                    {
                        name: "userID",
                        desc: "User's ID.",
                        type: "number"
                    },
                    {
                        name: "email",
                        desc: "User's email.",
                        type: "string"
                    }
                ]
            },
			{
				name: "--before",
				desc: "Filters shifts that were before given date.",
				type: "date",
				isNamedPair: true
			},
			{
				name: "--after",
				desc: "Filters shifts that were after given date.",
				type: "date",
				isNamedPair: true
			}
        ]
    }, async (req, data)=>{
        const emailParam = data.parameters["email"] as string | undefined;
        const userIDParam = data.parameters["userID"] as number | undefined;

		const beforeParam = data.switches["--before"] as DateTime;
		const afterParam = data.switches["--after"] as DateTime;

        let userID: number = -1;

        if(emailParam) {
            const user = await global.app.webAuthManager.getUser(emailParam);
            if(user) userID = user.userID;
        }else userID = userIDParam as number;


		function resolveSlotTime(slot: WebAPI.Schedule.WorkDayAPI.IShiftSlot) {
			let startTime, endTime;
			if(slot.assignedShift) {
				startTime = slot.assignedShift.startTime ?? slot.plannedStartTime;
				endTime = slot.assignedShift.endTime;
			}else {
				startTime = slot.plannedStartTime;
				endTime = slot.plannedEndTime;
			}

			return [startTime, endTime];
		}

        const fromOpts = beforeParam||afterParam? {before: beforeParam, after: afterParam}:undefined;
        
        let workDays;
        try {
            workDays = await global.app.scheduleManager.getUserShifts(userID, fromOpts);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't get shifts of the user identified by: ${insertColor("fg_cyan",userIDParam?.toString() ?? emailParam ?? "", data.colorsMode)}`,error.errCode, data.colorsMode));
            return;
        }

        req.respond(`Shifts of user #${userID}`, false);
        for (let i=0; i < workDays.shifts.length; i++) {
            const workDay = workDays.shifts[i];
            
            let thisSlot;
            try {
                thisSlot = await workDay.getSlot(workDays.userSlots[i]);
                if(!thisSlot) throw new APIError("ScheduleManager","InvalidSlot");
            } catch (error: any) {
                if(!error.errCode) throw error;
                req.respond(getCommandErrorDisplayText(`Couldn't get information about the workday with ID ${workDay.ID}`, error.errCode, data.colorsMode), false);
                continue;
            }

            const [startTime, endTime] = resolveSlotTime(thisSlot);

            req.respond(`\nWorkDay #${workDay.ID} on ${workDay.date.toFormat("cccc, dd LLL yyyy")}: `, false);
            req.respond(`   Status: ${thisSlot.status}`, false);
            req.respond(`   Start time: ${startTime?.toFormat("HH:mm")}`, false);
            req.respond(`   End time: ${endTime?.toFormat("HH:mm") ?? "?"}`, false);
            req.respond(`   Co-workers: `, false);


            let slots;

            try {
                slots = await workDay.getAllSlots();
            } catch (error: any) {
                if(!error.errCode) throw error;
                req.respond(`		Couldn't fetch`, false);
                continue;
            }

            for (const slotID in slots) {
                if(parseInt(slotID)==workDays.userSlots[i]) continue;
                const slot = slots[slotID] as NonNullable<typeof slots[number]>;
                const userRes = await slot.assignedShift?.getUser();
                const [startTime, endTime] = resolveSlotTime(slot);
                req.respond(`	${userRes?userRes.name:"Unassigned"} / ${slot.requiredRole} / ${startTime?.toFormat("HH:mm")} - ${endTime?.toFormat("HH:mm") ?? "?"}`, false);
            }

            if(Object.keys(slots).length - 1 == 0) {
                req.respond("	No data", false);
            }
        }
        req.respond(workDays.shifts.length==0?"No shifts found":"");
    });

    command.addSubCommand({
        name: "add-slot",
        desc: "Allows for adding new slot to the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "requiredRole",
                desc: "Role that the user has to have in order to be assigned to the shift slot.",
                type: "string"
            },
            {
                name: "startTime",
                desc: "Planned shift start time.",
                type: "time"
            },
            {
                name: "endTime",
                desc: "Planned shift end time. Can be omitted if unknown.",
                type: "time",
                optional: true
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }


        const role = data.parameters["requiredRole"] as string;
        const startTime = data.parameters["startTime"] as DateTime;
        const endTime = data.parameters["endTime"] as DateTime | undefined;

        try {
            await workDay.addSlot(WebAuthManager.SYSTEM_USER_ID,role,startTime, endTime);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't add slot", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "Slot has been added successully.", data.colorsMode));
    });
    
    command.addSubCommand({
        name: "set-slot",
        desc: "Allows for editing slot on the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "slotID",
                desc: "Target slot ID.",
                type: "number"
            },
            {
                name: "requiredRole",
                desc: "Role that the user has to have in order to be assigned to the shift slot.",
                type: "string"
            },
            {
                name: "startTime",
                desc: "Planned shift start time.",
                type: "time"
            },
            {
                name: "endTime",
                desc: "Planned shift end time. Can be omitted if unknown.",
                type: "time",
                optional: true
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        const slotID = data.parameters["slotID"] as number;
        const role = data.parameters["requiredRole"] as string;
        const startTime = data.parameters["startTime"] as DateTime;
        const endTime = data.parameters["endTime"] as DateTime | undefined;

        try {
            await workDay.editSlot(slotID,role,startTime, endTime);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't set slot", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "Slot has been set successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "delete-slot",
        desc: "Allows for deleting slot from the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "slotID",
                desc: "Target slot ID.",
                type: "number"
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        const slotID = data.parameters["slotID"] as number;

        try {
            if(!await workDay.deleteSlot(slotID))
                throw new APIError("ScheduleManager","InvalidSlot");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete slot", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "Slot has been deleted successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "delete-all",
        desc: "Allows for deleting all slots from the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        try {
            await workDay.deleteAllSlots();
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete slots", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "Slots have been deleted successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "assign-user",
        desc: "Allows for assigning user to the slot on the specified work day.",
        params: [
            {
                relation: "oneOf",
                parameters: [
                    {
                        name: "userID",
                        desc: "User's ID.",
                        type: "number"
                    },
                    {
                        name: "email",
                        desc: "User's email.",
                        type: "string"
                    }
                ]
            },
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "slotID",
                desc: "Target slot ID.",
                type: "number"
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        let userIDParam = data.parameters["userID"] as number | undefined;
        const email = data.parameters["email"] as string | undefined;
        const slotID = data.parameters["slotID"] as number;

        let userID;
        if(email) {
            const user = await global.app.webAuthManager.getUser(email);
            userID= user?.userID ?? -1;
        }else userID = userIDParam as number;

        try {
            await workDay.assignUser(slotID,userID);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't assign user to the requested slot", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "User has been assigned successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "unassign-user",
        desc: "Allows for unassigning user from the slot on the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "slotID",
                desc: "Target slot ID.",
                type: "number"
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        const slotID = data.parameters["slotID"] as number;

        try {
            if(!await workDay.unassignUser(slotID)) 
                throw new APIError("ScheduleManager","InvalidSlot");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't unassign user from the requested slot", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "User has been unassigned successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "unassign-all",
        desc: "Allows for unassigning users from all slots on the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        let slotIDs;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
            slotIDs = await workDay.getSlotIDs();
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }

        for (const slotID of slotIDs) {
            try {
                await workDay.unassignUser(slotID);
            } catch (error: any) {
                if(!error.errCode) throw error;
                req.respond(getCommandErrorDisplayText(`Couldn't unassign user from the #${insertColor("fg_cyan",slotID.toString(), data.colorsMode)} slot`, error.errCode, data.colorsMode));
                continue;
            }
            req.respond(insertColor("fg_green", `Successfully unassigned user from slot #${insertColor("fg_white",slotID.toString(),data.colorsMode)}${insertColor("fg_green",".",data.colorsMode)}`, data.colorsMode));
        }

        
    });
    
    command.addSubCommand({
        name: "update-shift",
        desc: "Allows for updating shift details of the user assigned to the slot on the specified work day.",
        params: [
            {
                name: "on",
                desc: "Target work day.",
                type: "date"
            },
            {
                name: "slotID",
                desc: "Target slot ID.",
                type: "number"
            },
            {
                name: "startTime",
                desc: "Shift's start time.",
                type: "time"
            },
            {
                name: "endTime",
                desc: "Shift's end time.",
                type: "time"
            },
            {
                name: "tip",
                desc: "Tip earned on the shift.",
                type: "number"
            },
            {
                name: "deduction",
                desc: "Total deductions from the shift wage earnings.",
                type: "number",
                optional: true
            }
        ]
    }, async (req, data)=>{
        const workDayDate = data.parameters["on"] as DateTime;

        let workDay;
        try {
            workDay = await global.app.scheduleManager.getWorkDay(workDayDate);
            if(!workDay) throw new APIError("ScheduleManager","InvalidDate");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't get access specified work day data", error.errCode, data.colorsMode));
            return;
        }
        const slotID = data.parameters["slotID"] as number;

        let slot;
        try {
            slot = await workDay.getSlot(slotID);
            if(!slot) throw new APIError("ScheduleManager","InvalidSlot");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't fetch data about specified slot", error.errCode, data.colorsMode));
            return;
        }

        if(!slot.assignedShift) {
            req.respond(insertColor("fg_red","Couldn't update shift data for the slot that doesn't have any user assigned.",data.colorsMode));
            return;
        }

        const startTime = data.parameters["startTime"] as DateTime;
        const endTime = data.parameters["endTime"] as DateTime;
        const tip = data.parameters["tip"] as number;
        const deduction = data.parameters["deduction"] as number;

        try {
            await slot.assignedShift.updateData(startTime, endTime, tip, deduction);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't update shift's data", error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", "Shift's data has been updated successully.", data.colorsMode));
    });

    command.addSubCommand({
        name: "import",
        desc: "Allows for importing schedule data from JSON input. Note that all existing work days that are included in import data will be overwritten.",
        params: [
            {
                name: "input",
                desc: "JSON formatted schedule data. Tip: for easy import use file hook feature (<<:/[file]). ",
                type: "string"
            }
        ]
    }, async (req, data)=>{

        const mapRules = <T,>(map: Record<string, unknown>, rule: T): Record<string, T> => {
            const keys = Object.keys(map);
    
            for (const key of keys) {
                if(key.search(/^\d{1,2}\/\d{1,2}\/\d{4}$/)==-1) 
                    throw new yup.ValidationError(`'${key}' is not a valid date string.`,key,undefined, "required");
            }
    
            return Object.keys(map).reduce((newMap, key) => ({...newMap, [key]: rule}), {});
        }
          
        const workDayInputSchema = yup.object().shape({
            note: yup.string().defined().nullable(),
            slots: yup.array().of(yup.object().shape({
                range: yup.string().required().matches(/^\d{1,2}:\d{1,2}-((\d{1,2}:\d{1,2})|(\?))$/),
                role: yup.string().required(),
                assign: yup.number().defined().nullable()
            })).required()
        });
          
        const schema = yup.lazy(map => yup.object(
            mapRules<typeof workDayInputSchema>(map, workDayInputSchema)
        ));

        const input = data.parameters["input"] as string;

        let inputData;
        try {
            inputData = JSON.parse(input);
        } catch (error) {
            req.respond(insertColor("fg_red",`Received input isn't valid JSON data. Received ${input}`, data.colorsMode));
            return;
        }

        let validatedInput;
        try {
            validatedInput = await schema.validate(inputData);
        } catch (error: any) {
            req.respond(insertColor("fg_red",`Given JSON input is not a valid schedule import data. Error: ${error.message}`,data.colorsMode));
            return;
        }
        

        for (const rootProp in validatedInput) {
            let dateInput: DateTime | null = null;

            let dateParts = rootProp.split("/");
            dateInput = DateTime.fromObject({
                day: parseInt(dateParts[0]),
                month: parseInt(dateParts[1]),
                year: parseInt(dateParts[2])
            });

            const workDayInput = validatedInput[rootProp];
            const workDay = await global.app.scheduleManager.getWorkDay(dateInput);

            if(!workDay) {
                req.respond(insertColor("fg_yellow",`Skipping import of '${rootProp}' workday. Invalid date.`, data.colorsMode), false);
                continue;
            }
            req.respond(insertColor("fg_cyan",`Importing '${rootProp}' work day. Found ${workDayInput.slots.length} slots.`, data.colorsMode), false);

            await workDay.setNote(workDayInput.note, WebAuthManager.SYSTEM_USER_ID);
            await workDay.deleteAllSlots();

            for (let i=0; i < workDayInput.slots.length; i++) {
                const slotInput = workDayInput.slots[i];
                const [starTimeStr, endTimeStr] = slotInput.range.split("-");
                
                const startTime = DateTime.fromISO(starTimeStr);
                const endTime = endTimeStr=="?"?null:DateTime.fromISO(endTimeStr);

                if(!startTime.isValid || (endTime!=null&&!endTime.isValid)) {
                    req.respond(insertColor("fg_yellow",`Skipping import of slot #${i}. Invalid boundary time.`, data.colorsMode), false);
                    continue;
                }

                let newSlotID;
                try {
                    newSlotID = await workDay.addSlot(WebAuthManager.SYSTEM_USER_ID,slotInput.role,startTime, endTime ?? undefined);
                } catch (error: any) {
                    if(!error.errCode) throw error;
                    req.respond(insertColor("fg_yellow",`Skipping import of slot #${i}. ${describeAPIError(error.errCode)}`, data.colorsMode), false);
                    continue;
                }

                try {
                    if(slotInput.assign!=null) await workDay.assignUser(newSlotID, slotInput.assign);
                } catch (error: any) {
                    if(!error.errCode) throw error;
                    req.respond(insertColor("fg_yellow",`Partial import of slot #${i}. Couldn't assign user. ${describeAPIError(error.errCode)}`, data.colorsMode), false);
                    continue;
                }
                req.respond(insertColor("fg_green", `Imported slot #${i}.`, data.colorsMode), false);
            }
        }

        req.respond(insertColor("fg_green", "Import complete.", data.colorsMode));
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageSchedule");
        },
    }, variant=>{
        variant.excludeSubCommand("get");
        variant.excludeSubCommand("get-shifts");
        variant.excludeSubCommand("add-slot");
        variant.excludeSubCommand("set-slot");
        variant.excludeSubCommand("delete-slot");
        variant.excludeSubCommand("delete-all");
        variant.excludeSubCommand("assign-user");
        variant.excludeSubCommand("unassign-user");
        variant.excludeSubCommand("unassign-all");
        variant.excludeSubCommand("update-shift");
        variant.excludeSubCommand("import");

    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewSchedule") && !checkRequirement("allowedAction","manageSchedule");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}