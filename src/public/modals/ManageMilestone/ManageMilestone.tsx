import React, { useEffect, useState } from "react";

import classes from "./ManageMilestone.css";
import commonModalClasses from "../common.css";

import ArrowImg from "../../assets/ui/left-arrow-angle.png";
import InputBox, { CurrencyInputBox } from "../../components/InputBox/InputBox";
import CustomForm from "../../components/Forms/CustomForm/CustomForm";

interface IProps {
    successCallback: (title: string, value: number)=>void
    exit: ()=>void
    milestoneInfo: {
        ID: number
        title: string
        value: number
    } | null
}

export default function ManageMilestoneModal(props: IProps) {
    const [title, setTitle] = useState<string>(props.milestoneInfo?.title ?? "");
    const [value, setValue] = useState<number>(props.milestoneInfo?.value ?? 0);

    return (
        <div className={commonModalClasses.ModalWrapper}>
            <div className={commonModalClasses.Header}>
                <button onClick={props.exit}>
                    <img src={ArrowImg} alt="Back"/>
                </button>
                <div className={commonModalClasses.HeaderContent}>
                    <h3>{props.milestoneInfo?"Edit":"Add new"} milestone</h3>
                </div>
            </div>
            <div className={commonModalClasses.FormWrapper}>
                <CustomForm
                    doReset={false}
                    url=""
                    urlParams={null}
                    method="POST"
                    onSuccess={()=>{
                        props.successCallback(title, value);
                    }}
                    submitCaption="Confirm"
                >  
                    <InputBox 
                        key="title" 
                        globalID={"manageMilestoneModal_title"} 
                        label={"Title"} 
                        formControlID={"title"} 
                        inputType="text" 
                        initialValue={title} 
                        stateUpdater={e=>setTitle(e.target.value)}
                        isRequired
                        sizeLimit={30}
                    />
                    <CurrencyInputBox
                        key="value"
                        globalID="manageMilestoneModal_value"
                        label="Value"
                        formControlID="value"
                        initialValue={value}
                        stateUpdater={val=>setValue(val)}
                        isRequired
                    />
                </CustomForm>
            </div>
            
        </div>
    );
}