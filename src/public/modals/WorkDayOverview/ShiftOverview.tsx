import React, { createContext, useEffect, useMemo, useState } from "react";
import SimpleBar from 'simplebar-react';

import classes from "./ShiftOverview.css";
import commonModalClasses from "../common.css";

import { useTranslation } from "react-i18next";
import WorkDayView from "./Views/WorkDay/WorkDay";
import ShiftView from "./Views/Shift/Shift";
import { API } from "../../types/networkAPI";
import { callAPI, renderDateRelDiff } from "../../modules/utils";
import { DateTime } from "luxon";
import SuspenseView from "./Views/Suspense/Suspense";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
    targetDate: DateTime
    targetView: "Shift" | "WorkDay"
}

export interface IViewProps {
    switchView: ()=>void
}


export const WorkDayContext = createContext<API.App.Schedule.GetWorkDay.IResponse>({} as any);

export default function ShiftOverviewModal(props: IProps) {
    const {t} = useTranslation("shift-modal");
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    const [activeView, setActiveView] = useState<"Shift" | "WorkDay">(props.targetView);
    const [workDayData, setWorkDayData] = useState<API.App.Schedule.GetWorkDay.IResponse | null>(null);

    useEffect(()=>{
        return callAPI<API.App.Schedule.GetWorkDay.IEndpoint>("GET","/api/schedule/workday/:date",{"date": props.targetDate.toISODate()},
            data=>{
                setWorkDayData(data);
            });
    },[]);

    const date = useMemo(()=>DateTime.fromISO(workDayData?.day.date ?? ""),[workDayData]);

    const timeRel = useMemo(()=>renderDateRelDiff(date),[date]);

    return (
        <SimpleBar style={{ height: "100%" }}>
            <div className={commonModalClasses.ModalWrapper}>
                <div className={classes.Header}>
                    <div className={classes.LeftPanel}>
                        <h1>{workDayData?date.toFormat("EEEE, d"):(props.targetDate.isValid?props.targetDate.toFormat("EEEE, d"):"")}</h1>
                        <h3>{workDayData?date.toFormat("LLLL"):(props.targetDate.isValid?props.targetDate.toFormat("LLLL"):"")}</h3>
                    </div>
                    <div className={classes.RightPanel}>
                        <h4>{workDayData?(activeView=="Shift"?tg(`shift-states.${workDayData?.day.personalSlot?.status.toLowerCase() ?? ""}`):timeRel):""}</h4>
                        {workDayData&&activeView=="Shift"?<h5>{tg(`roles.${workDayData?.day.personalSlot?.requiredRole ?? ""}`)}</h5>:""}
                    </div>
                    <div className={classes.ButtonWrapper}>
                        <button onClick={props.exit}>X</button>
                    </div>
                </div>
                <div className={classes.MainContent}>
                    {
                        workDayData?
                            <WorkDayContext.Provider value={workDayData}>
                            {
                                activeView=="Shift"?
                                    <ShiftView switchView={()=>setActiveView("WorkDay")}/>
                                :
                                    <WorkDayView switchView={()=>setActiveView("Shift")}/>
                            }
                            </WorkDayContext.Provider>
                        :
                        <SuspenseView variant={props.targetView}/>
                    }
                    
                </div>
            </div>
        </SimpleBar>
    );
}