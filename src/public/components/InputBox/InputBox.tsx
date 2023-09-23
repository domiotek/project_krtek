import React, { ChangeEventHandler, HTMLInputTypeAttribute } from "react";

import classes from "./InputBox.css"

namespace InputBox {
    export interface IProps {
        globalID: string
        label: string
        formControlID: string
        inputType: HTMLInputTypeAttribute
        stateUpdater: ChangeEventHandler<HTMLInputElement>
        isRequired: boolean
        initialValue: any
        autocomplete?: string
        pattern?: string
        hidden?: boolean
    }
}

export default function InputBox(props: InputBox.IProps) {
    
    return (
        <div className={`${classes.InputContainer} ${classes[props.inputType]} ${props.hidden?classes.hidden:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <input id={props.globalID} name={props.formControlID} title={props.label} type={props.inputType} onChange={props.stateUpdater} required={props.isRequired} value={props.initialValue} 
                checked={props.inputType=="checkbox"&&props.initialValue} autoComplete={props.autocomplete ?? "off"} pattern={props.pattern}/>

        </div>
    );
}