import React from "react";
import SimpleBar from 'simplebar-react';

import classes from "./WorkDayOverview.css";
import commonModalClasses from "../common.css";

import { useTranslation } from "react-i18next";
import WorkDayView from "./Views/WorkDay/WorkDay";
import ShiftView from "./Views/Shift/Shift";

interface IProps {
    successCallback: ()=>void
    exit: ()=>void
}

export default function WorkDayOverviewModal(props: IProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "edit-shift-modal"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    return (
        <SimpleBar style={{ height: "100%" }}>
            <div className={commonModalClasses.ModalWrapper}>
                <div className={classes.Header}>
                    <div className={classes.LeftPanel}>
                        <h1>Sobota, 6</h1>
                        <h3>Wrzesień</h3>
                    </div>
                    <div className={classes.RightPanel}>
                        <h4>Wczoraj</h4>
                    </div>
                    <div className={classes.ButtonWrapper}>
                        <button onClick={props.exit}>X</button>
                    </div>
                </div>
                <div className={classes.MainContent}>
                    <ShiftView />
                </div>
            </div>
        </SimpleBar>
    );
}