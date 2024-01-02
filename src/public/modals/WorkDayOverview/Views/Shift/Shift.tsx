import React, { useCallback, useContext, useMemo } from "react";

import classes from "./Shift.css";
import NoteHolder from "../../../../components/NoteHolder/NoteHolder";
import ShiftOverviewModal, { IViewProps, WorkDayContext } from "../../ShiftOverview";
import { API } from "../../../../types/networkAPI";
import { calculateShiftData } from "../../../../pages/Statistics";
import { render2FloatingPoint, renderDate, renderTime } from "../../../../modules/utils";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../../../App";
import EditShiftModal from "../../../EditShift/EditShift";

export default function ShiftView(props: IViewProps) {
    const workday = useContext(WorkDayContext).day
    const slot = workday.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;
    const [data, setModalContent] = useContext(AppContext);

    const showEditModalAction = useCallback(()=>{
        const shiftData = Object.assign({ID: 0, slots: workday.otherSlots},workday);

        const hideModal = ()=>setModalContent(null);

        const shiftModal = <ShiftOverviewModal successCallback={hideModal} exit={hideModal} targetDate={workday.date} />

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
                    Przejdź do dnia
                </button>
                { 
                    slot.status=="Finished"?
                        <button onClick={showEditModalAction}>Edytuj</button>
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
                header="Twoja prywatna notatka"
                content = {slot.assignedShift.note ?? ""}
                lastAuthor={null}
                lastChange={null}
                allowChange={true}
                createNoteDesc="Utwórz notatkę, która będzie widoczna jedynie dla Ciebie."
                duringEditText="Te zmiany będą widoczne jedynie dla Ciebie."
            />
        </div>
    );
}


const CoWorkersSection = React.memo(function CoWorkersSection() {
    const workday = useContext(WorkDayContext).day;

    const {t: tg} = useTranslation("glossary", {keyPrefix: "roles"});

    return (
        <div className={classes.CoWorkersSection}>
            <h4><span>{Object.keys(workday.otherSlots).length > 0?"Razem z":"Tym razem sam"}</span></h4>
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
                            <h5>{tg(slot?.requiredRole as string)}</h5>
                            <h6>{endTime?`${renderTime(DateTime.fromISO(startTime))} - ${renderTime(DateTime.fromISO(endTime))}`:`od ${renderTime(DateTime.fromISO(startTime))}`}</h6>
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

    const showEditModalAction = useCallback(()=>{
        const shiftData = Object.assign({ID: 0, slots: workday.day.otherSlots},workday.day);

        const hideModal = ()=>setModalContent(null);

        const shiftModal = <ShiftOverviewModal successCallback={hideModal} exit={hideModal} targetDate={workday.day.date} />

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
            <h2>To już czas</h2>
            <h6>Zmiana już się zakończyła lub ku temu zmierza</h6>

            <div className={classes.ButtonBox}>
                <button onClick={showEditModalAction}>Uzupełnij dane</button>
                lub
                <button disabled>Porzuć zmianę</button>
            </div>
        </div>
    );
});

const FinishedShiftSection = React.memo(function FinishedShiftSection() {
    const context = useContext(WorkDayContext);
    const slot = context.day.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;

    const data = useMemo(()=>calculateShiftData(slot, context.wageRate ?? 0),[slot, context.wageRate]);

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
                <h1 className={context.wageRate===null?classes.NoWageRateModifier:""} data-text="conajmniej">{render2FloatingPoint(data.totalEarnings)}zł</h1>
                <div className={classes.EarningsComponentsHolder}>
                    {
                        context.wageRate!=null?
                            [
                            <div className={classes.EarningsComponent}>
                                <h3>{render2FloatingPoint(data.wageEarnings)}zł</h3>
                                <h6>Stawka</h6>
                            </div>,
                            <span className={classes.PlusSign}>+</span>
                            ]
                        :""
                    }
                    
                    
                    <div className={classes.EarningsComponent}>
                        <h3>{render2FloatingPoint(data.tip)}zł</h3>
                        <h6>Napiwek</h6>
                    </div>
                    {
                        data.deduction>0?
                        [
                            <span key={0}>-</span>,
                            <div key={1} className={classes.EarningsComponent}>
                                <h3>{render2FloatingPoint(data.deduction)}zł</h3>
                                <h6>Odpis</h6>
                            </div>
                        ]:""
                    }
                    
                </div>
            </div>
            
            <div className={`${classes.WageRateSection} ${classes.NoWageRate}`}>
                <h3>{context.wageRate==null?"Brakuje nam informacji o Twojej stawce":(data.tip>0?"To tak jakbyś zarabiał":"Zarabiając")}</h3>
                <h3>{context.wageRate==null?<button>Ustaw stawkę</button>:`${render2FloatingPoint(data.realWageRate)} zł/h`}</h3>
            </div>
        </div>
    );
});


const PlannedShiftSection = React.memo(function PlannedShiftSection() {
    const slot = useContext(WorkDayContext).day.personalSlot as API.App.Schedule.GetWorkDay.IPersonalShiftSlot;

    const {t: tg} = useTranslation("glossary");
    const date = slot.assignedShift.startTime ?? slot.plannedStartTime;

    return (
        <div className={classes.PlannedShiftSection}>
            <h4>Ta zmiana dopiero się odbędzie</h4>

            <div>
                <h3>od {renderTime(DateTime.fromISO(date))}</h3>
                <h5>jako {tg(`roles.${slot.requiredRole}`)}</h5>
            </div>
        </div>
    );
});