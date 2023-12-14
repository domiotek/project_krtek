import React, { useEffect, useState } from "react";

import classes from "./AddShift.css";
import commonModalClasses from "../common.css";

import ArrowImg from "../../assets/ui/left-arrow-angle.png";
import InputBox from "../../components/InputBox/InputBox";
import CustomForm from "../../components/Forms/CustomForm/CustomForm";
import { DateTime } from "luxon";
import SelectBox from "../../components/SelectBox/SelectBox";
import { API } from "../../types/networkAPI";
import { callAPI } from "../../modules/utils";
import { useTranslation } from "react-i18next";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
}

interface IRoleOption {
    value: string
    displayName: string
}

export default function AddShiftModal(props: IProps) {
    const [date, setDate] = useState<DateTime>(DateTime.fromISO(""));
    const [startTime, setStartTime] = useState<DateTime>(DateTime.fromISO(""));
    const [endTime, setEndTime] = useState<DateTime>(DateTime.fromISO(""));
    const [role, setRole] = useState<string>("none");
    const [roleOptions, setRoleOptions] = useState<IRoleOption[]>([]);

    const {t} = useTranslation("statistics", {keyPrefix: "add-shift-modal"});
    const {t: tg} = useTranslation("glossary");
    const {t: tc} = useTranslation("common");

    useEffect(()=>{
        return callAPI<API.App.GetUserRoles.IEndpoint>("GET","/api/user/roles",null, data=>{
            const newArray = [];
            for (const role of data) {
                newArray.push({
                    value: role.name,
                    displayName: tg(`roles.${role.name}`)
                })
            }
            setRoleOptions(newArray);
        });
    }, []);

    return (
        <div className={commonModalClasses.ModalWrapper}>
            <div className={commonModalClasses.Header}>
                <button onClick={props.exit}>
                    <img src={ArrowImg} alt="Back"/>
                </button>
                <div className={commonModalClasses.HeaderContent}>
                    <h3>{t("header-title")}</h3>
                    <h5>{t("header-subtitle")}</h5>
                </div>
            </div>
            <div className={commonModalClasses.FormWrapper}>
                <p className={classes.Message}>
                    {t("message-p-1")}
                    <br></br><br></br>
                    {t("message-p-2")}
                </p>
                <CustomForm<API.App.Schedule.AddShift.IEndpoint>
                    doReset={false}
                    url="/api/schedule/shift"
                    urlParams={null}
                    method="POST" 
                    onFailure={async (code, err)=>{
                        if(err=="NotAllowed") return tg("error-messages.add-shift-forbidden");
                        if(err=="InvalidTime") return tg("error-messages.invalid-time-input");

                    }}
                    onSuccess={()=>{
                        if(DateTime.now().startOf("month").equals(date.startOf("month")))
                            props.successCallback()
                        else props.exit();
                    }}
                    submitCaption={tc("save")}
                >  
                    <InputBox 
                        key="date" 
                        globalID={"editShiftModal_date"} 
                        label={tg("shift.date")} 
                        formControlID={"when"} 
                        inputType="date" 
                        initialValue={date.isValid?date.toFormat("yyyy-LL-dd"):""} 
                        stateUpdater={e=>{setDate(DateTime.fromFormat(e.target.value, "yyyy-LL-dd"))}}
                        isRequired
                    />
                    <InputBox 
                        key="startTime" 
                        globalID={"editShiftModal_startTime"} 
                        label={tg("shift.start-time")} 
                        formControlID={"startTime"} 
                        inputType="time" 
                        initialValue={startTime.isValid?startTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setStartTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired
                    />
                    <InputBox 
                        key="endTime" 
                        globalID={"editShiftModal_endTime"} 
                        label={tg("shift.end-time")} 
                        formControlID={"endTime"} 
                        inputType="time" 
                        initialValue={endTime.isValid?endTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setEndTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired
                    />
                    <SelectBox 
                        key="role" 
                        label={tg("shift.role")} 
                        formControlID="role" 
                        initialValue={role} 
                        stateUpdater={ev=>setRole(ev.target.value)} 
                        options={roleOptions}
                        autocomplete="off"
                    />
                </CustomForm>
            </div>
            
        </div>
    );
}