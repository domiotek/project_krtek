import React, { ChangeEventHandler, HTMLInputTypeAttribute, useState } from "react";

import classes from "./InputBox.css"

namespace InputBox {
    export interface IBasicProps {
        globalID: string
        label: string
        formControlID: string
        initialValue: any
        stateUpdater: ChangeEventHandler<HTMLInputElement>
        isRequired: boolean
        hidden?: boolean
    }

    export interface IProps extends IBasicProps {
        inputType: HTMLInputTypeAttribute
        autocomplete?: string
        pattern?: string
    }

    export interface ITextAreaProps extends IBasicProps {
        sizeLimit?: number
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

export function CurrencyInputBox(props: InputBox.IBasicProps) {
    const parts = props.initialValue.toString().split(".");
    const [major, setMajor] = useState<string>(parts[0] ?? "0");
    const [minor, setMinor] = useState<string>(parts[1] ?? "0");

    const output = major!=""||minor!=""?(major!=""?parseInt(major):0) + (minor!=""?parseInt(minor):0) / 100:"";
    
    return (
        <div className={`${classes.InputContainer} ${classes["currency"]} ${props.hidden?classes.hidden:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <input id={props.globalID} name={props.formControlID} title={props.label} type="number" step="0.01" onChange={props.stateUpdater} required={props.isRequired} value={output} hidden={true}/>
            <div className={classes.HorizontalContainer}>
                <input id={props.globalID} type="number" min="0" onChange={e=>setMajor(e.target.value)} value={major} />
                ,
                <span className={minor!=""?(parseInt(minor) < 10?classes.Active:""):classes.Active}>0</span>
                <input id={props.globalID} type="number" min="0" max="99" onChange={e=>e.target.value.length<=2?setMinor(e.target.value.replace(/^0/,"")):""} value={minor!=""?minor:"0"} />
                zł
            </div>
        </div>
    );
}

export function TextAreaInputBox(props: InputBox.ITextAreaProps) {
    return (
        <div className={`${classes.InputContainer} ${classes["currency"]} ${props.hidden?classes.hidden:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <textarea id={props.globalID} name={props.formControlID} title={props.label} onChange={props.stateUpdater as any} required={props.isRequired} value={props.initialValue} maxLength={props.sizeLimit} />
            {props.sizeLimit&&props.sizeLimit>0?<span>{`${props.initialValue.length} / ${props.sizeLimit}`}</span>:""}
        </div>
    );
}