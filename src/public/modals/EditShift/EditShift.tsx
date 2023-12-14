import React, { useState } from "react";

import classes from "./EditShift.css";
import commonModalClasses from "../common.css";

import ArrowImg from "../../assets/ui/left-arrow-angle.png";
import InputBox, { CurrencyInputBox, TextAreaInputBox } from "../../components/InputBox/InputBox";
import CustomForm from "../../components/Forms/CustomForm/CustomForm";
import { API } from "../../types/networkAPI";
import { DateTime } from "luxon";
import { render2FloatingPoint } from "../../modules/utils";
import { useTranslation } from "react-i18next";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
    shiftData: API.App.Statistics.UserShifts.IWorkDay<"OnlyAssigned">
    userSlot: API.App.Statistics.UserShifts.IShiftSlot
}

function handleCurrencyInput(value: number) {
    return parseFloat(render2FloatingPoint(value));
}

export default function EditShiftModal(props: IProps) {
    const [startTime, setStartTime] = useState<DateTime>(DateTime.fromISO(props.userSlot.assignedShift?.startTime ?? props.userSlot.plannedStartTime));
    const [endTime, setEndTime] = useState<DateTime>(DateTime.fromISO(props.userSlot.assignedShift?.endTime ?? props.userSlot.plannedEndTime ?? ""));
    const [tip, setTip] = useState<number>(props.userSlot.assignedShift?.tip ?? 0);
    const [deduction, setDeduction] = useState<number>(props.userSlot.assignedShift?.deduction ?? 0);
    const [privateNote, setPrivateNote] = useState<string>(props.userSlot.assignedShift?.note ?? "");
    const [sharedNote, setSharedNote] = useState<string>(props.shiftData.note ?? "");

    const {t} = useTranslation("statistics", {keyPrefix: "edit-shift-modal"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    let duration = endTime.diff(startTime,["hours"]).hours;

    duration = duration < 0?24 + duration:duration;
    
    const limitExperience=props.userSlot.status=="Assigned";

    const noteUpdateTime = props.shiftData.noteUpdateTime!=null?DateTime.fromISO(props.shiftData.noteUpdateTime):null;

    return (
        <div className={commonModalClasses.ModalWrapper}>
            <div className={commonModalClasses.Header}>
                <button onClick={props.exit}>
                    <img src={ArrowImg} alt="Back"/>
                </button>
                <div className={commonModalClasses.HeaderContent}>
                    <h3>{t("header-title")}</h3>
                    <h5 className={classes.HeaderSubtitle}>{DateTime.fromISO(props.shiftData.date).toFormat("EEEE, d")}</h5>
                </div>
            </div>
            <div className={commonModalClasses.FormWrapper}>
                <CustomForm<API.App.Schedule.UpdateShiftNotes.IEndpoint | API.App.Schedule.UpdateShift.IEndpoint>
                    doReset={false}
                    url={limitExperience?`/api/schedule/shift/:when/notes`:"/api/schedule/shift/:when"}
                    urlParams={{when: DateTime.fromISO(props.shiftData.date).toISODate()}}
                    method="PUT" 
                    onSuccess={()=>props.successCallback()}
                    submitCaption={tc("save")}
                    staticFields={{"when": props.shiftData.date}}
                    ignoreList={limitExperience?["startTime","endTime", "tip", "deduction"]:[]}
                    onFailure={async (code, err)=>{
                        if(err=="InvalidDuration") {
                            return tg("error-messages.shift-duration-zero");
                        }
                        
                        if(err=="InvalidTime") {
                            return tg("error-messages.invalid-time-input");
                        }

                        return undefined;
                    }}
                >  
                    <InputBox 
                        key="startTime" 
                        globalID={"editShiftModal_startTime"} 
                        label={tg("shift.start-time")} 
                        formControlID={"startTime"} 
                        inputType="time" 
                        initialValue={startTime.isValid?startTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setStartTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired={!limitExperience} 
                        hidden={limitExperience} 
                    />
                    <InputBox 
                        key="endTime" 
                        globalID={"editShiftModal_endTime"} 
                        label={tg("shift.end-time")} 
                        formControlID={"endTime"} 
                        inputType="time" 
                        initialValue={endTime.isValid?endTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setEndTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired={!limitExperience} 
                        hidden={limitExperience}
                    />
                    <p className={limitExperience?commonModalClasses.Hide:""}>
                        {
                            endTime.isValid&&startTime.isValid?
                                [0,25,50,75].includes(duration%1*100)?
                                    `${t("shift-duration")}: ${render2FloatingPoint(duration)}h`
                                :
                                    tg("error-messages.invalid-time-input")
                            :
                                ""
                        }
                    </p>
                    <CurrencyInputBox 
                        key="tip" 
                        globalID={"editShiftModal_tip"} 
                        label={tg("shift.tip")} 
                        formControlID={"tip"} 
                        initialValue={tip} 
                        stateUpdater={val=>setTip(handleCurrencyInput(val))} 
                        isRequired={!limitExperience} 
                        hidden={limitExperience} 
                    />
                    <CurrencyInputBox 
                        key="deduction" 
                        globalID={"editShiftModal_deduction"} 
                        label={tg("shift.deduction")} 
                        formControlID={"deduction"} 
                        initialValue={deduction} 
                        stateUpdater={val=>setDeduction(handleCurrencyInput(val))} 
                        isRequired={!limitExperience} 
                        hidden={limitExperience} 
                    />
                    <TextAreaInputBox 
                        key="note" 
                        globalID={"editShiftModal_note"} 
                        label={tg("shift.private-note")} 
                        formControlID={"note"} 
                        initialValue={privateNote}
                        stateUpdater={e=>setPrivateNote(e.target.value)} 
                        isRequired={false} 
                        sizeLimit={255}
                    />
                    <TextAreaInputBox 
                        key="sharedNote" 
                        globalID={"editShiftModal_sharedNote"} 
                        label={tg("shift.shared-note")} 
                        formControlID={"sharedNote"} 
                        initialValue={sharedNote} 
                        stateUpdater={e=>setSharedNote(e.target.value)} 
                        isRequired={false} 
                        sizeLimit={255}
                    />
                    <h6 className={classes.SharedNoteLastUpdateText}>
                        {tc("last-updated")}: {noteUpdateTime!=null?t("shared-note-updated-on",{date: noteUpdateTime.toFormat("dd/LL/yyyy HH:mm"), actor: props.shiftData.noteLastUpdater ?? tg("ranks.administrator")}): tc("never")}
                    </h6>
                    <h4 className={classes.SharedNoteDisclaimerText}>
                        {t("shared-note-disclaimer")}
                    </h4>
                </CustomForm>
            </div>
            
        </div>
    );
}