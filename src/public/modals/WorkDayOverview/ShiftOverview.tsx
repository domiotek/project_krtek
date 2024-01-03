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
import ErrorView from "./Views/APIError/APIError";
import { IUpdatedNote } from "../../components/NoteHolder/NoteHolder";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
    targetDate: DateTime
    targetView: "Shift" | "WorkDay"
}

export interface IViewProps {
    switchView: ()=>void
}

interface IContext {
    data: API.App.Schedule.GetWorkDay.IResponse
    updatedPublicNote: IUpdatedNote | null
    updatedPersonalNote: IUpdatedNote | null
    setUpdatedPublicNote: (note: IUpdatedNote)=>void
    setUpdatedPersonalNote: (note: IUpdatedNote)=>void
}

export const WorkDayContext = createContext<IContext>({} as any);

export default function ShiftOverviewModal(props: IProps) {
    const {t} = useTranslation("shift-modal");
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    const [activeView, setActiveView] = useState<"Shift" | "WorkDay">(props.targetView);
    const [workDayData, setWorkDayData] = useState<API.App.Schedule.GetWorkDay.IResponse | null>(null);
    const [apiError, setApiError] = useState<boolean>(false);

    const [updatedPublicNote, setUpdatedPublicNote] = useState<IUpdatedNote | null>(null);
    const [updatedPersonalNote, setUpdatedPersonalNote] = useState<IUpdatedNote | null>(null);

    useEffect(()=>{
        return callAPI<API.App.Schedule.GetWorkDay.IEndpoint>("GET","/api/schedule/workday/:date",{"date": props.targetDate.toISODate()},
            data=>setWorkDayData(data),
            ()=>setApiError(true));
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
                            <WorkDayContext.Provider value={{data: workDayData, updatedPersonalNote, updatedPublicNote, setUpdatedPublicNote, setUpdatedPersonalNote}}>
                            {
                                activeView=="Shift"?
                                    <ShiftView switchView={()=>setActiveView("WorkDay")}/>
                                :
                                    <WorkDayView switchView={()=>setActiveView("Shift")}/>
                            }
                            </WorkDayContext.Provider>
                        :
                            apiError?
                                <ErrorView />
                            :
                                <SuspenseView variant={props.targetView}/>
                    }
                    
                </div>
            </div>
        </SimpleBar>
    );
}