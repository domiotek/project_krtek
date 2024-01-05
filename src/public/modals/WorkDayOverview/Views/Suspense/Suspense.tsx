import React from "react";
import classes from "./Suspense.css";
import wdvClasses from "../WorkDay/WorkDay.css";
import animClasses from "../../../../components/common.css";
import svClasses from "../Shift/Shift.css";

interface IProps {
    variant: "WorkDay" | "Shift"
}

export default function SuspenseView(props: IProps) {

    return props.variant=="WorkDay"?
    <div className={classes.Wrapper}>
        <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
        {
            <ul className={wdvClasses.EmployeeList}>
                <li className={`${wdvClasses.EmployeePanel}`}>
                    <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
                    <h5 className={animClasses.PulseLoadingAnimHolder}></h5>
                </li>
                <li className={`${wdvClasses.EmployeePanel}`}>
                    <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
                    <h5 className={animClasses.PulseLoadingAnimHolder}></h5>
                </li>
            </ul>
        }

        <div className={`${classes.NoteHolder} ${animClasses.PulseLoadingAnimHolder}`}></div>
    </div>
    :
    <div className={svClasses.Wrapper}>
            <div className={`${svClasses.Toolbar} ${classes.Toolbar}`}>
                <span className={animClasses.PulseLoadingAnimHolder}></span>
            </div>

            <div className={svClasses.FinishedShiftSection}>
                <div className={`${svClasses.TimeRangeSection} ${classes.TimeRangeSection}`}>
                    <div>
                        <span className={animClasses.PulseLoadingAnimHolder}></span>
                        -
                        <span className={animClasses.PulseLoadingAnimHolder}></span>
                    </div>
                    <h4 className={animClasses.PulseLoadingAnimHolder}></h4>
                </div>

                <div className={`${svClasses.EarningsSection} ${classes.EarningsSection}`}>
                    <h1 className={animClasses.PulseLoadingAnimHolder}></h1>
                    <div className={`${svClasses.EarningsComponentsHolder} ${classes.EarningsHolder}`}>
                        <div className={svClasses.EarningsComponent}>
                            <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
                            <h6>Stawka</h6>
                        </div>
                        <span className={svClasses.PlusSign}>+</span>
                        <div className={svClasses.EarningsComponent}>
                            <h3 className={`${animClasses.PulseLoadingAnimHolder} ${classes.CherryPick}`}></h3>
                            <h6>Napiwek</h6>
                        </div>
                        <span>-</span>
                        <div className={svClasses.EarningsComponent}>
                            <h3 className={`${animClasses.PulseLoadingAnimHolder} ${classes.CherryPick2}`}></h3>
                            <h6>Odpis</h6>
                        </div>
                    </div>
                </div>
                
                <div className={`${svClasses.WageRateSection} ${classes.WageRateSection}`}>
                    <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
                    <h3 className={animClasses.PulseLoadingAnimHolder}></h3>
                </div>
            </div>

            <div className={svClasses.CoWorkersSection}>
                <h4><span className={classes.CoWorkersHeadline}></span></h4>
                <div className={svClasses.Container}>
                    <div className={`${classes.CoWorkerPanel} ${animClasses.PulseLoadingAnimHolder}`}></div>
                    <div className={`${classes.CoWorkerPanel} ${animClasses.PulseLoadingAnimHolder} ${classes.CherryPick}`}></div>
                </div>
            </div>

            <div className={`${classes.NoteHolder} ${animClasses.PulseLoadingAnimHolder}`}></div>
        </div>
}