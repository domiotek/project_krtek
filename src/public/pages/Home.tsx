import React from "react";

import classes from "./Home.css";
import WidgetBox from "../components/Widget/WidgetBox";
import { useOutletContext } from "react-router-dom";
import { WebApp } from "../types/networkAPI";
import UpcomingShiftsWidget from "../components/Widget/widgets/UpcomingShifts/UpcomingShifts";
import EarningsSummaryWidget from "../components/Widget/widgets/EarningsSummary/EarningsSummary";
import CurrentScheduleWidget from "../components/Widget/widgets/CurrentSchedule/CurrentSchedule";
import PendingShiftsWidget from "../components/Widget/widgets/PendingShifts/PendingShifts";

export default function Home() {

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    return (
        <div className={classes.HomePage}>
            <h2>Hello, {userData?.accountName}</h2>
            <div className={classes.WidgetContainer}>
                <WidgetBox size="Large" header="Schedule" skipLoading>
                    <CurrentScheduleWidget />
                </WidgetBox>
                <WidgetBox size="Small" header="Your upcoming shifts" skipLoading>
                    <UpcomingShiftsWidget />
                </WidgetBox>
                <WidgetBox size="Small" header="Your earnings this month" skipLoading>
                    <EarningsSummaryWidget />
                </WidgetBox>
                <WidgetBox size="Small" header="Your pending shifts">
                    <PendingShiftsWidget />
                </WidgetBox>
            </div>
        </div>
    );
}