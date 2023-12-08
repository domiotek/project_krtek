import React from "react";

import classes from "./ScheduleView.css";
import ScheduleDayView from "./ScheduleDayView";
import { API } from "../../types/networkAPI";
import { Info } from "luxon";

interface IProps {
    workDays: API.App.CommonEntities.IWorkdays["workDays"] | null
}

export default function ScheduleView(props: IProps) {
    const workDays = props.workDays ?? [];
    const weekDays = Info.weekdays();
    
    return (
        <div className={classes.ScheduleView}>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName={weekDays[0]} data={workDays[0] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={1} weekDayName={weekDays[1]} data={workDays[1] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={3} weekDayName={weekDays[2]} data={workDays[2] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName={weekDays[3]} data={workDays[3] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={1} weekDayName={weekDays[4]} data={workDays[4] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={3} weekDayName={weekDays[5]} data={workDays[5] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName={weekDays[6]} data={workDays[6] ?? null}/>
        </div>
    );
}