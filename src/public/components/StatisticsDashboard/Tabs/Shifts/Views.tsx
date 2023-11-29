import React from "react";
import classes from "./Shifts.css";
import commonClasses from "../../../common.css";


export function NoShiftsMessage() {
    return (
        <div className={classes.NoShiftsMessageContainer}>
            <img src="/ilustrations/Void.svg" alt="Void" />
            <h4>No shifts found</h4>
        </div>
    );
}

export function LoadingShiftsView() {

    function renderDummyPanel() {
        return (
            <div className={`${classes.ShiftPanel} ${classes.DummyShiftPanel}`}>
                <div className={classes.Header}>
                    <div className={classes.LeftPanel}>
                        <h2 className={commonClasses.PulseLoadingAnimHolder}></h2>
                        <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                    </div>
                    <div className={classes.RightPanel}>
                        <div className={classes.FinishedShiftView}>
                            <h4 className={commonClasses.PulseLoadingAnimHolder}></h4>
                            <h2 className={commonClasses.PulseLoadingAnimHolder}></h2>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={classes.LoadingShiftsContainer}>
            {renderDummyPanel()}
            {renderDummyPanel()}
            {renderDummyPanel()}
        </div>
    )
}

export function NoFilterResultsMessage() {
    return (
        <div className={classes.NoShiftsMessageContainer}>
            <img src="/ilustrations/Void.svg" alt="Void" />
            <h4>No shifts found</h4>
            <p>Adjust your filters and try again.</p>
        </div>
    );
}