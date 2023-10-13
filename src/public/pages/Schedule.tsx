import React, { useEffect, useState } from "react";
import {DateTime} from "luxon";
import classes from "./Schedule.css";
import subPageClasses from "./SubPages.css";
import commonClasses from "../components/common.css";

import ScheduleView from "../components/ScheduleView/ScheduleView";
import { API } from "../types/networkAPI";

import arrowImg from "../assets/ui/left-arrow-angle.png";

function parseDateTime(isoStr: string | undefined) {
    return DateTime.fromISO(isoStr ?? "");
}

export default function Schedule(){
    const [schedule, setSchedule] = useState<API.App.Schedule.GetSchedule.IResponseData | null>(null);

    const initialRangePoint = DateTime.fromISO(new URLSearchParams(window.location.search).get("withDay") ?? "");
    const hardLimit = DateTime.now().plus({weeks: 2}).startOf("week");

    const [rangePoint, setRangePoint] = useState<DateTime>(initialRangePoint.isValid&&initialRangePoint < hardLimit?initialRangePoint:DateTime.now());
    const [rangeSwitcherStates, setRangeSwitcherStates] = useState<boolean[]>([false,false]);

    function fetchSchedule(abortSignal?: AbortSignal) {
        return new Promise<boolean>(async res=>{
            const response = await fetch(`/api/app/schedule?withDay=${encodeURIComponent(rangePoint.toISO())}`, {signal: abortSignal});

            if(response.ok) {
                const result = await response.json() as API.App.Schedule.GetSchedule.TResponse;

                if(result.status=="Success")
                    setSchedule(result.data);
                else {
                    const elem = document.querySelector(`.${classes.ErrorMessageBox}`);
                    if(elem) elem.classList.add(classes.Shown);

                    res(false);
                }
            }

            res(true);
        });
    }

    async function seekSchedule(direction: -1 | 1 , targetButton?: HTMLButtonElement) {
        if(targetButton?.hasAttribute("disabled")) return;

        setRangeSwitcherStates([false,false]);
        setRangePoint(rangePoint.plus({days: direction * 7}))
        setSchedule(null);
    }

    useEffect(()=>{
        const aborter = new AbortController();

        new Promise<void>(async res=>{
            const result = await fetchSchedule(aborter.signal);
            if(rangePoint.startOf("day") > DateTime.now().startOf("day")) 
                setRangeSwitcherStates([true,false]);
            else if(result) setRangeSwitcherStates([true, true]);
            res();
        });

        return ()=>aborter.abort();
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