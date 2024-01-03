import React from "react";
import classes from "./LazyLoadFallbackForm.css";
import { useTranslation } from "react-i18next";

interface IProps {
    button?: {
        caption: string
        action: ()=>void
    }
}

export default function FallbackForm(props: IProps) {
    const {t: tc} = useTranslation("common");

    return (
        <div className={classes.Container}>
            <img src="/ilustrations/NoConnection.svg" alt="No connection" />
            <h3>{tc("generic-error.title")}</h3>
            <h5>{tc("llff.subtitle")}</h5>
            <h6>{tc("llff.prompt")}</h6>
            {
                props.button?
                    <button type="button" onClick={props.button.action}>{tc(props.button.caption)}</button>
                :""
            }
        </div>
    )
}