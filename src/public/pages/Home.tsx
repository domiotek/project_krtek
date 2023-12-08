import React from "react";

import classes from "./Home.css";
import WidgetBox from "../components/Widget/WidgetBox";
import { useOutletContext } from "react-router-dom";
import { WebApp } from "../types/networkAPI";
import UpcomingShiftsWidget from "../components/Widget/widgets/UpcomingShifts/UpcomingShifts";
import EarningsSummaryWidget from "../components/Widget/widgets/EarningsSummary/EarningsSummary";
import CurrentScheduleWidget from "../components/Widget/widgets/CurrentSchedule/CurrentSchedule";
import PendingShiftsWidget from "../components/Widget/widgets/PendingShifts/PendingShifts";
import { useTranslation } from "react-i18next";

export default function Home() {

    const [userData] = useOutletContext() as WebApp.TAppOutletContext;
    
    const {t} = useTranslation("home");

    return (
        <div className={classes.HomePage}>
            <h2>{t("greeting",{name: userData?.accountName})}</h2>
            <div className={classes.WidgetContainer}>
                <WidgetBox size="Large" header={t("schedule-widget.header")} skipLoading>
                    <CurrentScheduleWidget />
                </WidgetBox>
                <WidgetBox size="Small" header={t("upc-shts-widget.header")} skipLoading>
                    <UpcomingShiftsWidget />
                </WidgetBox>
                <WidgetBox size="Small" header={t("earnings-widget.header")} skipLoading>
                    <EarningsSummaryWidget />
                </WidgetBox>
                <WidgetBox size="Small" header={t("pnd-shts-widget.header")}>
                    <PendingShiftsWidget />
                </WidgetBox>
            </div>
        </div>
    );
}