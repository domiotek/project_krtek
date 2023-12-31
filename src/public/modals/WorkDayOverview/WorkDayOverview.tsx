import React from "react";

import classes from "./WorkDayOverview.css";
import commonModalClasses from "../common.css";

import { useTranslation } from "react-i18next";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
}

export default function WorkDayOverviewModal(props: IProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "edit-shift-modal"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    return (
        <div className={commonModalClasses.ModalWrapper}>
            <div className={classes.Header}>
                <div className={classes.LeftPanel}>
                    <h1>Sobota, 6</h1>
                    <h3>Wrzesień</h3>
                </div>
                <div className={classes.RightPanel}>
                    <h4>Wczoraj</h4>
                </div>
                <button onClick={props.exit}>X</button>
            </div>
            <div className={classes.MainContent}>
                
            </div>
        </div>
    );
}