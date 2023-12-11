import { API } from "../../../../public/types/networkAPI";

export default async function prepareWorkDayArrayResponse(workDays: WebAPI.Schedule.IWorkDay[]) {

    const results: API.App.CommonEntities.IWorkdays["workDays"] = [];

    for (const day of workDays) {
        const slots = await day.getAllSlots();

        const dayData: typeof results[number] = {
            ID: day.ID,
            date: day.date.toString(),
            slots: []
        }

        for (const slotID in slots) {
            const slot = slots[slotID] as WebAPI.Schedule.WorkDayAPI.IShiftSlot;

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
                requiredRole: slot.requiredRole,
                employeeName: user?.name ?? null,
                startTime: startTime.toString(),
                endTime: endTime?.toString() ?? null
            });
        }

        results.push(dayData);
    }

    return results;
}