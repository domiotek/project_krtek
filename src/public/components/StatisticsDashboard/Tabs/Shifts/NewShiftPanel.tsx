import { DateTime } from "luxon";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { API } from "../../../../types/networkAPI";

import classes from "./Shifts.css";
import { render2FloatingPoint, renderTime } from "../../../../modules/utils";


interface IProps {
    workDay: API.App.Statistics.UserShifts.IWorkDay<"OnlyAssigned">
    userSlot: number
    calcStats: API.App.Statistics.ICalculatedShiftData
    wage: number
    showNewModal: ()=>void
}

export default function NewShiftPanel(props: IProps)  {
    const {t} = useTranslation("statistics", {keyPrefix: "shifts-tab"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    const day = props.workDay;
    const ownerSlot = day.slots[props.userSlot] as NonNullable<typeof day.slots[0]>;

    const coWorkersStr = useMemo(()=>{
        let coWorkersStr = "";
        let coWorkersUnassignedCount = 0;
        const coWorkersCount = Object.keys(day.slots).length - 1;
        
        if(coWorkersCount > 0) {
            for (const ID in day.slots) {
                if(parseInt(ID)===props.userSlot) continue;
                const slot = day.slots[ID] as NonNullable<typeof day.slots[0]>;

                if(slot.assignedShift) {
                    coWorkersStr+= slot.assignedShift.userName + ", "
                }else coWorkersUnassignedCount++;
            }

            coWorkersStr = coWorkersStr.substring(0,coWorkersStr.length-2);

            if(coWorkersUnassignedCount!=0) {
                coWorkersStr +=` ${coWorkersUnassignedCount!=coWorkersCount?tc("and")+" ":""}${coWorkersUnassignedCount} ${tc("unassigned-count", {count: coWorkersUnassignedCount})}`;
            }
        }else coWorkersStr = tc("no-one-else");

        return coWorkersStr;
    },[]);

    return (
        <div key={day.ID} className={classes.NewShiftPanel} onClick={props.showNewModal}>
            <div className={classes.LeftPanel}>
                <h2>{DateTime.fromISO(day.date).toFormat("EEEE, d")}</h2>
                <h5>{tg(`roles.${ownerSlot.requiredRole}`)} <span className={classes.InlineBullet}></span> {coWorkersStr}</h5>
            </div>
            <div className={classes.RightPanel}>
                {
                    ownerSlot?.status=="Assigned"||ownerSlot?.status=="Pending"?
                        <div className={classes.UnfinishedShiftView}>
                            <h4>
                                {ownerSlot.status=="Assigned"?tg("shift-states.assigned"):tg("shift-states.pending")}
                            </h4>
                            <h6>
                                {ownerSlot.status=="Assigned"?
                                    props.calcStats.endTime?
                                        `${renderTime(props.calcStats.startTime)} - ${renderTime(props.calcStats.endTime)}`
                                    :
                                        `${tg('date-from', {date: renderTime(props.calcStats.startTime)})}`
                                :
                                    t("requires-action")}
                            </h6>
                        </div>
                    :
                        <div className={classes.FinishedShiftView}>
                                <h4>{renderTime(props.calcStats.startTime)} - {renderTime(props.calcStats.endTime)} ({props.calcStats.duration}h)</h4>
                                <h2>{props.wage?`+ ${render2FloatingPoint(props.calcStats.totalEarnings)}zł`:tg("shift-states.finished")}</h2>
                        </div>
                }
            </div>
        </div>
    );
}