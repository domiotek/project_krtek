import React from "react";

import classes from "./FinishPage.css";
import { useNavigate } from "react-router-dom";


interface IProps {
    header: string
    description: string
    buttonCaption: string
    redirectUrl: string
}

export default function FlowFinishPage(props: IProps) {
    const navigate = useNavigate();

    return (
        <div className={classes.FinishPageContent}>
            <h3>{props.header}</h3>
            <p>{props.description}</p>
            <button type="button" onClick={()=>navigate(props.redirectUrl,{replace:true})}>{props.buttonCaption}</button>
        </div>
    );
}