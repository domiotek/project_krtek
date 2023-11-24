import React from "react";

import classes from "./ScheduleView.css";
import ScheduleDayView from "./ScheduleDayView";
import { API } from "../../types/networkAPI";

interface IProps {
    workDays: API.App.CommonEntities.IWorkdays["workDays"] | null
}

export default function ScheduleView(props: IProps) {
    const workDays = props.workDays ?? [];
    return (
        <div className={classes.ScheduleView}>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName="Monday" data={workDays[0] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={1} weekDayName="Tuesday" data={workDays[1] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={3} weekDayName="Wednesday" data={workDays[2] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName="Thursday" data={workDays[3] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={1} weekDayName="Friday" data={workDays[4] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={3} weekDayName="Saturday" data={workDays[5] ?? null}/>
            <ScheduleDayView numOfPlaceholderSlots={2} weekDayName="Sunday" data={workDays[6] ?? null}/>
        </div>
    );
}