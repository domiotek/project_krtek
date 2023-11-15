import React, {CSSProperties} from "react";
import { API } from "../../../../types/networkAPI";

import classes from "./DefaultView.css";
import GoalPanel from "../../../GoalPanel/GoalPanel";
import { render2FloatingPoint } from "../../../../modules/utils";

interface IProps {
    stats: API.App.Statistics.ISafeUserStats
    goal: API.App.Statistics.IGoalDetails | null
    historicGoal: number | null
}

export default function DefaultStatsView(props: IProps) {

    const tipWageRatio = props.stats?props.stats.totalTip / (props.stats.totalTip + props.stats.totalWage) * 100:0;
    return (
        <div className={classes.DefaultViewWrapper}>
            <div className={classes.EarningsPanel}>
                <div className={classes.EarningsSummary}>
                    <h4>Your earnings</h4>
                    <ul>
                        <li>
                            + {render2FloatingPoint(props.stats.totalWage)}zł
                            <span>Wage</span>
                        </li>
                        <li>
                            + {render2FloatingPoint(props.stats.totalTip)}zł
                            <span>Tip</span>
                        </li>
                        {
                            props.stats.externalIncome?
                                <li>
                                    + {render2FloatingPoint(props.stats.externalIncome)}zł
                                    <span>Additional income</span>
                                </li>
                            :""
                        }
                        <li>
                            - {render2FloatingPoint(props.stats.totalDeduction)}zł
                            <span>Deduction</span>
                        </li>
                    </ul>
                    <h3>Total: {render2FloatingPoint(props.stats.totalEarnings)}zł</h3>
                </div>
                <div className={classes.WageTipRatioPanel} style={{"--ratio-value": tipWageRatio, "--ratio-percent": `${tipWageRatio}%`} as CSSProperties}>
                    <span className={`${tipWageRatio>0?classes.GraphIndicator:""}`}></span>
                    <div className={classes.OuterGraph}>
                        <div className={classes.InnerGraph}></div>
                    </div>
                    <div className={classes.GraphLegend}>
                        <span>Tip</span>
                        <span>Wage</span>
                    </div>
                </div>
            </div>
            <div className={classes.StatisticsPanel}>
                <div className={classes.GenericStatistics}>
                    <ul>
                        <li>Shift count: <span>{props.stats?.shiftCount}</span></li>
                        <li>Total worked hours: <span>{props.stats?.totalHours}</span>h</li>
                    </ul>
                </div>
                <GoalPanel data={props.goal} earnings={props.stats.totalEarnings} historicGoal={props.historicGoal}/>
            </div>
        </div>
    )
}