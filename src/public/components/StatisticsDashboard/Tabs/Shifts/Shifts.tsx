import React, { useState } from "react";
import { API, WebApp } from "../../../../types/networkAPI";

import classes from "./Shifts.css";
import commonClasses from "../../../common.css";
import { DateTime } from "luxon";

import ArrowImg from "../../../../assets/ui/left-arrow-angle.png";
import EditImg from "../../../../assets/ui/pen.png";
import { renderCurrency } from "../../../../modules/utils";
import EditShiftModal from "../../../../modals/EditShift/EditShift";
import AddShiftModal from "../../../../modals/AddShift/AddShift";


interface IProps {
    shiftsData: API.App.Statistics.IUserShifts | null;
    wage: number | null
    setModalContent: WebApp.TSetModalContent
    reloadStats: ()=>void
}

interface IEarningsData {
    totalHours: number
    wage: number
    tip: number
    deduction: number
    total: number
    realWageRate: number
}


function NoShiftsMessage() {
    return (
        <div className={classes.NoShiftsMessageContainer}>
            <img src="/ilustrations/Void.svg" alt="Void" />
            <h4>No shifts found</h4>
        </div>
    );
}

function LoadingShiftsView() {

    function renderDummyPanel() {
        return (
            <div className={`${classes.ShiftPanel} ${classes.DummyShiftPanel}`}>
                <div className={classes.Header}>
                    <div className={classes.LeftPanel}>
                        <h2 className={commonClasses.PulseLoadingAnimHolder}></h2>
                        <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                    </div>
                    <div className={classes.RightPanel}>
                        <div className={classes.FinishedShiftView}>
                            <h4 className={commonClasses.PulseLoadingAnimHolder}></h4>
                            <h2 className={commonClasses.PulseLoadingAnimHolder}></h2>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={classes.LoadingShiftsContainer}>
            {renderDummyPanel()}
            {renderDummyPanel()}
            {renderDummyPanel()}
        </div>
    )
}


export default function ShiftsTab(props: IProps) {
    const [expandedShiftID, setExpandedShiftID] = useState<number | null>(null);

    function expandShiftPanel(this: number) {
        if(expandedShiftID!=this) setExpandedShiftID(this);
        else setExpandedShiftID(null);
    }

    function renderCoWorkerPanel(name: string, role: string, startTime: DateTime, endTime: DateTime | null) {
        return (
            <li key={name}>
                <h5>{name}</h5>
                <h6>{role} <span className={classes.InlineBullet}></span> {startTime.toFormat("HH:mm")} - {endTime?endTime.toFormat("HH:mm"):"?"}</h6>
            </li>
        );
    }

    function renderEarningsSection(details: IEarningsData) {
        return (
            <div className={`${classes.Section} ${classes.EarningsSection}`}>
                <h4>Earnings</h4>
                <ul className={`${classes.SectionList} ${classes.EarningsSummaryList}`}>
                    <li>
                        <h5>{props.wage?`+ ${renderCurrency(details.wage)}zł`:"No data"}</h5>
                        <h6>Wage</h6>
                    </li>
                    <li>
                        <h5>+ {renderCurrency(details.tip)}zł</h5>
                        <h6>Tip</h6>
                    </li>
                    <li>
                        <h5>- {renderCurrency(details.deduction)}zł</h5>
                        <h6>Deduction</h6>
                    </li>
                </ul>
                <h5>Total: {renderCurrency(details.total)}zł</h5>
            </div>
        );
    }

    function renderShifts(elements: API.App.Statistics.IUserShifts): JSX.Element[] {
        let result = [];

        for (let i=0; i < elements.shifts.length; i++) {
            const shift = elements.shifts[i];
            const ownerSlot = shift.slots[elements.userSlots[i]] as NonNullable<typeof shift.slots[0]>;

            let coWorkersStr = "";
            let coWorkersUnassignedCount = 0;
            const coWorkersCount = Object.keys(shift.slots).length - 1;
            const coWorkerPanels = [];

            if(coWorkersCount > 0) {
                for (const ID in shift.slots) {
                    if(parseInt(ID)===elements.userSlots[i]) continue;
                    const slot = shift.slots[ID] as NonNullable<typeof shift.slots[0]>;
                    let name = "Unassigned";
                    let startTime = DateTime.fromISO(slot.plannedStartTime);
                    let endTime = slot.plannedEndTime?DateTime.fromISO(slot.plannedEndTime):null;
    
                    if(slot.assignedShift) {
                        coWorkersStr+= slot.assignedShift.userName + ", "
                        name = slot.assignedShift.userName;

                        if(slot.assignedShift.startTime)
                            startTime = DateTime.fromISO(slot.assignedShift.startTime);
                        if(slot.assignedShift.endTime)
                            endTime = DateTime.fromISO(slot.assignedShift.endTime);

                    }else coWorkersUnassignedCount++ ;

                    coWorkerPanels.push(renderCoWorkerPanel(name, slot.requiredRoleDisplayName, startTime, endTime));
                }

                coWorkersStr = coWorkersStr.substring(0,coWorkersStr.length-1);

                if(coWorkersUnassignedCount!=0) {
                    coWorkersStr +=` ${coWorkersUnassignedCount!=coWorkersCount?"and ":""}${coWorkersUnassignedCount} unassigned`;
                }
            }else coWorkersStr = "No one else"; 

            const earningsData: IEarningsData = {
                totalHours: 0,
                wage: 0,
                tip: 0,
                deduction: 0,
                total: 0,
                realWageRate: 0
            }

            let startTimeStr = ownerSlot.plannedStartTime;
            let endTimeStr = ownerSlot.plannedEndTime;

            if(ownerSlot.assignedShift&&ownerSlot.assignedShift.startTime&&ownerSlot.assignedShift.endTime) {
                startTimeStr = ownerSlot.assignedShift.startTime;
                endTimeStr = ownerSlot.assignedShift.endTime;
            }

            const startTime = DateTime.fromISO(startTimeStr);
            const endTime = endTimeStr?DateTime.fromISO(endTimeStr):null;

            if(ownerSlot.assignedShift&&endTime) {
                earningsData.totalHours = endTime.diff(startTime,["hours"]).hours;
                earningsData.totalHours = earningsData.totalHours < 0?24 + earningsData.totalHours:earningsData.totalHours;
                earningsData.wage = earningsData.totalHours * (props.wage ?? 0);
                earningsData.tip = ownerSlot.assignedShift.tip ?? 0;
                earningsData.deduction = ownerSlot.assignedShift.deduction ?? 0;
                earningsData.total = earningsData.wage + earningsData.tip - earningsData.deduction;
                earningsData.realWageRate = earningsData.total / earningsData.totalHours;
            }

            const noteUpdateTime = shift.noteUpdateTime!=null?DateTime.fromISO(shift.noteUpdateTime):null;

            result.push(
                <div key={shift.ID} className={`${classes.ShiftPanel} ${shift.ID===expandedShiftID?classes.Active:""}`}>
                    <div className={classes.Header} onClick={expandShiftPanel.bind(shift.ID)}>
                        <div className={classes.LeftPanel}>
                            <h2>{DateTime.fromISO(shift.date).toFormat("EEEE, d")}</h2>
                            <h5>{ownerSlot?.requiredRoleDisplayName} <span className={classes.InlineBullet}></span> {coWorkersStr}</h5>
                        </div>
                        <div className={classes.RightPanel}>
                            {
                                ownerSlot?.status=="Assigned"||ownerSlot?.status=="Pending"?
                                    <div className={classes.UnfinishedShiftView}>
                                        <h4>
                                            {ownerSlot.status=="Assigned"?"Planned":"Pending"}
                                        </h4>
                                        <h6>
                                            {ownerSlot.status=="Assigned"?`${startTime.toFormat("HH:mm")} - ${endTime?.toFormat("HH:mm") ?? "?"}`:"Requires action"}
                                        </h6>
                                    </div>
                                :
                                    <div className={classes.FinishedShiftView}>
                                            <h4>{startTime.toFormat("HH:mm")} - {endTime?.toFormat("HH:mm") ?? "?"} ({earningsData.totalHours}h)</h4>
                                            <h2>{props.wage?`+ ${renderCurrency(earningsData.total)}zł`:"Finished"}</h2>
                                    </div>
                            }
                        </div>
                        <img src={ArrowImg} alt="Arrow" />
                    </div>
                    <div className={classes.ShiftDetails}>
                        <div className={classes.Section}>
                            <h4>Co-workers</h4>
                            <ul className={classes.SectionList}>
                                {coWorkerPanels.length!=0?coWorkerPanels:<li><h5>No data</h5></li>}
                            </ul>
                        </div>
                        {ownerSlot.status=="Finished"?renderEarningsSection(earningsData):[]}
                        <div className={classes.Section}>
                            <h4>Details</h4>
                            <ul className={classes.SectionList}>
                                {
                                    ownerSlot.status=="Finished"?
                                        <li>
                                            <h5>Actual wage rate: <span className={classes.PropValue}>{props.wage?`${renderCurrency(earningsData.realWageRate)}zł/h`:"No data"}</span></h5>
                                        </li>
                                    :""
                                }
                               
                                <li className={classes.NoteHolder}>
                                    <h5>Shared note: <span className={classes.PropValue}>{shift.note ?? "Unset"}</span></h5>
                                    <h6>Last updated: {noteUpdateTime!=null?`${noteUpdateTime.toFormat("dd/LL/yyyy HH:mm")} by ${shift.noteLastUpdater ?? "Moderator"}`:"never"}</h6>
                                </li>
                                <li className={classes.NoteHolder}>
                                    <h5>Private note: <span className={classes.PropValue}>{ownerSlot.assignedShift?.note ?? "Unset"}</span></h5>
                                </li>
                            </ul>
                        </div>
                        <button 
                            className={classes.ShiftEditButton}
                            type="button" 
                            onClick={()=>
                                props.setModalContent(
                                    <EditShiftModal 
                                        exit={()=>props.setModalContent(null)} 
                                        successCallback={()=>{props.setModalContent(null); props.reloadStats()}} 
                                        shiftData={shift} 
                                        userSlot={ownerSlot}
                                    />
                                )
                            }
                        >
                            <img src={EditImg} alt="Edit"/>
                        </button>
                    </div>
                </div>
            )
        }

        return result;
    }

    return (
        <div className={classes.ShiftsWrapper}>
            {
                props.shiftsData?
                    (props.shiftsData.userSlots.length>0?
                        [
                            <button 
                                className={classes.AddShiftButton}
                                key="AddShiftBtn" 
                                type="button"
                                onClick={()=>props.setModalContent(
                                    <AddShiftModal 
                                        exit={()=>props.setModalContent(null)} 
                                        successCallback={()=>{props.setModalContent(null); props.reloadStats()}} 
                                    />
                                )}
                            >
                                    Add shift
                            </button>,
                            renderShifts(props.shiftsData)
                        ]
                    :
                        <NoShiftsMessage />
                    )
                :
                    <LoadingShiftsView />
            }
        </div>
    );
}