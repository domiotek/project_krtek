import React, { useEffect, useState } from "react";
import {DateTime} from "luxon";
import classes from "./Schedule.css";
import subPageClasses from "./SubPages.css";
import commonClasses from "../components/common.css";

import ScheduleView from "../components/ScheduleView/ScheduleView";
import { API } from "../types/networkAPI";

import arrowImg from "../assets/ui/left-arrow-angle.png";
import { callAPI } from "../modules/utils";

function parseDateTime(isoStr: string | undefined) {
    return DateTime.fromISO(isoStr ?? "");
}

export default function Schedule(){
    const [schedule, setSchedule] = useState<API.App.CommonEntities.IWorkdays | null>(null);

    const initialRangePoint = DateTime.fromISO(new URLSearchParams(window.location.search).get("withDay") ?? "");
    const hardLimit = DateTime.now().plus({weeks: 2}).startOf("week");

    const [rangePoint, setRangePoint] = useState<DateTime>(initialRangePoint.isValid&&initialRangePoint < hardLimit?initialRangePoint:DateTime.now());
    const [rangeSwitcherStates, setRangeSwitcherStates] = useState<boolean[]>([false,false]);

    async function seekSchedule(direction: -1 | 1 , targetButton?: HTMLButtonElement) {
        if(targetButton?.hasAttribute("disabled")) return;

        setRangeSwitcherStates([false,false]);
        setRangePoint(rangePoint.plus({days: direction * 7}))
        setSchedule(null);
    }

    useEffect(()=>{
        const newBtnStates = rangePoint.startOf("day") > DateTime.now().startOf("day")?[true, false]:[true, true];

        return callAPI<API.App.Schedule.GetSchedule.IEndpoint>("GET","/api/schedule/:withDay", {withDay: rangePoint.toISODate()}, data=>{
            setSchedule(data);
            setRangeSwitcherStates(newBtnStates);
        }, ()=>{
            const elem = document.querySelector(`.${classes.ErrorMessageBox}`);
            if(elem) elem.classList.add(classes.Shown);

            setRangeSwitcherStates(newBtnStates);
        });
    }, [rangePoint]);

    return (
        <section className={subPageClasses.SubPage}>
            <div className={classes.ErrorMessageBox}>
                We had problems getting that content for you right now. Refresh to try again.
            </div>
            <div className={classes.RangeSwitcher}>
                <button type="button" onClick={ev=>seekSchedule(-1, ev.target as HTMLButtonElement)} disabled={rangeSwitcherStates[0]===false}>
                    <img src={arrowImg} alt="Previous week"/>    
                </button>
                <span className={schedule==null?`${commonClasses.PulseLoadingAnimHolder} ${classes.DateRangePlaceholder}`:classes.DateRange}>{schedule==null?
                    ""
                :
                   `${parseDateTime(schedule?.rangeStart).toFormat("dd/LL")} - ${parseDateTime(schedule?.rangeEnd).toFormat("dd/LL")}`
                }</span>
                <button type="button" onClick={ev=>seekSchedule(1, ev.target as HTMLButtonElement)} disabled={rangeSwitcherStates[1]===false}>
                    <img src={arrowImg} alt="Next week" />
                </button>
            </div>
            <ScheduleView workDays={schedule?.workDays ?? null}/>
        </section>
    );
}