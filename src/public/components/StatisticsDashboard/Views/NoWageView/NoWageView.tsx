import React from "react";

import commonClasses from "../common.css";
import classes from "./NoWageView.css";


export default function NoWageView() {
    return (
        <div className={commonClasses.ViewWrapper}>
            <img className={classes.NoDataImage} src="/ilustrations/Stats.svg" alt="Statistics"/>
            <h3>We need more information</h3>
            <h5>Wage is not set</h5>
            <p>We can't really show anything useful without it. You can set it in the settings below.</p>
        </div>
    );
}