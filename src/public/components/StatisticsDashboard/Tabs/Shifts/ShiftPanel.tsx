import { DateTime } from "luxon";
import React from "react";
import { API } from "../../../../types/networkAPI";
import ArrowImg from "../../../../assets/ui/left-arrow-angle.png";
import EditImg from "../../../../assets/ui/pen.png";
import { render2FloatingPoint } from "../../../../modules/utils";

import classes from "./Shifts.css";

interface IProps {
    workDay: API.App.Statistics.UserShifts.IWorkDay<"OnlyAssigned">
    userSlot: number
    calcStats: API.App.Statistics.ICalculatedShiftData
    renderExpanded: boolean
    expandToggler: ()=>void
    wage: number
    showEditModal: ()=>void
}


export default function ShiftPanel(props: IProps)  {


    function generateCoWorkersData() {
        let coWorkersStr = "";
        let coWorkersUnassignedCount = 0;
        const coWorkersCount = Object.keys(day.slots).length - 1;
        const coWorkerPanels = [];

        if(coWorkersCount > 0) {
            for (const ID in day.slots) {
                if(parseInt(ID)===props.userSlot) continue;

                const slot = day.slots[ID] as NonNullable<typeof day.slots[0]>;

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

                coWorkerPanels.push( 
                    <li key={name}>
                        <h5>{name}</h5>
                        <h6>{slot.requiredRoleDisplayName} <span className={classes.InlineBullet}></span> {startTime.toFormat("HH:mm")} - {endTime?endTime.toFormat("HH:mm"):"?"}</h6>
                    </li>
                );
            }

            coWorkersStr = coWorkersStr.substring(0,coWorkersStr.length-2);

            if(coWorkersUnassignedCount!=0) {
                coWorkersStr +=` ${coWorkersUnassignedCount!=coWorkersCount?"and ":""}${coWorkersUnassignedCount} unassigned`;
            }
        }else coWorkersStr = "No one else";

        return {
            nameList: coWorkersStr,
            panelList: coWorkerPanels
        }
    }

    function renderHeader(coWorkersStr: string) {
        return (
            <div className={classes.Header} onClick={props.expandToggler.bind(day.ID)}>
                <div className={classes.LeftPanel}>
                    <h2>{DateTime.fromISO(day.date).toFormat("EEEE, d")}</h2>
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
                                    {ownerSlot.status=="Assigned"?`${props.calcStats.startTime.toFormat("HH:mm")} - ${props.calcStats.endTime?.toFormat("HH:mm") ?? "?"}`:"Requires action"}
                                </h6>
                            </div>
                        :
                            <div className={classes.FinishedShiftView}>
                                    <h4>{props.calcStats.startTime.toFormat("HH:mm")} - {props.calcStats.endTime?.toFormat("HH:mm") ?? "?"} ({props.calcStats.duration}h)</h4>
                                    <h2>{props.wage?`+ ${render2FloatingPoint(props.calcStats.totalEarnings)}zł`:"Finished"}</h2>
                            </div>
                    }
                </div>
                <img src={ArrowImg} alt="Arrow" />
            </div>
        );
    }

    function renderEarningsSection(details: API.App.Statistics.ICalculatedShiftData) {
        return (
            <div className={`${classes.Section} ${classes.EarningsSection}`}>
                <h4>Earnings</h4>
                <ul className={`${classes.SectionList} ${classes.EarningsSummaryList}`}>
                    <li>
                        <h5>{props.wage?`+ ${render2FloatingPoint(details.wageEarnings)}zł`:"No data"}</h5>
                        <h6>Wage</h6>
                    </li>
                    <li>
                        <h5>+ {render2FloatingPoint(details.tip)}zł</h5>
                        <h6>Tip</h6>
                    </li>
                    <li>
                        <h5>- {render2FloatingPoint(details.deduction)}zł</h5>
                        <h6>Deduction</h6>
                    </li>
                </ul>
                <h5>Total: {render2FloatingPoint(details.totalEarnings)}zł</h5>
            </div>
        );
    }

    const day = props.workDay;
    const ownerSlot = day.slots[props.userSlot] as NonNullable<typeof day.slots[0]>;

    const coWorkersData = generateCoWorkersData();

    const noteUpdateTime = day.noteUpdateTime!=null?DateTime.fromISO(day.noteUpdateTime):null;

    return (
        <div key={day.ID} className={`${classes.ShiftPanel} ${props.renderExpanded?classes.Active:""}`}>
            {renderHeader(coWorkersData.nameList)}
            <div className={classes.ShiftDetails}>
                <div className={classes.Section}>
                    <h4>Co-workers</h4>
                    <ul className={classes.SectionList}>
                        {coWorkersData.panelList.length!=0?coWorkersData.panelList:<li><h5>No data</h5></li>}
                    </ul>
                </div>

                {ownerSlot.status=="Finished"?renderEarningsSection(props.calcStats):[]}

                <div className={classes.Section}>
                    <h4>Details</h4>
                    <ul className={classes.SectionList}>
                        {
                            ownerSlot.status=="Finished"?
                                <li>
                                    <h5>Actual wage rate: <span className={classes.PropValue}>{props.wage?`${render2FloatingPoint(props.calcStats.realWageRate)}zł/h`:"No data"}</span></h5>
                                </li>
                            :""
                        }
                        
                        <li className={classes.NoteHolder}>
                            <h5>Shared note: <span className={classes.PropValue}>{day.note ?? "Unset"}</span></h5>
                            <h6>Last updated: {noteUpdateTime!=null?`${noteUpdateTime.toFormat("dd/LL/yyyy HH:mm")} by ${day.noteLastUpdater ?? "Moderator"}`:"never"}</h6>
                        </li>
                        <li className={classes.NoteHolder}>
                            <h5>Private note: <span className={classes.PropValue}>{ownerSlot.assignedShift.note ?? "Unset"}</span></h5>
                        </li>
                    </ul>
                </div>
                <button type="button" className={classes.ShiftEditButton} onClick={props.showEditModal}>
                    <img src={EditImg} alt="Edit"/>
                </button>
            </div>
        </div>
    );
}