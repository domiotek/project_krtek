import React from "react";

import commonClasses from "../common.css";
import classes from "./NoWageView.css";
import { useTranslation } from "react-i18next";


export default function NoWageView() {
    const {t} = useTranslation("statistics", {keyPrefix: "no-wage-view"});

    return (
        <div className={commonClasses.ViewWrapper}>
            <img className={classes.NoDataImage} src="/ilustrations/Stats.svg" alt="Statistics"/>
            <h3>{t("title")}</h3>
            <h5>{t("subtitle")}</h5>
            <p>{t("desc")}</p>
        </div>
    );
}