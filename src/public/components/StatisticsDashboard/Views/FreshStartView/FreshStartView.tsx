import React from "react";

import commonClasses from "../common.css";
import classes from "./FreshStartView.css";

export default function FreshStartStatsView() {
    return (
        <div className={commonClasses.ViewWrapper}>
            <img className={classes.FreshStartImage} src="/ilustrations/FreshStart.svg" alt="Blank canvas image"/>
            <h3>It's a new month</h3>
            <h5>Go to work!</h5>
            <p>
                You didn't have any shifts this month yet. When you do, first statistics will be available right here.
            </p>
        </div>
    );
}