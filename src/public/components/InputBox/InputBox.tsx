import React, { ChangeEventHandler, FormEventHandler, HTMLInputTypeAttribute, createRef, useEffect, useRef, useState } from "react";

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
        sizeLimit?: number
        disabled?: boolean
    }

    export interface IProps extends IBasicProps {
        inputType: HTMLInputTypeAttribute
        autocomplete?: string
        pattern?: string
    }

    export interface ICurrencyProps extends Omit<IBasicProps,"stateUpdater"> {
        currencyStr?: string
        stateUpdater: (value: number)=>void
    }
}

export default function InputBox(props: InputBox.IProps) {
    
    return (
        <div className={`${classes.InputContainer} ${classes[props.inputType]} ${props.hidden?classes.hidden:""} ${props.disabled?classes.disabled:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <input id={props.globalID} name={props.formControlID} title={props.label} type={props.inputType} onChange={props.stateUpdater} required={props.isRequired} value={props.initialValue} 
                checked={props.inputType=="checkbox"&&props.initialValue} autoComplete={props.autocomplete ?? "off"} pattern={props.pattern} maxLength={props.sizeLimit} disabled={props.disabled}/>

        </div>
    );
}

export function CurrencyInputBox(props: InputBox.ICurrencyProps) {
    const [major, setMajor] = useState<string>("0");
    const [minor, setMinor] = useState<string>("0");
    const [value, setValue] = useState<number>(0);

    function onChangeCallback(e: MutationRecord[]) {
        props.stateUpdater(parseFloat((e[0].target as HTMLInputElement).value));
    }

    const obsrv = useRef(new MutationObserver(onChangeCallback));
    const ref = createRef<HTMLInputElement>();

    useEffect(()=>{
        const parts = props.initialValue.toFixed(2).split(".");
        setMajor(parts[0] ?? "");
        setMinor((parts[1] ?? "").replace(/^0/,""));

    }, [props.initialValue]);
    
    useEffect(()=>{
        setValue(major!=""||minor!=""?(major!=""?parseInt(major):0) + (minor!=""?parseInt(minor):0) / 100:0)

    },[major, minor]);

    useEffect(()=>{
        if(ref.current) obsrv.current.observe(ref.current, {attributes: true, attributeFilter: ["value"]});

        return ()=>obsrv.current.disconnect();
    },[])

    return (
        <div className={`${classes.InputContainer} ${classes["currency"]} ${props.hidden?classes.hidden:""} ${props.disabled?classes.disabled:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <input ref={ref} id={props.globalID} name={props.formControlID} title={props.label} type="number" step="0.01" required={props.isRequired} onChange={()=>{}} value={value} hidden={true}/>
            <div className={classes.HorizontalContainer}>
                <input id={props.globalID} type="number" min="0" onChange={e=>setMajor(e.target.value)} value={major} disabled={props.disabled}/>
                ,
                <span className={minor!=""?(parseInt(minor) < 10?classes.Active:""):classes.Active}>0</span>
                <input id={props.globalID} type="number" min="0" max="99" onChange={e=>e.target.value.length<=2?setMinor(e.target.value.replace(/^0/,"")):""} value={minor!=""?minor:"0"} disabled={props.disabled}/>
                {props.currencyStr ?? "zł"}
            </div>
        </div>
    );
}

export function TextAreaInputBox(props: InputBox.IBasicProps) {
    return (
        <div className={`${classes.InputContainer} ${classes["currency"]} ${props.hidden?classes.hidden:""} ${props.disabled?classes.disabled:""}`}>
            <label htmlFor={props.globalID}>{props.label}</label>
            <textarea id={props.globalID} name={props.formControlID} title={props.label} onChange={props.stateUpdater as any} required={props.isRequired} value={props.initialValue} maxLength={props.sizeLimit} disabled={props.disabled}/>
            {props.sizeLimit&&props.sizeLimit>0?<span>{`${props.initialValue.length} / ${props.sizeLimit}`}</span>:""}
        </div>
    );
}