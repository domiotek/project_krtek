import React from "react";

import classes from "./Widget.css";

interface IProps {
    children: JSX.Element
    size: "Small" | "Large"
}

export default function Widget(props: IProps) {
    return (
        <div className={`${classes.Widget} ${props.size=="Large"?classes.LargeWidget:""}`}>
            {props.children}
        </div>
    );
}