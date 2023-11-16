import React, { useState } from "react";

import classes from "./TabsSwitcher.css";


interface IProps {
    children: JSX.Element[]
    tabs: Array<{
        ID: string
        displayName: string
    }>
    activeIndex?: number
    blockSwitch?: boolean
    onSwitch?: (ID: string)=>void
    onSwitchAttempt?: (ID:string, blocked: boolean)=>void
}

export default function TabsSwitcher(props: IProps) {
    const [tabIndex, setTabIndex] = useState<number>(props.activeIndex ?? 0);

    if(props.tabs.length!=props.children.length) 
        throw new Error("Amount of tab labels differs from the amount of the tabs.");

    if(props.tabs.length==0) 
        throw new Error("No tabs defined.");

    function renderLabels() {
        const result: Array<JSX.Element> = [];

        function clickHandler(this: number) {
            if(!props.blockSwitch) {
                if(props.onSwitchAttempt) props.onSwitchAttempt(props.tabs[this].ID, false);
                setTabIndex(this);
                if(props.onSwitch) props.onSwitch(props.tabs[this].ID);
            }else if(props.onSwitchAttempt) props.onSwitchAttempt(props.tabs[this].ID, true);
                
        }

        for (let i=0; i < props.tabs.length; i++) {
            const tab = props.tabs[i];
            result.push(
                <li key={tab.ID} className={i===tabIndex?classes.ActiveTabLabel:""} onClick={clickHandler.bind(i)}>
                    {tab.displayName}
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
            {props.children[tabIndex]}
        </div>
    );
}