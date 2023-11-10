import React from "react";
import { API } from "../../types/networkAPI";

import classes from "./Dashboard.css";
import DefaultStatsView from "./Views/DefaultView/DefaultView";
import NoWageView from "./Views/NoWageView/NoWageView";
import LoadingStatsView from "./Views/LoadingView/LoadingView";
import { DateTime } from "luxon";
import NoArchiveStatsDataView from "./Views/NoArchiveView/NoArchiveView";
import FreshStartStatsView from "./Views/FreshStartView/FreshStartView";


interface IStatsDashboardData {
    stats: API.App.Statistics.IUserStats
    goal: API.App.Statistics.IGoalDetails | null
    historicGoal?: number | null
}

interface IProps {
    data: IStatsDashboardData | null
    month: DateTime
}

export default function StatsDashboard(props: IProps) {

    const isWageSet = (props.data?.stats?.wagePerHour ?? null)!==null;

    return (
        <div className={classes.Dashboard}>
            {
                props.data!==null?
                    isWageSet&&props.data.stats.shiftCount>0?
                        <DefaultStatsView stats={props.data.stats as API.App.Statistics.ISafeUserStats} goal={props.data.goal} historicGoal={props.data.historicGoal ?? null}/>
                    :
                        props.month==DateTime.now().startOf("month")?
                            props.data.stats.shiftCount>0?
                                <NoWageView />
                            :
                                <FreshStartStatsView/>
                        :
                            <NoArchiveStatsDataView shiftCount={props.data.stats.shiftCount}/>
                :
                    <LoadingStatsView />
            }
        </div>
    );
}