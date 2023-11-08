import React, { useEffect, useState, CSSProperties } from "react";
import {DateTime} from "luxon";
import classes from "./Statistics.css";
import subPageClasses from "./SubPages.css";

import { API, WebApp } from "../types/networkAPI";

import arrowImg from "../assets/ui/left-arrow-angle.png";
import StatsDashboard from "../components/StatisticsDashboard/Dashboard";
import TabsSwitcher from "../components/TabsSwitcher/TabsSwitcher";
import ShiftsTab from "../components/StatisticsDashboard/Tabs/Shifts/Shifts";
import { useOutletContext } from "react-router-dom";
import { callAPI } from "../modules/utils";

export default function Statistics() {
    const [statistics, setStatistics] = useState<API.App.Statistics.GetStatistics.IResponseData | null>(null);

    const initialRangePoint = DateTime.fromISO(new URLSearchParams(window.location.search).get("fromMonth") ?? "");
    const hardLimit = DateTime.now().startOf("month");

    const [rangePoint, setRangePoint] = useState<DateTime>(initialRangePoint.isValid&&initialRangePoint < hardLimit?initialRangePoint:DateTime.now());
    const [rangeSwitcherStates, setRangeSwitcherStates] = useState<boolean[]>([false,false]);

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    async function seekStatistics(direction: -1 | 0 | 1 , targetButton?: HTMLButtonElement) {
        if(targetButton?.hasAttribute("disabled")) return;

        setRangeSwitcherStates([false,false]);
        setRangePoint(rangePoint.plus({months: direction * 1}))
        setStatistics(null);
    }

    function reloadStatistics() {
        setStatistics(null);
        seekStatistics(0);
    }

    useEffect(()=>{
        const newBtnStates = rangePoint.startOf("month").equals(DateTime.now().startOf("month"))?[true, false]:[true, true];

        return callAPI<API.App.Statistics.GetStatistics.IEndpoint>("GET","/api/app/statistics/:ofMonth",{ofMonth: encodeURIComponent(rangePoint.toISODate())},data=>{
            setStatistics(data);
            setRangeSwitcherStates(newBtnStates);
        }, ()=>{
            const elem = document.querySelector(`.${classes.ErrorMessageBox}`);
            if(elem) elem.classList.add(classes.Shown);
            setRangeSwitcherStates(newBtnStates);
        });
    }, [rangePoint]);

    return (
        <section className={subPageClasses.SubPage}>
             <div className={classes.MonthSwitcher}>
                <button type="button" onClick={ev=>seekStatistics(-1, ev.target as HTMLButtonElement)} disabled={rangeSwitcherStates[0]===false}>
                    <img src={arrowImg} alt="Previous month"/>    
                </button>
                <span>{rangePoint.toFormat("LLLL yyyy")}</span>
                <button type="button" onClick={ev=>seekStatistics(1, ev.target as HTMLButtonElement)} disabled={rangeSwitcherStates[1]===false}>
                    <img src={arrowImg} alt="Next month" />
                </button>
            </div>
            
            <StatsDashboard data={statistics} month={rangePoint.startOf("month")}/>

            <div className={classes.TabsWrapper}>
                <TabsSwitcher 
                    tabs={[
                        {ID: "shifts", displayName: "Your shifts"}, 
                        {ID: "stats", displayName: "Stats for nerds"}, 
                        {ID: "settings", displayName: "Settings"}
                    ]
                }>
                    <ShiftsTab shiftsData={statistics?.shifts ?? null} wage={statistics?.stats.wagePerHour ?? null} setModalContent={setModalContent} reloadStats={reloadStatistics} />
                    <div>
                        Stats
                    </div>
                    <div>
                        Settings
                    </div>
                </TabsSwitcher>
            </div>
        </section>
    );
}