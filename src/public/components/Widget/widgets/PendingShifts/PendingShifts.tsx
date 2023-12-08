import React, { useContext, useEffect, useState } from "react";

import classes from "./PendingShifts.css";

import { API } from "../../../../types/networkAPI";
import { callAPI } from "../../../../modules/utils";
import { WidgetContext } from "../../WidgetBox";
import { Link } from "react-router-dom";

export default function PendingShiftsWidget() {
    const [shiftsCount, setShiftsCount] = useState<number | null>(null);
    const [widgetState, setWidgetState] = useContext(WidgetContext);

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
                        <h4>{shiftsCount} shift{shiftsCount!=1?"s":""}</h4>
                        <h5>You still have shifts this month that require finishing.</h5>
                        <Link className={"button"} to={"/Statistics/Shifts?state=Pending"}>Go to shifts</Link>
                    </div>
                :
                    <div className={classes.Message}>
                        <img src="/ilustrations/Celebrating.svg" alt="Celebrations"/>
                        <h5>All done</h5>
                    </div>
            }
            
        </div>
    );
}