import React, { useContext, useEffect, useState } from "react";

import classes from "./EarningsSummary.css";
import commonClasses from "../../../common.css";

import { API } from "../../../../types/networkAPI";
import { callAPI, render2FloatingPoint } from "../../../../modules/utils";
import ProgressBar from "../../../ProgressBar/ProgressBar";
import { Link } from "react-router-dom";
import { WidgetContext } from "../../WidgetBox";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../../../App";

export default function EarningsSummaryWidget() {
    const [data, setData] = useState<API.App.Widgets.GetEarnings.IResponseData | null>(null);

    const [widgetState, setWidgetState] = useContext(WidgetContext);

    const {t} = useTranslation("home", {keyPrefix: "earnings-widget"});

    const [userData] = useContext(AppContext);

    useEffect(()=>{
        return callAPI<API.App.Widgets.GetEarnings.IEndpoint>("GET","/api/widgets/earnings",null,
            data=>{
                setData(data);
                setWidgetState("Ready");
            },
            ()=>setWidgetState("Unavailable"));
    }, []);




    function renderContent(data: API.App.Widgets.GetEarnings.ISureData) {
        
        const isGoalSet = data.setGoal>0;
        const goalProgress = isGoalSet?data.totalEarnings/data.setGoal*100:0;

        const diff = data.setGoal - data.totalEarnings;

        return (
            <div>
                <h4>{render2FloatingPoint(data.totalEarnings)}zł</h4>
                {
                    isGoalSet?
                        <div>
                            <ProgressBar progress={Math.min(goalProgress,100)} labels={["0zł", `${render2FloatingPoint(data.setGoal)}zł`]} showOnlyOnePerctantage={true} />
                            <h5>{
                                diff > 0?
                                    [t("still-need-prefix"), <span key={0}>{render2FloatingPoint(diff)}zł</span>,t("still-need-sufix")]
                                :
                                    [t("has-more-prefix", {context: userData?.accountGender=="f"?"female":"male"}),<span key={0}>{render2FloatingPoint(-diff)}zł</span>,t("has-more-sufix")]
                            }</h5>
                        </div>
                    :
                        <div className={classes.NoGoalSetView}>
                            <h5>{t("no-goal-set")}</h5>
                            <Link to={"/Statistics/Settings"}>{t("set-goal-link")}</Link>
                        </div>
                        
                }
                
            </div>
        );
    }

    function renderDummyContent() {
        return (
            <div className={classes.DummyContainer}>
                <h4 className={commonClasses.PulseLoadingAnimHolder}></h4>
                <div>
                    <div className={`${commonClasses.PulseLoadingAnimHolder} ${classes.GraphImitation}`}></div>
                    <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                </div>
            </div>
        );
    }

    return (
        <div className={classes.WidgetWrapper}>
             {
                data?
                    data.totalEarnings!=null?
                        renderContent(data as API.App.Widgets.GetEarnings.ISureData)
                    :
                        <div className={`${classes.Message} ${classes.NoWageRateView}`}>
                            <img src="/ilustrations/NoData.svg" alt="Missing information" />
                            <h5>{t("calc-failure")}</h5>
                            <Link to={"/Statistics/Settings"}>{t("set-wage-link")}</Link>
                        </div>
                :
                    renderDummyContent()
            }
        </div>
    );
}