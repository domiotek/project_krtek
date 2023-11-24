import React from "react";

import classes from "./ScheduleView.css";
import commonClasses from "../common.css";

import { API } from "../../types/networkAPI";
import { DateTime } from "luxon";

interface IProps {
    data: API.App.CommonEntities.IWorkdays["workDays"][number] | null
    weekDayName: string
    numOfPlaceholderSlots: number
}

export default function ScheduleDayView(props: IProps) {
    const date = DateTime.fromISO(props.data?.date ?? "");

    const usePlaceholders = props.data==null;
    

    function renderSlot(slot: NonNullable<IProps["data"]>["slots"][number]) {
        return (<li key={slot.ID} className={`${classes.SlotPanel} ${slot.employeeName==null?classes.Unassigned:""}`}>
            <h5>{slot.requiredRole} {DateTime.fromISO(slot.startTime).toFormat("HH:mm")} - {slot.endTime?DateTime.fromISO(slot.endTime).toFormat("HH:mm"):"?"}</h5> 
            <h3>{slot.employeeName ?? "Unassigned"}</h3>
        </li>);
    }

    const isCurrentDay = date.startOf("day").equals(DateTime.now().startOf("day"));

    return (
        <div className={`${classes.DayView} ${isCurrentDay?classes.CurrentDay:""}`}>
            <h2>{props.weekDayName}</h2>
            <h4>{usePlaceholders?"":date.toFormat("dd LLLL")} 
                {usePlaceholders?
                    <span className={`${commonClasses.PulseLoadingAnimHolder} ${classes.DatePlaceholder}`}></span>
                :
                    (isCurrentDay?<span className={classes.Tag}>Today</span>:"")
                }
            </h4>
            <ul>
                {usePlaceholders?
                    <li className={classes.SlotPlaceholders}>
                        {new Array(props.numOfPlaceholderSlots).fill(0).map((v,i)=><span key={i} className={commonClasses.PulseLoadingAnimHolder}></span>)}
                    </li>
                :
                    (props.data?.slots.length ?? 0 >0?
                        props.data?.slots.map(slot=>renderSlot(slot))
                    :
                        <li className={classes.NoShiftsText}>No shifts</li>
                    )
                } 
            </ul>
        </div>
    );
}