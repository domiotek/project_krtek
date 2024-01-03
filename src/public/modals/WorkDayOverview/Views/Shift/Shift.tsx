import React, { useCallback, useContext, useMemo } from "react";

import classes from "./Shift.css";
import NoteHolder from "../../../../components/NoteHolder/NoteHolder";
import ShiftOverviewModal, { IViewProps, WorkDayContext } from "../../ShiftOverview";
import { API } from "../../../../types/networkAPI";
import { calculateShiftData } from "../../../../pages/Statistics";
import { render2FloatingPoint, renderTime } from "../../../../modules/utils";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../../../App";
import EditShiftModal from "../../../EditShift/EditShift";
import { useNavigate } from "react-router";

export default function ShiftView(props: IViewProps) {
    const workday = useContext(WorkDayContext).day
    const slot = workday.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;
    const [data, setModalContent] = useContext(AppContext);

    const {t} = useTranslation("shift-modal");
    const {t: tc} = useTranslation("common");

    const showEditModalAction = useCallback(()=>{
        const shiftData = Object.assign({ID: 0, slots: workday.otherSlots},workday);

        const hideModal = ()=>setModalContent(null);

        const shiftModal = <ShiftOverviewModal successCallback={hideModal} exit={hideModal} targetDate={DateTime.fromISO(workday.date)} targetView={"Shift"} />

        setModalContent(
            <EditShiftModal 
                exit={()=>setModalContent(shiftModal)} 
                successCallback={()=>{setModalContent(shiftModal);}} 
                //@ts-ignore
                shiftData={shiftData} 
                //@ts-ignore
                userSlot={workday.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot}
            />
        );

    },[]);

    return (
        <div className={classes.Wrapper}>
            <div className={classes.Toolbar}>
                <button onClick={props.switchView}>
                    <img src="/ui/level-up.png" alt="Level up" />
                    {t("go-to-day")}
                </button>
                { 
                    slot.status=="Finished"?
                        <button onClick={showEditModalAction}>{tc("edit")}</button>
                    :""
                }
            </div>

            {
                slot.status=="Assigned"?
                    <PlannedShiftSection />
                :
                    slot.status=="Pending"?
                        <PendingShiftSection />
                    :
                        <FinishedShiftSection />
            }

            <CoWorkersSection />

            <NoteHolder 
                header={t("private-note.header")}
                content = {slot.assignedShift.note ?? ""}
                lastAuthor={null}
                lastChange={null}
                allowChange={true}
                createNoteDesc={t("private-note.desc")}
                duringEditText={t("private-note.reminder")}
            />
        </div>
    );
}


const CoWorkersSection = React.memo(function CoWorkersSection() {
    const workday = useContext(WorkDayContext).day;

    const {t: tg} = useTranslation("glossary");
    const {t} = useTranslation("shift-modal", {keyPrefix: "coworkers"});
    const [user] = useContext(AppContext);

    return (
        <div className={classes.CoWorkersSection}>
            <h4><span>{Object.keys(workday.otherSlots).length > 0?t("together"):t("alone",{context: user?.accountGender=="f"?"female":"male"})}</span></h4>
            <div className={classes.Container}>
                {
                    Object.values(workday.otherSlots).map(slot=>{
                        const startTime = slot?.assignedShift?.startTime ?? slot?.plannedStartTime as string;
                        const endTime = slot?.assignedShift?.endTime ?? slot?.plannedEndTime as string | null;

                        return <div className={classes.Panel}>
                            {
                                slot?.assignedShift?
                                    <h3>{slot?.assignedShift?.userName}</h3>
                                :""
                            }
                            <h5>{tg(`roles.${slot?.requiredRole as string}`)}</h5>
                            <h6>{endTime?`${renderTime(DateTime.fromISO(startTime))} - ${renderTime(DateTime.fromISO(endTime))}`:tg("date-from", {date:renderTime(DateTime.fromISO(startTime))})}</h6>
                        </div>
                    })
                }
            </div>
        </div>
    )
});


