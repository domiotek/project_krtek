import React, { useContext } from "react";

import commonClasses from "../common.css";
import classes from "./FreshStartView.css";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../../../App";

export default function FreshStartStatsView() {
    const {t} = useTranslation("statistics", {keyPrefix: "frsh-strt-view"});

    const [userData] = useContext(AppContext);

    return (
        <div className={commonClasses.ViewWrapper}>
            <img className={classes.FreshStartImage} src="/ilustrations/FreshStart.svg" alt="Blank canvas image"/>
            <h3>{t("title")}</h3>
            <h5>{t("subtitle")}</h5>
            <p>{t("desc", {context: userData?.accountGender=="f"?"female":"male"})}</p>
        </div>
    );
}