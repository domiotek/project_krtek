import React, { useContext } from "react";

import classes from "./WorkDay.css";
import NoteHolder from "../../../../components/NoteHolder/NoteHolder";
import ArrowImg from "../../../../assets/ui/left-arrow-angle.png";
import { DateTime } from "luxon";
import { IViewProps, WorkDayContext } from "../../ShiftOverview";
import { API } from "../../../../types/networkAPI";
import { useTranslation } from "react-i18next";
import { renderTime } from "../../../../modules/utils";


interface IEmployeePanelProps {
    slot: API.App.Schedule.GetWorkDay.IShiftSlot
    isActive?: boolean
    clickHandler?: ()=>void
}

const EmployeePanel = React.memo(function EmployeePanel(props: IEmployeePanelProps) {

    const {t: tg} = useTranslation("glossary");
    const {t: tc} = useTranslation("common");

    const name = props.slot.assignedShift?props.slot.assignedShift.userName:tc("unassigned");

    let startTime = props.slot.plannedStartTime;
    let endTime = props.slot.plannedEndTime;

    if(props.slot.assignedShift) {
        startTime = props.slot.assignedShift.startTime ?? startTime;
        endTime = props.slot.assignedShift.endTime ?? endTime;
    }


    const timeStr = endTime?`${renderTime(DateTime.fromISO(startTime))} - ${renderTime(DateTime.fromISO(endTime))}`:`od ${renderTime(DateTime.fromISO(startTime))}`;

    return (
        <li className={`${classes.EmployeePanel} ${props.isActive?classes.Personal:""}`} onClick={props.isActive?props.clickHandler:undefined}>
                <h3>{name}</h3>
                <h5>{tg(`roles.${props.slot.requiredRole}`)} <span></span> {timeStr}</h5>
                {props.isActive?<img src={ArrowImg} alt="Arrow" />:""}
        </li>
    );
});


export default function WorkDayView(props: IViewProps) {
    const workDayData = useContext(WorkDayContext).day;

    return (
        <div className={classes.Wrapper}>
            <h3>Pracownicy</h3>
            {
                workDayData.personalSlot || Object.keys(workDayData.otherSlots).length > 0?
                <ul className={classes.EmployeeList}>
                    {
                        workDayData.personalSlot?
                            <EmployeePanel slot={workDayData.personalSlot} isActive clickHandler={props.switchView}/>
                        :""
                    }
                    
                    {
                        Object.values(workDayData.otherSlots).map((v,i)=><EmployeePanel key={i} slot={v as API.App.Schedule.GetWorkDay.IShiftSlot}/>)
                    }
                </ul>
                :
                <div className={classes.EmployeeList}>
                    <h6>{DateTime.fromISO(workDayData.date) < DateTime.now()?"Wygląda, jakby nikt nie pracował":"Jeszcze nikogo tu nie ma"}</h6>
                </div>
            }

            <NoteHolder 
                header="Notatka"
                content={workDayData.note ?? ""}
                lastAuthor={workDayData.noteLastUpdater}
                lastChange={workDayData.noteUpdateTime?DateTime.fromISO(workDayData.noteUpdateTime):null}
                allowChange={workDayData.personalSlot!==null}
                createNoteDesc="Miejsce na rzeczy, które mogą się przydać innym."
                duringEditText="Twoje zmiany będą widoczne dla wszystkich."
            />
        </div>
    );
}