const PendingShiftSection = React.memo(function PendingShiftSection() {

    const [data, setModalContent] = useContext(AppContext);
    const workday = useContext(WorkDayContext);

    const {t} = useTranslation("shift-modal", {keyPrefix: "pending-view"});
    const {t: tc} = useTranslation("common"); 

    const showEditModalAction = useCallback(()=>{
        const shiftData = Object.assign({ID: 0, slots: workday.day.otherSlots},workday.day);

        const hideModal = ()=>setModalContent(null);

        const shiftModal = <ShiftOverviewModal successCallback={hideModal} exit={hideModal} targetDate={DateTime.fromISO(workday.day.date)} targetView={"Shift"}/>

        setModalContent(
            <EditShiftModal 
                exit={()=>setModalContent(shiftModal)} 
                successCallback={()=>{setModalContent(shiftModal);}} 
                //@ts-ignore
                shiftData={shiftData} 
                //@ts-ignore
                userSlot={workday.day.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot}
            />
        );
    },[workday]);
    
    return (
        <div className={classes.PendingShiftSection}>
            <h2>{t("title")}</h2>
            <h6>{t("subtitle")}</h6>

            <div className={classes.ButtonBox}>
                <button onClick={showEditModalAction}>{t("fill-data")}</button>
                {tc("or")}
                <button disabled>{t("abandon-shift")}</button>
            </div>
        </div>
    );
});

const FinishedShiftSection = React.memo(function FinishedShiftSection() {
    const context = useContext(WorkDayContext);
    const slot = context.day.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;

    const data = useMemo(()=>calculateShiftData(slot, context.wageRate ?? 0),[slot, context.wageRate]);

    const {t} = useTranslation("shift-modal", {keyPrefix: "finished-view"});
    const {t: tg} = useTranslation("glossary");

    const navigate = useNavigate();

    return (
        <div className={classes.FinishedShiftSection}>
            <div className={classes.TimeRangeSection}>
                <div className={classes.TimeRangeHolder}>
                    <span>{renderTime(data.startTime)}</span>
                    -
                    <span>{renderTime(data.endTime as DateTime)}</span>
                </div>
                <h4>{data.duration}h</h4>
            </div>

            <div className={classes.EarningsSection}>
                <h1 className={context.wageRate===null?classes.NoWageRateModifier:""} data-text={t("at-least")}>{render2FloatingPoint(data.totalEarnings)}zł</h1>
                <div className={classes.EarningsComponentsHolder}>
                    {
                        context.wageRate!=null?
                            [
                            <div key={0} className={classes.EarningsComponent}>
                                <h3>{render2FloatingPoint(data.wageEarnings)}zł</h3>
                                <h6>{tg("shift.wage")}</h6>
                            </div>,
                            <span key={1} className={classes.PlusSign}>+</span>
                            ]
                        :""
                    }
                    
                    
                    <div className={classes.EarningsComponent}>
                        <h3>{render2FloatingPoint(data.tip)}zł</h3>
                        <h6>{tg("shift.tip")}</h6>
                    </div>
                    {
                        data.deduction>0?
                        [
                            <span key={0}>-</span>,
                            <div key={1} className={classes.EarningsComponent}>
                                <h3>{render2FloatingPoint(data.deduction)}zł</h3>
                                <h6>{tg("shift.deduction")}</h6>
                            </div>
                        ]:""
                    }
                    
                </div>
            </div>
            
            <div className={`${classes.WageRateSection} ${context.wageRate==null?classes.NoWageRate:""}`}>
                <h3>{context.wageRate==null?t("missing-wage-desc"):(data.tip>0?t("earnings-desc-tip"):t("earnings-desc"))}</h3>
                <h3>{context.wageRate==null?<button type="button" onClick={()=>navigate("/Statistics/Settings")}>{t("set-wage-link")}</button>:`${render2FloatingPoint(data.realWageRate)} zł/h`}</h3>
            </div>
        </div>
    );
});


const PlannedShiftSection = React.memo(function PlannedShiftSection() {
    const slot = useContext(WorkDayContext).day.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;

    const {t: tg} = useTranslation("glossary");
    const {t} = useTranslation("shift-modal", {keyPrefix: "planned-view"});
    const date = slot.assignedShift.startTime ?? slot.plannedStartTime;

    return (
        <div className={classes.PlannedShiftSection}>
            <h4>{t("title")}</h4>

            <div>
                <h3>{tg("date-from", {date: renderTime(DateTime.fromISO(date))})}</h3>
                <h5>{t("work-as", {role: tg(`roles.${slot.requiredRole}`)})}</h5>
            </div>
        </div>
    );
});