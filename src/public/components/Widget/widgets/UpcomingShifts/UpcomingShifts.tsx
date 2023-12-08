import React, { useContext, useEffect, useState } from "react";

import classes from "./UpcomingShifts.css";
import commonClasses from "../../../common.css";

import { API } from "../../../../types/networkAPI";
import { callAPI } from "../../../../modules/utils";
import { DateTime } from "luxon";
import { WidgetContext } from "../../WidgetBox";
import { useTranslation } from "react-i18next";

export default function UpcomingShiftsWidget() {
    const [shifts, setShifts] = useState<API.App.Statistics.IUserShifts | null>(null);
    const [widgetState, setWidgetState] = useContext(WidgetContext);

    const {t} = useTranslation("home", {keyPrefix: "upc-shts-widget"});
    const {t:tc} = useTranslation("common");

    function renderPanel(shift: API.App.Statistics.UserShifts.IWorkDay<"OnlyAssigned">, slotID: number) {
        const ownerSlot = shift.slots[slotID] as NonNullable<typeof shift.slots[0]>;
    
        let coWorkersStr = "";
        let coWorkersUnassignedCount = 0;
        const coWorkersCount = Object.keys(shift.slots).length - 1;
    
        if(coWorkersCount > 0) {
            for (const ID in shift.slots) {
                if(parseInt(ID)===slotID) continue;
    
                const slot = shift.slots[ID] as NonNullable<typeof shift.slots[0]>;
    
                if(slot.assignedShift) coWorkersStr+= slot.assignedShift.userName + ", "
                else coWorkersUnassignedCount++ ;
            }
    
            coWorkersStr = coWorkersStr.substring(0,coWorkersStr.length-2);
    
            if(coWorkersUnassignedCount!=0) {
                coWorkersStr +=` ${coWorkersUnassignedCount!=coWorkersCount?tc("and")+" ":""}${coWorkersUnassignedCount} ${tc("unassinged")}`;
            }
        }else coWorkersStr = tc("no-one-else");
    
        const startTime = DateTime.fromISO(ownerSlot.plannedStartTime);
        const endTime = ownerSlot.plannedEndTime?DateTime.fromISO(ownerSlot.plannedEndTime):null;
        const then = DateTime.fromISO(shift.date).startOf("day");
        const now = DateTime.now().startOf("day");
    
        let tag;
    
        switch(true) {
            case then.equals(now.plus({days: 1})): tag = tc("tommorow"); break;
            case then.equals(now): tag = tc("today"); break;
        }
    
        return (
            <li key={shift.ID}>
                <h5>{then.toFormat(then.month!=now.month?"EEEE, d/LL":"EEEE, d")} {tag?<span>{tag}</span>:""}</h5>
                <h6>{ownerSlot?.requiredRoleDisplayName} <span></span> {startTime.toFormat("HH:mm")} - {endTime?.toFormat("HH:mm") ?? "?"} <span></span> {coWorkersStr}</h6>
            </li>
        );
    }
    
    function renderShifts(shifts: API.App.Statistics.IUserShifts) {
        const result = [];
    
        for (let i=0; i < shifts.shifts.length; i++) {
            result.push(renderPanel(shifts.shifts[i], shifts.userSlots[i]));
        }
    
        return result;
    }
    
    function renderDummyContent() {
        const result = [];
    
        for(let i=0; i < 3; i++) {
            result.push(
                <li key={i}>
                    <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                    <h6 className={commonClasses.PulseLoadingAnimHolder}></h6>
                </li>
            )
        }
    
        return <ul className={classes.DummyContent}>{result}</ul>;
    }

    useEffect(()=>{
        return callAPI<API.App.Widgets.GetUpcomingShifts.IEndpoint>("GET","/api/widgets/upcoming-shifts",null,
            data=>{
                setShifts(data);
                setWidgetState("Ready");
            },
            ()=>setWidgetState("Unavailable"));
    }, []);

    return (
        <div className={classes.WidgetWrapper}>
            {
                shifts?
                    shifts.shifts.length > 0?
                        <ul>{renderShifts(shifts)}</ul>
                    :
                        <div className={classes.Message}>
                            <img src="/ilustrations/NoData.svg" alt="No data"/>
                            <h5>{t("no-shifts")}</h5>
                        </div>
                :
                    renderDummyContent()
            }
            
        </div>
    );
}