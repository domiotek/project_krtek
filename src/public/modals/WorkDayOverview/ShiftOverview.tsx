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

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
    targetDate: string
}

export interface IViewProps {
    switchView: ()=>void
}


export const WorkDayContext = createContext<API.App.Schedule.GetWorkDay.IResponse>({} as any);

export default function ShiftOverviewModal(props: IProps) {
    const {t} = useTranslation("shift-modal");
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    const [activeView, setActiveView] = useState<"Shift" | "WorkDay">("WorkDay");
    const [workDayData, setWorkDayData] = useState<API.App.Schedule.GetWorkDay.IResponse | null>(null);

    useEffect(()=>{
        return callAPI<API.App.Schedule.GetWorkDay.IEndpoint>("GET","/api/schedule/workday/:date",{"date": props.targetDate},
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
                        <h1>{date.toFormat("EEEE, d")}</h1>
                        <h3>{date.toFormat("LLLL")}</h3>
                    </div>
                    <div className={classes.RightPanel}>
                        <h4>{activeView=="Shift"?tg(`shift-states.${workDayData?.day.personalSlot?.status.toLowerCase() ?? ""}`):timeRel}</h4>
                        {activeView=="Shift"?<h5>{tg(`roles.${workDayData?.day.personalSlot?.requiredRole ?? ""}`)}</h5>:""}
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
                        <div>
                            Loading
                        </div>
                    }
                    
                </div>
            </div>
        </SimpleBar>
    );
}