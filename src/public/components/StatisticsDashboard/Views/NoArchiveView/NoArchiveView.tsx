import React from "react";

import commonClasses from "../common.css";

import classes from "./NoArchiveView.css";

interface IProps {
    shiftCount: number
}

export default function NoArchiveStatsDataView(props: IProps) {
    return (
        <div className={commonClasses.ViewWrapper}>
             <img className={classes.NoDataImage} src="/ilustrations/NoData.svg" alt="No data image"/>
            <h3>We don't have data for that month</h3>
            <h5>No {props.shiftCount==0?"shifts":"wage information"} from that month</h5>
            <p>
                {props.shiftCount==0?
                    "It seems that you didn't worked that month or at least we don't have data about it."
                :
                    "We don't have information about your wage per hour rate from that month. For more information, please contact your supervisor."
                }
            </p>
        </div>
    );
}