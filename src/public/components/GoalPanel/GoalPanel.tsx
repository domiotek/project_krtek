import React, {CSSProperties, useContext} from "react";
import { API } from "../../types/networkAPI";
import ProgressRing from "../ProgressRing/ProgressRing";

import classes from "./GoalPanel.css";
import commonClasses from "../common.css";
import { render2FloatingPoint } from "../../modules/utils";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../App";

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
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel.finish"});

    return (
        <div className={classes.GoalCompleteContainer}>
            <h5>{t("title")}</h5>
            <img src="/ilustrations/Savings.svg" alt="Money box"></img>
            <h4>{t("subtitle", {amount: render2FloatingPoint(savings)})}</h4>
            <p>{t("desc")}</p>
        </div>
    );
}

function GoalNoMilestonesContent() {
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel.no-milestone"});

    return (
        <div className={classes.NoDataContainer}>
            <img src="/ilustrations/NoData.svg" alt="No data image" />
            <h5>{t("title")}</h5>
            <p>{t("desc")}</p>
        </div>
    );
}

interface IHistoricPanelProps {
    goalAmount: number
    earnings: number
}

function GoalHistoricDataContent(props: IHistoricPanelProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel.arch"});

    const diff = props.earnings - props.goalAmount;
    const hasSaved = diff > 0;

    return (
        <div className={`${classes.HistoricGoalContainer} ${hasSaved?classes.Saved:""}`}>
            <img src={`/ilustrations/${hasSaved?"Celebrations":"Progress"}.svg`} alt={hasSaved?"Celebrations":"Goal progress"} />
            <h5>{t("title", {context: hasSaved?"success":"failure"})}</h5>
            <p>
                {t("desc-prefix", {context: hasSaved?"success":"failure"})}
                <span>{render2FloatingPoint(diff * (hasSaved?1:-1))}zł</span>
                {t("desc-sufix", {context: hasSaved?"success":"failure"})}
            </p>
        </div>
    );
}

function GoalNoHistoricDataContent() {
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel"});

    const [userData] = useContext(AppContext);
    
    return (
        <div className={classes.NoDataContainer}>
            <img src="/ilustrations/NoData.svg" alt="No data image" />
            <h5>{t("no-goal-title")}</h5>
            <p>{t("no-goal-desc", {context: userData?.accountGender=="f"?"female":"male"})}</p>
        </div>
    );
}


function GoalMainContent(props: ISureProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel.main"});
    
    if(props.earnings >= props.data.totalAmount) {
        return GoalCompletedContent(props.earnings - props.data.totalAmount);
    }else {

        function renderMilestone(data: API.App.Statistics.IMilestone | null, progressAmount: number, overwriteKey?: number) {
            data = data ?? {ID: (overwriteKey ?? -1), title: "[?]", amount: 0};

            const percentage = Math.round(progressAmount/data.amount * 100);
            return (
                <li key={overwriteKey ?? data.ID} style={{"--progress": `${percentage}%`} as CSSProperties}>
                    {data.title ?? "[?]"}
                    <i>{render2FloatingPoint(progressAmount)} {t("of")} {render2FloatingPoint(data.amount)}zł ({percentage}%)</i>
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
                <h5 className={classes.SubHeader}>{t("subheader", {index: firstUnfulfilledIndex, total: milestoneCount})}</h5>
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
                        {render2FloatingPoint(props.earnings)} {t("of")} {render2FloatingPoint(props.data.totalAmount)}zł
                    </div>
                    <h5>{t("summary", {amount: render2FloatingPoint((props.data.totalAmount - props.earnings))})}</h5>
                </div>
            </div>
        );
    }
}

export default function GoalPanel(props: IProps) {
    const {t} = useTranslation("statistics", {keyPrefix: "goal-panel"});

    return (
        <div className={classes.GoalPanel}>
            <h3>{t("header")}</h3>

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