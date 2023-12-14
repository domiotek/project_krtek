import { DateTime } from "luxon";
import React from "react";
import { API } from "../../../../types/networkAPI";
import ArrowImg from "../../../../assets/ui/left-arrow-angle.png";
import EditImg from "../../../../assets/ui/pen.png";
import { render2FloatingPoint } from "../../../../modules/utils";

import classes from "./Shifts.css";
import { useTranslation } from "react-i18next";

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
    const {t} = useTranslation("statistics", {keyPrefix: "shifts-tab"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    function generateCoWorkersData() {
        let coWorkersStr = "";
        let coWorkersUnassignedCount = 0;
        const coWorkersCount = Object.keys(day.slots).length - 1;
        const coWorkerPanels = [];

        if(coWorkersCount > 0) {
            for (const ID in day.slots) {
                if(parseInt(ID)===props.userSlot) continue;

                const slot = day.slots[ID] as NonNullable<typeof day.slots[0]>;

                let name = tc("unassigned");
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
                        <h6>{tg(`roles.${slot.requiredRole}`)} <span className={classes.InlineBullet}></span> {startTime.toFormat("HH:mm")} - {endTime?endTime.toFormat("HH:mm"):"?"}</h6>
                    </li>
                );
            }

            coWorkersStr = coWorkersStr.substring(0,coWorkersStr.length-2);

            if(coWorkersUnassignedCount!=0) {
                coWorkersStr +=` ${coWorkersUnassignedCount!=coWorkersCount?tc("and")+" ":""}${coWorkersUnassignedCount} ${tc("unassigned-count", {count: coWorkersUnassignedCount})}`;
            }
        }else coWorkersStr = tc("no-one-else");

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
                    <h5>{tg(`roles.${ownerSlot.requiredRole}`)} <span className={classes.InlineBullet}></span> {coWorkersStr}</h5>
                </div>
                <div className={classes.RightPanel}>
                    {
                        ownerSlot?.status=="Assigned"||ownerSlot?.status=="Pending"?
                            <div className={classes.UnfinishedShiftView}>
                                <h4>
                                    {ownerSlot.status=="Assigned"?tg("shift-states.assigned"):tg("shift-states.pending")}
                                </h4>
                                <h6>
                                    {ownerSlot.status=="Assigned"?`${props.calcStats.startTime.toFormat("HH:mm")} - ${props.calcStats.endTime?.toFormat("HH:mm") ?? "?"}`:t("requires-action")}
                                </h6>
                            </div>
                        :
                            <div className={classes.FinishedShiftView}>
                                    <h4>{props.calcStats.startTime.toFormat("HH:mm")} - {props.calcStats.endTime?.toFormat("HH:mm") ?? "?"} ({props.calcStats.duration}h)</h4>
                                    <h2>{props.wage?`+ ${render2FloatingPoint(props.calcStats.totalEarnings)}zł`:tg("shift-states.finished")}</h2>
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
                <h4>{t("earnings-section-header")}</h4>
                <ul className={`${classes.SectionList} ${classes.EarningsSummaryList}`}>
                    <li>
                        <h5>{props.wage?`+ ${render2FloatingPoint(details.wageEarnings)}zł`:tc("no-data")}</h5>
                        <h6>{tg("shift.wage")}</h6>
                    </li>
                    <li>
                        <h5>+ {render2FloatingPoint(details.tip)}zł</h5>
                        <h6>{tg("shift.tip")}</h6>
                    </li>
                    <li>
                        <h5>- {render2FloatingPoint(details.deduction)}zł</h5>
                        <h6>{tg("shift.deduction")}</h6>
                    </li>
                </ul>
                <h5>{tc("total")}: {render2FloatingPoint(details.totalEarnings)}zł</h5>
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
                    <h4>{t("co-workers-label")}</h4>
                    <ul className={classes.SectionList}>
                        {coWorkersData.panelList.length!=0?coWorkersData.panelList:<li><h5>{tc("no-data")}</h5></li>}
                    </ul>
                </div>

                {ownerSlot.status=="Finished"?renderEarningsSection(props.calcStats):[]}

                <div className={classes.Section}>
                    <h4>{tc("details")}</h4>
                    <ul className={classes.SectionList}>
                        {
                            ownerSlot.status=="Finished"?
                                <li>
                                    <h5>{t("act-wage-rate")}: <span className={classes.PropValue}>{props.wage?`${render2FloatingPoint(props.calcStats.realWageRate)}zł/h`:tc("no-data")}</span></h5>
                                </li>
                            :""
                        }
                        
                        <li className={classes.NoteHolder}>
                            <h5>{t("shared-note")}: <span className={classes.PropValue}>{day.note ?? tc("unset")}</span></h5>
                            <h6>{tc("last-updated")}: {noteUpdateTime!=null?t("shared-note-updated-on",{date: noteUpdateTime.toFormat("dd/LL/yyyy HH:mm"), actor: day.noteLastUpdater ?? tg("ranks.administrator")}): tc("never")}</h6>
                        </li>
                        <li className={classes.NoteHolder}>
                            <h5>{t("private-note")}: <span className={classes.PropValue}>{ownerSlot.assignedShift.note ?? tc("unset")}</span></h5>
                        </li>
                    </ul>
                </div>
                <button type="button" className={classes.ShiftEditButton} onClick={props.showEditModal}>
                    <img src={EditImg} alt={tc("edit")}/>
                </button>
            </div>
        </div>
    );
}