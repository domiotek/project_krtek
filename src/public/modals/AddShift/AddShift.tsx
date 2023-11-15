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

    useEffect(()=>{
        return callAPI<API.App.GetUserRoles.IEndpoint>("GET","/api/user/roles",null, data=>{
            const newArray = [];
            for (const role of data) {
                newArray.push({
                    value: role.name,
                    displayName: role.displayName
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
                    <h3>Add new shift</h3>
                    <h5>Manually add out-of-schedule shift</h5>
                </div>
            </div>
            <div className={commonModalClasses.FormWrapper}>
                <p className={classes.Message}>
                    It can be useful in cases where someone is covering for the part of the shift.
                    <br></br><br></br>
                    Please note, that manager will be able to see, that the shift was manually added.
                </p>
                <CustomForm<API.App.Schedule.AddShift.IEndpoint>
                    doReset={false}
                    url="/api/schedule/shift"
                    urlParams={null}
                    method="POST" 
                    onFailure={async (code, err)=>{
                        if(err=="NotAllowed") return "You can only add shifts to the last 3 days.";
                        if(err=="InvalidTime") return "Only quarters of an hour are allowed.";

                    }}
                    onSuccess={()=>{
                        if(DateTime.now().startOf("month").equals(date.startOf("month")))
                            props.successCallback()
                        else props.exit();
                    }}
                    submitCaption="Add shift"
                >  
                    <InputBox 
                        key="date" 
                        globalID={"editShiftModal_date"} 
                        label={"Date"} 
                        formControlID={"when"} 
                        inputType="date" 
                        initialValue={date.isValid?date.toFormat("yyyy-LL-dd"):""} 
                        stateUpdater={e=>{setDate(DateTime.fromFormat(e.target.value, "yyyy-LL-dd"))}}
                        isRequired
                    />
                    <InputBox 
                        key="startTime" 
                        globalID={"editShiftModal_startTime"} 
                        label={"Start time"} 
                        formControlID={"startTime"} 
                        inputType="time" 
                        initialValue={startTime.isValid?startTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setStartTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired
                    />
                    <InputBox 
                        key="endTime" 
                        globalID={"editShiftModal_endTime"} 
                        label={"End time"} 
                        formControlID={"endTime"} 
                        inputType="time" 
                        initialValue={endTime.isValid?endTime.toFormat("HH:mm"):""} 
                        stateUpdater={val=>setEndTime(DateTime.fromFormat(val.target.value, "HH:mm"))} 
                        isRequired
                    />
                    <SelectBox 
                        key="role" 
                        label="Role" 
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