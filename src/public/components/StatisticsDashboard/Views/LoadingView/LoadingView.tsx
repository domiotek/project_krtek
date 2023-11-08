import React from "react";

import layoutClasses from "../DefaultView/DefaultView.css"
import commonClasses from "../../../common.css"
import classes from "./LoadingView.css"
import { LoadingGoalPanel } from "../../../GoalPanel/GoalPanel";

export default function LoadingStatsView() {
    return (
        <div className={layoutClasses.DefaultViewWrapper}>
            <div className={layoutClasses.EarningsPanel}>
                <div className={`${layoutClasses.EarningsSummary} ${classes.DummyEarningsSummary}`}>
                    <h4 className={commonClasses.PulseLoadingAnimHolder}></h4>
                    <ul>
                        <li><i className={commonClasses.PulseLoadingAnimHolder}></i><span className={commonClasses.PulseLoadingAnimHolder}></span></li>
                        <li><i className={commonClasses.PulseLoadingAnimHolder}></i><span className={commonClasses.PulseLoadingAnimHolder}></span></li>
                        <li><i className={commonClasses.PulseLoadingAnimHolder}></i><span className={commonClasses.PulseLoadingAnimHolder}></span></li>
                    </ul>
                    <h3><span className={commonClasses.PulseLoadingAnimHolder}></span></h3>
                </div>
                <div className={layoutClasses.WageTipRatioPanel}>
                    <div className={`${layoutClasses.OuterGraph} ${commonClasses.PulseLoadingAnimHolder} ${classes.DummyWageTipRatioGraph}`}></div>
                    <div className={layoutClasses.GraphLegend}>
                        <span>Tip</span>
                        <span>Wage</span>
                    </div>
                </div>
            </div>
            <div className={`${layoutClasses.StatisticsPanel} ${classes.DummyStatisticsPanel}`}>
                <div className={layoutClasses.GenericStatistics}>
                    <ul>
                        <li className={commonClasses.PulseLoadingAnimHolder}></li>
                        <li className={commonClasses.PulseLoadingAnimHolder}></li>
                    </ul>
                </div>
                <LoadingGoalPanel baseAnimationDelay={"var(--goal-panel-animation-delay)"}/>
            </div>
        </div>
    )
}