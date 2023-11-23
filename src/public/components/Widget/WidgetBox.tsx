import React from "react";

import classes from "./WidgetBox.css";

interface IProps {
    children: JSX.Element
    size: "Small" | "Large"
    header: string
}

export default function WidgetBox(props: IProps) {
    return (
        <div className={`${classes.Widget} ${props.size=="Large"?classes.LargeWidget:""}`}>
            <h4>{props.header}</h4>
            {props.children}
        </div>
    );
}