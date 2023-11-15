import React, {CSSProperties} from "react";
import { API } from "../../types/networkAPI";
import ProgressRing from "../ProgressRing/ProgressRing";

import classes from "./GoalPanel.css";
import commonClasses from "../common.css";
import { render2FloatingPoint } from "../../modules/utils";

interface IProps {
    data: API.App.Statistics.IGoalDetails | null
    historicGoal: number | null
    earnings: number
}

interface ISureProps {
    data: API.App.Statistics.IGoalDetails
    earnings: number
}

function GoalCompletedContent(savings: number) {
    return (
        <div className={classes.GoalCompleteContainer}>
            <h5>All milestones fulfilled</h5>
            <img src="/ilustrations/Savings.svg" alt="Money box"></img>
            <h4>You have {render2FloatingPoint(savings)}zł of savings</h4>
            <p>Congratulations. From now on, you earn just for yourself and your needs.</p>
        </div>
    );
}

function GoalNoMilestonesContent() {
    return (
        <div className={classes.NoDataContainer}>
            <img src="/ilustrations/NoData.svg" alt="No data image" />
            <h5>No milestones set</h5>
            <p>You can edit your goal details in the settings below.</p>
        </div>
    );
}

interface IHistoricPanelProps {
    goalAmount: number
    earnings: number
}

function GoalHistoricDataContent(props: IHistoricPanelProps) {

    const diff = props.earnings - props.goalAmount;
    const hasSaved = diff > 0;

    return (
        <div className={`${classes.HistoricGoalContainer} ${hasSaved?classes.Saved:""}`}>
            <img src={`/ilustrations/${hasSaved?"Celebrations":"Progress"}.svg`} alt={hasSaved?"Celebrations":"Goal progress"} />
            <h5>{hasSaved?"Congratulations!":"It wasn't enough"}</h5>
            <p>
                {hasSaved?
                    ["You managed to accumulate ",
                    <span>{render2FloatingPoint(diff)}zł</span>,
                    " of savings that month."]
                :
                    ["There was still ",
                    <span>{render2FloatingPoint(diff*-1)}zł</span>,
                    " to earn in order to meet your goal."]
                }
            </p>
        </div>
    );
}

function GoalNoHistoricDataContent() {
    return (
        <div className={classes.NoDataContainer}>
            <img src="/ilustrations/NoData.svg" alt="No data image" />
            <h5>No goal data</h5>
            <p>You didn't have a goal set for that month.</p>
        </div>
    );
}


function GoalMainContent(props: ISureProps) {
    
    if(props.earnings >= props.data.totalAmount) {
        return GoalCompletedContent(props.earnings - props.data.totalAmount);
    }else {

        function renderMilestone(data: API.App.Statistics.IMilestone | null, progressAmount: number, overwriteKey?: number) {
            data = data ?? {ID: (overwriteKey ?? -1).toString(), title: "[?]", amount: 0, orderTag: -1};

            const percentage = Math.round(progressAmount/data.amount * 100);
            return (
                <li key={overwriteKey ?? data.ID} style={{"--progress": `${percentage}%`} as CSSProperties}>
                    {data.title ?? "[?]"}
                    <i>{render2FloatingPoint(progressAmount)} of {render2FloatingPoint(data.amount)}zł ({percentage}%)</i>
                    <span>
                        <span></span>
                    </span>
                </li>
            );
        }

        let currentMilestone;
        let moneyLeft = props.earnings;
        let firstUnfulfilledIndex = 0;
        let firstUnfulfilled;
        let isFirst = true;
        const milestoneCount: number = props.data.milestones.length;

        for(let i=0; i < milestoneCount; i++) {
            currentMilestone = props.data.milestones[i];
            moneyLeft -= currentMilestone.amount;
            if(moneyLeft < 0) {
                firstUnfulfilledIndex = i;
                firstUnfulfilled = currentMilestone;
                break;
            }

            isFirst = false;
        }

        if(!firstUnfulfilled)
            throw Error("")

        const isLast = firstUnfulfilledIndex==milestoneCount - 1;

        return (
            <div>
                <h5 className={classes.SubHeader}>{firstUnfulfilledIndex} out of {milestoneCount} milestones completed</h5>
                <div className={`${classes.MilestoneCarouselWrapper} ${isFirst?classes.First:(isLast?classes.Last:"")} ${milestoneCount==1?classes.OnlyOne:""}`}>
                    <ul className={classes.MilestoneCarousel}>
                        {
                            milestoneCount==1?
                                [renderMilestone(null, 0, -1), renderMilestone(firstUnfulfilled, firstUnfulfilled.amount + moneyLeft), renderMilestone(null, 0, -3)]
                            :
                                [
                                    renderMilestone(props.data.milestones[firstUnfulfilledIndex - 1], props.data.milestones[firstUnfulfilledIndex - 1]?.amount ?? 0),
                                    renderMilestone(firstUnfulfilled, firstUnfulfilled.amount + moneyLeft),
                                    renderMilestone(props.data.milestones[firstUnfulfilledIndex + 1], 0)
                                ]
                        }
                    </ul>
                </div>
                <div className={classes.GoalSummary}>
                    <div className={classes.Graph}>
                        <ProgressRing radius={10} stroke={2} progress={props.earnings / props.data.totalAmount *100}/>
                        {render2FloatingPoint(props.earnings)} of {render2FloatingPoint(props.data.totalAmount)}zł
                    </div>
                    <h5>{render2FloatingPoint((props.data.totalAmount - props.earnings))}zł more to complete the goal</h5>
                </div>
            </div>
        );
    }
}

export default function GoalPanel(props: IProps) {
    return (
        <div className={classes.GoalPanel}>
            <h3>Your goal</h3>
            {
                props.data?
                    props.data.milestones.length >0?
                        <GoalMainContent data={props.data} earnings={props.earnings}/>
                    :
                        <GoalNoMilestonesContent />
                :
                    props.historicGoal?
                        <GoalHistoricDataContent goalAmount={props.historicGoal} earnings={props.earnings}/>
                    :
                        <GoalNoHistoricDataContent />
                    
            }
        </div>
    );
}

interface IDummyProps {
    baseAnimationDelay?: string
}


function GoalDummyContent() {
    return (
        <div className={classes.DummyContent}>
            <span className={commonClasses.PulseLoadingAnimHolder}></span>
            <p className={commonClasses.PulseLoadingAnimHolder}></p>
            <h4 className={commonClasses.PulseLoadingAnimHolder}></h4>
        </div>
    );
}

export function LoadingGoalPanel(props: IDummyProps) {
    return (
        <div className={`${classes.GoalPanel} ${classes.DummyPanel}`} style={{"--base-anim-delay": props.baseAnimationDelay} as CSSProperties}>
            <h3 className={commonClasses.PulseLoadingAnimHolder}></h3>
            <GoalDummyContent/>
        </div>
    );
}