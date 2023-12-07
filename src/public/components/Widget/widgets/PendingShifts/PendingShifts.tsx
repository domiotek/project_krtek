import React, { useContext, useEffect, useState } from "react";

import classes from "./PendingShifts.css";
import commonClasses from "../../../common.css";

import { API } from "../../../../types/networkAPI";
import { callAPI } from "../../../../modules/utils";
import { Link } from "react-router-dom";
import { WidgetContext } from "../../WidgetBox";

function renderMainPanel() {
    return (
        <div className={classes.MainContent}>
            <h4>3 shifts</h4>
            <h5>You still have shifts this month that require finishing.</h5>
            <Link className={"button"} to={"/Statistics/Shifts?state=pending"}>Go to shifts</Link>
        </div>
    );
}

function renderDummyContent() {
    const result = [];

    for(let i=0; i < 3; i++) {
        result.push(
            <li key={i}>
                <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                <h6 className={commonClasses.PulseLoadingAnimHolder}></h6>
            </li>
        )
    }

    return <ul className={classes.DummyContent}>{result}</ul>;
}

function renderMessage(text: string, iamgeFileName: string, alt: string) {
    return (
        <div className={classes.Message}>
            <img src={`/ilustrations/${iamgeFileName}`} alt={alt}/>
            <h5>{text}</h5>
        </div>
    );
}

export default function PendingShiftsWidget() {
    const [shiftsCount, setShiftsCount] = useState<number | null>(null);
    const [widgetState, setWidgetState] = useContext(WidgetContext);

    useEffect(()=>{
        return callAPI<API.App.Widgets.GetPendingShiftsCount.IEndpoint>("GET","/api/widgets/pending-shifts-count",null,
            data=>setShiftsCount(data),
            ()=>setWidgetState("Unavailable"));
    }, []);

    return (
        <div className={classes.WidgetWrapper}>
            {
                shiftsCount!==null?
                    shiftsCount>0?
                        renderMainPanel()
                    :
                    renderMessage("All done","Celebrating.svg","Celebrations")
                :
                    renderDummyContent()
            }
            
        </div>
    );
}