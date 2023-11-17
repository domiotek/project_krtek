import React from "react";

import classes from "./TopPopup.css"

namespace TopPopup {
    export interface IProps {
        show: boolean
        text: string
        popupReseter: ()=>void
    }
}

export default function TopPopup(props: TopPopup.IProps) {
    return (
        <div className={`${classes.TopPopup} ${props.show?classes.shown:""}`}>
            <h3>{props.text}</h3>
            <button type="button" onClick={props.popupReseter}>X</button>
        </div>
    );
}