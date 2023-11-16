import React, { useEffect, useState } from "react";


import classes from "./NerdStats.css"
import { render2FloatingPoint, renderDate } from "../../../../modules/utils";
import { API } from "../../../../types/networkAPI";
import { DateTime } from "luxon";


interface IProps {
    data: {
        shifts: API.App.Statistics.IParsedUserShifts
        totalEarnings: number
        totalHours: number
    } | null

    finishedShiftsCount: number
}

interface IStatsData {
    maxTip: number,
    maxTipDate: DateTime,
    minTip: number,
    minTipDate: DateTime,
    avgTip: number,
    actMontlyWage: number,
    avgDailyWage: number
}

export default function NerdStatsTab(props: IProps) {
    const [stats, setStats] = useState<IStatsData | null>(null);

    const placeholderClassState = !props.data||props.finishedShiftsCount<3?classes.Placeholder:"";
    const placeholderText = props.data?"Work some more":"Working on it..."

    useEffect(()=>{
        const stats: IStatsData = {
            maxTip: -1,
            maxTipDate: DateTime.invalid("Init value"),
            minTip: Infinity,
            minTipDate: DateTime.invalid("Init value"),
            avgTip: 0,
            actMontlyWage: 0,
            avgDailyWage: 0
        }

        if(props.data&&props.finishedShiftsCount>2) {
            let sum = 0;
            let wageSum = 0;
            const days= props.data.shifts.shifts;

            for (let i=0; i<days.length; i++) {
                const day = days[i];
                const calcStats = props.data.shifts.calcStats[i];
                const slot = day.slots[props.data.shifts.userSlots[i]] as NonNullable<typeof day.slots[0]>
                const tip = slot.assignedShift.tip;

                if(tip!==null) {
                    sum += tip;
                    
                    if(tip > stats.maxTip) {
                        stats.maxTip = tip;
                        stats.maxTipDate = DateTime.fromISO(day.date);
                    }

                    if(tip < stats.minTip) {
                        stats.minTip = tip;
                        stats.minTipDate = DateTime.fromISO(day.date);
                    }
                }

                wageSum += calcStats.realWageRate;
                
            }
            stats.actMontlyWage = props.data.totalEarnings / props.data.totalHours;
            stats.avgTip = sum / props.finishedShiftsCount;
            stats.avgDailyWage = wageSum / props.finishedShiftsCount;
            setStats(stats);
        }else setStats(null);
        
    }, [props.data]);
    
    return (
        <div className={classes.NerdStatsWrapper}>
            <div className={classes.Section}>
                <h3>Tip</h3>
                <ul className={`${classes.PropList} ${placeholderClassState}`} data-text={placeholderText}>
                    <li>
                        <h4>{render2FloatingPoint(stats?.maxTip ?? 320)}zł</h4>
                        <h6>Maximum <span className={classes.Bullet}></span> {renderDate(stats?.maxTipDate, "nice, but not true")}</h6>
                    </li>
                    <li>
                        <h4>{render2FloatingPoint(stats?.minTip ?? 4)}zł</h4>
                        <h6>Minimum <span className={classes.Bullet}></span> {renderDate(stats?.minTipDate, "yikes")}</h6>
                    </li>
                    <li>
                        <h4>{render2FloatingPoint(stats?.avgTip ?? 124)}zł</h4>
                        <h6>Average</h6>
                    </li>
                </ul>
            </div>
            <div className={classes.Section}>
                <h3>Wage</h3>
                <ul className={`${classes.PropList} ${placeholderClassState}`} data-text={placeholderText}>
                    <li>
                        <h4>{render2FloatingPoint(stats?.actMontlyWage ?? 25)}zł/h</h4>
                        <h6>Actual monthly wage</h6>
                    </li>
                    <li>
                        <h4>{render2FloatingPoint(stats?.avgDailyWage ?? 23)}zł/h</h4>
                        <h6>Average daily wage</h6>
                    </li>
                </ul>
            </div>
            <div className={`${classes.Section} ${classes.FuturePlansWrapper}`}>
                <h3>And even more statistics...</h3>
                <div className={classes.FuturePlans}>
                    <img src="/ilustrations/DesigningProcess.svg" alt="Designing"></img>
                    <h4>...in the future!</h4>
                    <p>
                        There is a lot of stuff planned, like statistics based on the day of the week, summary of shifts worked with certain people and more. 
                        If you have any interesting idea, let me know.
                    </p>
                </div>
            </div>
        </div>
    );
}