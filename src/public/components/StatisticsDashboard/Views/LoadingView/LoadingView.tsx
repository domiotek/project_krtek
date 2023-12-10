import React from "react";

import layoutClasses from "../DefaultView/DefaultView.css"
import commonClasses from "../../../common.css"
import pieClasses from "../../../RatioPie/RatioPie.css";
import barClasses from "../../../ProgressBar/ProgressBar.css";
import classes from "./LoadingView.css"
import { LoadingGoalPanel } from "../../../GoalPanel/GoalPanel";
import { useTranslation } from "react-i18next";

export default function LoadingStatsView() {
    const {t} = useTranslation("Statistics", {keyPrefix: "default-view"});

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
                <div className={`${layoutClasses.TipWageRatioPie} ${pieClasses.Container} ${classes.DisableOnMobile}`}>
                    <div className={`${pieClasses.OuterGraph} ${commonClasses.PulseLoadingAnimHolder} ${classes.DummyWageTipRatioGraph}`}></div>
                    <div className={pieClasses.GraphLegend}>
                        <span>{t("tip-label")}</span>
                        <span>{t("wage-label")}</span>
                    </div>
                </div>

                <div className={`${layoutClasses.TipWageRatioBar} ${barClasses.Container}`}>
                    <div className={`${barClasses.OuterGraph} ${commonClasses.PulseLoadingAnimHolder} ${classes.DummyWageTipRatioGraph}`}></div>
                    <div className={barClasses.GraphLegend}>
                        <span>{t("tip-label")}</span>
                        <span>{t("wage-label")}</span>
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