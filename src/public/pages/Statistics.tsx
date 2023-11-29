import React, { useEffect, useState, Suspense, createRef } from "react";
import {DateTime} from "luxon";
import classes from "./Statistics.css";
import subPageClasses from "./SubPages.css";

import { API, WebApp } from "../types/networkAPI";

import arrowImg from "../assets/ui/left-arrow-angle.png";
import StatsDashboard from "../components/StatisticsDashboard/Dashboard";
import TabsSwitcher from "../components/TabsSwitcher/TabsSwitcher";
import ShiftsTab from "../components/StatisticsDashboard/Tabs/Shifts/Shifts";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { callAPI } from "../modules/utils";
import SuspenseLoader from "./Loader";

const NerdStatsTab = React.lazy(()=>import(/* webpackChunkName: "s_nrdst" */"../components/StatisticsDashboard/Tabs/NerdStats/NerdStats"));
const SettingsTab = React.lazy(()=>import(/* webpackChunkName: "s_sett" */"../components/StatisticsDashboard/Tabs/Settings/Settings"));

function calculateShiftData(slot: API.App.Statistics.UserShifts.IAssignedShiftSlot, wage: number) {

    let startTimeStr = slot.plannedStartTime;
    let endTimeStr = slot.plannedEndTime;

    if(slot.assignedShift.startTime&&slot.assignedShift.endTime) {
        startTimeStr = slot.assignedShift.startTime;
        endTimeStr = slot.assignedShift.endTime;
    }

    const startTime = DateTime.fromISO(startTimeStr);
    const endTime = endTimeStr?DateTime.fromISO(endTimeStr):null;

    const earningsData: API.App.Statistics.ICalculatedShiftData = {
        duration: 0,
        wageEarnings: 0,
        tip: 0,
        deduction: 0,
        totalEarnings: 0,
        realWageRate: 0,
        startTime,
        endTime
    }

    if(endTime) {
        earningsData.duration = endTime.diff(startTime,["hours"]).hours;
        earningsData.duration = earningsData.duration < 0?24 + earningsData.duration:earningsData.duration;
        earningsData.wageEarnings = earningsData.duration * wage;
        earningsData.tip = slot.assignedShift.tip ?? 0;
        earningsData.deduction = slot.assignedShift.deduction ?? 0;
        earningsData.totalEarnings = earningsData.wageEarnings + earningsData.tip - earningsData.deduction;
        earningsData.realWageRate = earningsData.duration!=0?earningsData.totalEarnings / earningsData.duration:0;
    }

    return earningsData;
}

export default function Statistics() {
    const [statistics, setStatistics] = useState<API.App.Statistics.GetStatistics.IParsedStats | null>(null);
    const [roles, setRoles] = useState<API.App.GetRoles.IRoleDetails[] | null>(null);

    const initialRangePoint = DateTime.fromISO(new URLSearchParams(window.location.search).get("fromMonth") ?? "");
    const hardLimit = DateTime.now().startOf("month");

    const [rangePoint, setRangePoint] = useState<DateTime>(initialRangePoint.isValid&&initialRangePoint < hardLimit?initialRangePoint:DateTime.now());
    const [rangeSwitcherStates, setRangeSwitcherStates] = useState<boolean[]>([false,false]);

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    const {tab: startingTabID} = useParams();
    const navigate = useNavigate()

    const tabsWrapperRef = createRef<HTMLDivElement>();

    useEffect(()=>{
        if(startingTabID!=undefined) 
            tabsWrapperRef.current?.scrollIntoView({behavior: "smooth"});
    },[]);

    useEffect(()=>{
        return callAPI<API.App.GetRoles.IEndpoint>("GET","/api/app/roles",null,
            data=>setRoles(data)
        );
    }, []);

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
            const calcStats = [];

            for(let i=0; i < data.shifts.shifts.length; i++) {
                const slot = data.shifts.shifts[i].slots[data.shifts.userSlots[i]];
                if(slot) {
                    calcStats.push(calculateShiftData(slot, data.stats.wagePerHour ?? 0));
                }
            }

            const mergedShifts = Object.assign({calcStats},data.shifts);
            setStatistics(Object.assign(data, {shifts: mergedShifts}));

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

            <div ref={tabsWrapperRef} className={classes.TabsWrapper}>
                <TabsSwitcher
                    tabs={{
                        shifts: "Your shifts",
                        stats: "Stats for nerds",
                        settings: "Settings"
                    }}
                    activeTabID={startingTabID?.toLowerCase()}
                    onSwitch={data=>navigate(`/Statistics/${data.substring(0,1).toUpperCase()}${data.substring(1)}`)}
                >
                    <ShiftsTab shiftsData={statistics?.shifts ?? null} roles={roles} wage={statistics?.stats.wagePerHour ?? null} setModalContent={setModalContent} reloadStats={reloadStatistics} />
                    <Suspense fallback={<SuspenseLoader />}>
                        <NerdStatsTab data={statistics?{shifts: statistics.shifts, totalEarnings: statistics.stats.totalEarnings, totalHours: statistics.stats.totalHours}:null} finishedShiftsCount={statistics?.stats.finishedShiftCount ?? 0}/>
                    </Suspense>
                    <Suspense fallback={<SuspenseLoader />}>
                        <SettingsTab setModalContent={setModalContent} reloadStats={reloadStatistics} />
                    </Suspense>
                </TabsSwitcher>
            </div>
        </section>
    );
}