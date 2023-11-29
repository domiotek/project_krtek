import React, { useState } from "react";

import classes from "./TabsSwitcher.css";


interface IProps {
    children: JSX.Element[]
    tabs: {
        [ID: string]: string
    }
    activeTabID?: string
    blockSwitch?: boolean
    onSwitch?: (ID: string)=>void
    onSwitchAttempt?: (ID:string, blocked: boolean)=>void
}

export default function TabsSwitcher(props: IProps) {
    if(Object.keys(props.tabs).length==0) 
        throw new Error("No tabs defined.");

    if(Object.keys(props.tabs).length!=props.children.length) 
        throw new Error("Amount of tab labels differs from the amount of the tabs.");

    const startingTab = props.tabs[props.activeTabID ?? ""]!==undefined?props.activeTabID:undefined

    const [tabIndex, setTabIndex] = useState<string>(startingTab ?? Object.keys(props.tabs)[0]);


    function renderLabels() {
        const result: Array<JSX.Element> = [];

        function clickHandler(this: string) {
            if(!props.blockSwitch) {
                if(props.onSwitchAttempt) props.onSwitchAttempt(this, false);
                setTabIndex(this);
                if(props.onSwitch) props.onSwitch(this);
            }else if(props.onSwitchAttempt) props.onSwitchAttempt(this, true);
                
        }

        for (const ID in props.tabs) {
            result.push(
                <li key={ID} className={ID===tabIndex?classes.ActiveTabLabel:""} onClick={clickHandler.bind(ID)}>
                    {props.tabs[ID]}
                </li>
            );
        }

        return result;
    }

    return (
        <div className={classes.Container}>
            <ul>
                {renderLabels()}
            </ul>
            {props.children[Object.keys(props.tabs).indexOf(tabIndex)]}
        </div>
    );
}