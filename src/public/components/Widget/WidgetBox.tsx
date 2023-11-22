import React from "react";

import classes from "./WidgetBox.css";

interface IProps {
    children: JSX.Element
    size: "Small" | "Large"
}

export default function WidgetBox(props: IProps) {
    return (
        <div className={`${classes.Widget} ${props.size=="Large"?classes.LargeWidget:""}`}>
            {props.children}
        </div>
    );
}