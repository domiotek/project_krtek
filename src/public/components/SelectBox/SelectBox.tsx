import React, { ChangeEventHandler } from "react";

import classes from "./SelectBox.css";

interface IOptionDef {
    displayName: string
    value: string
}

interface IProps {
    label: string
    formControlID: string
    stateUpdater: ChangeEventHandler<HTMLSelectElement>
    requiredOtherThanDefault: boolean
    initialValue: string
    options: IOptionDef[]
    autocomplete: string
}

export default function SelectBox(props: IProps) {
    return (
        <div className={`${classes.InputContainer}`}>
            <label>
                {props.label}
                <select name={props.formControlID} title={props.label} value={props.initialValue} onChange={props.stateUpdater}>
                    {props.options.map(option=>{
                        return (
                            <option key={option.value} value={option.value}>{option.displayName}</option>
                        );
                    })}
                </select>
            </label>
        </div>
    );
}