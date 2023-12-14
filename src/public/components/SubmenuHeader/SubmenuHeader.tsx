import React from "react";

import classes from "./SubmenuHeader.css"
import { manageClassState } from "../../modules/utils";

import ArrowImg from "../../assets/ui/left-arrow-angle.png";
import { useTranslation } from "react-i18next";

namespace SubmenuHeader {
    interface IAction {
        target: string
        name: string
        action: "active" | "inactive"
    }
    export interface IProps {
        headerCaption: string
        actionList?: IAction[]
        onBackCallback?: ()=>void
    }
}

export default function SubmenuHeader(props: SubmenuHeader.IProps) {
    const {t: tc} = useTranslation("common");
    return (
        <div className={classes.SubmenuHeader}>
            <button className={classes.GoBackButton} 
                onClick={()=>{
                    if(props.actionList) {
                        for(const actionInfo of props.actionList) {
                            manageClassState(actionInfo.target,actionInfo.action,actionInfo.name);
                        }
                    }
                    if(props.onBackCallback) props.onBackCallback();
            }} title="Go Back">
                <img src={ArrowImg} alt="Left Arrow" />
                <span>{tc("back")}</span>
            </button>

            <h4>
                {props.headerCaption}
            </h4>
        </div>
    );
}