import React, { CSSProperties } from "react";

import classes from "./ProgressBar.css";

interface IProps {
    progress: number
    showOnlyOnePerctantage: boolean
    labels: [string, string]
}

export default function ProgressBar(props: IProps) {

    return (
        <div className={classes.Container} style={{"--ratio-value": props.progress, "--ratio-percent": `${props.progress}%`} as CSSProperties}>
            <span className={`${props.progress>0?classes.GraphIndicator:""} ${!props.showOnlyOnePerctantage?classes.DoubleMode:""}`}></span>
            <div className={classes.OuterGraph}>
                <div className={classes.InnerGraph}></div>
            </div>
            <div className={classes.GraphLegend}>
                <span>{props.labels[0]}</span>
                <span>{props.labels[1]}</span>
            </div>
        </div>
    );
}