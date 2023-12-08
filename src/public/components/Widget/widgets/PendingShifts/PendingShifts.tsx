import React, { useContext, useEffect, useState } from "react";

import classes from "./PendingShifts.css";

import { API } from "../../../../types/networkAPI";
import { callAPI } from "../../../../modules/utils";
import { WidgetContext } from "../../WidgetBox";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PendingShiftsWidget() {
    const [shiftsCount, setShiftsCount] = useState<number | null>(2);
    const [widgetState, setWidgetState] = useContext(WidgetContext);

    const {t} = useTranslation("home", {keyPrefix: "pnd-shts-widget"});

    useEffect(()=>{
        return callAPI<API.App.Widgets.GetPendingShiftsCount.IEndpoint>("GET","/api/widgets/pending-shifts-count",null,
            data=>{
                setShiftsCount(data);
                setWidgetState("Ready");
            },
            ()=>setWidgetState("Unavailable"));
    }, []);

    return (
        <div className={classes.WidgetWrapper}>
            {
                shiftsCount&&shiftsCount>0?
                    <div className={classes.MainContent}>
                        <h4>{t("pnd-shifts-counter", {count: shiftsCount})}</h4>
                        <h5>{t("has-pnd-shifts-desc")}</h5>
                        <Link className={"button"} to={"/Statistics/Shifts?state=Pending"}>{t("go-to-shifts-link")}</Link>
                    </div>
                :
                    <div className={classes.Message}>
                        <img src="/ilustrations/Celebrating.svg" alt="Celebrations"/>
                        <h5>{t("no-pnd-shifts-desc")}</h5>
                    </div>
            }
            
        </div>
    );
}