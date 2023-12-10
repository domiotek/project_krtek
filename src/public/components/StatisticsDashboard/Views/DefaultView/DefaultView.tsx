import React from "react";
import { API } from "../../../../types/networkAPI";

import classes from "./DefaultView.css";
import GoalPanel from "../../../GoalPanel/GoalPanel";
import { render2FloatingPoint } from "../../../../modules/utils";
import ProgressBar from "../../../ProgressBar/ProgressBar";
import RatioPie from "../../../RatioPie/RatioPie";
import { useTranslation } from "react-i18next";

interface IProps {
    stats: API.App.Statistics.ISafeUserStats
    goal: API.App.Statistics.IGoalDetails | null
    historicGoal: number | null
}

export default function DefaultStatsView(props: IProps) {

    const {t} = useTranslation("statistics",{keyPrefix: "default-view"});

    const tipWageRatio = props.stats?props.stats.totalTip / (props.stats.totalTip + props.stats.totalWage) * 100:0;
    return (
        <div className={classes.DefaultViewWrapper}>
            <div className={classes.EarningsPanel}>
                <div className={classes.EarningsSummary}>
                    <h4>{t("earnings-header")}</h4>
                    <ul>
                        <li>
                            + {render2FloatingPoint(props.stats.totalWage)}zł
                            <span>{t("wage-label")}</span>
                        </li>
                        <li>
                            + {render2FloatingPoint(props.stats.totalTip)}zł
                            <span>{t("tip-label")}</span>
                        </li>
                        {
                            props.stats.externalIncome?
                                <li>
                                    + {render2FloatingPoint(props.stats.externalIncome)}zł
                                    <span>{t("ext-incm-label")}</span>
                                </li>
                            :""
                        }
                        <li>
                            - {render2FloatingPoint(props.stats.totalDeduction)}zł
                            <span>{t("deduction-label")}</span>
                        </li>
                    </ul>
                    <h3>{t("total-label")}: {render2FloatingPoint(props.stats.totalEarnings)}zł</h3>
                </div>
                <div className={classes.TipWageRatioBar}>
                    <ProgressBar progress={tipWageRatio} labels={[t("tip-label"), t("wage-label")]} showOnlyOnePerctantage={false}/>
                </div>
                <div className={classes.TipWageRatioPie}>
                    <RatioPie progress={tipWageRatio} labels={[t("tip-label"), t("wage-label")]} />
                </div>
            </div>
            <div className={classes.StatisticsPanel}>
                <div className={classes.GenericStatistics}>
                    <ul>
                        <li>{t("shift-count")}: <span>{props.stats?.shiftCount}</span></li>
                        <li>{t("total-hours")}: <span>{props.stats?.totalHours}</span>h</li>
                    </ul>
                </div>
                <GoalPanel data={props.goal} earnings={props.stats.totalEarnings} historicGoal={props.historicGoal}/>
            </div>
        </div>
    )
}