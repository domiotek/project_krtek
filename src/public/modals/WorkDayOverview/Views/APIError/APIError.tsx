import React from "react";

import classes from "./APIError.css";
import { useTranslation } from "react-i18next";

export default function ErrorView() {
    const {t: tc} = useTranslation("common"); 

    return (
        <div className={classes.Wrapper}>
            <img src="/ilustrations/ServerError.svg" alt="API error"/>
            <h3>{tc("generic-error.title")}</h3>
            <h5>{tc("generic-error.desc")}</h5>
        </div>
    );
}