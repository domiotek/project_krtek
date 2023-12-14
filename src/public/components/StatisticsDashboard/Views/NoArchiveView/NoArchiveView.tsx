import React from "react";

import commonClasses from "../common.css";

import classes from "./NoArchiveView.css";
import { useTranslation } from "react-i18next";

interface IProps {
    shiftCount: number
}

export default function NoArchiveStatsDataView(props: IProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "no-arch-view"});

    return (
        <div className={commonClasses.ViewWrapper}>
            <img className={classes.NoDataImage} src="/ilustrations/NoData.svg" alt="No data image"/>
            <h3>{t("title")}</h3>
            <h5>{t("subtitle", {context: props.shiftCount==0?"shift":"wage"})}</h5>
            <p>{t("desc", {context: props.shiftCount==0?"shift":"wage"})}</p>
        </div>
    );
}