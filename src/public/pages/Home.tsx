import React from "react";

import classes from "./Home.css";
import WidgetBox from "../components/Widget/WidgetBox";
import { useOutletContext } from "react-router-dom";
import { WebApp } from "../types/networkAPI";
import UpcomingShiftsWidget from "../components/Widget/widgets/UpcomingShifts/UpcomingShifts";
import EarningsSummaryWidget from "../components/Widget/widgets/EarningsSummary/EarningsSummary";
import CurrentScheduleWidget from "../components/Widget/widgets/CurrentSchedule/CurrentSchedule";

export default function Home() {

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    return (
        <div className={classes.HomePage}>
            <h2>Hello, {userData?.accountName}</h2>
            <div className={classes.WidgetContainer}>
                <WidgetBox size="Large" header="Schedule">
                    <CurrentScheduleWidget />
                </WidgetBox>
                <WidgetBox size="Small" header="Your upcoming shifts">
                    <UpcomingShiftsWidget />
                </WidgetBox>
                <WidgetBox size="Small" header="Your earnings this month">
                    <EarningsSummaryWidget />
                </WidgetBox>
            </div>
        </div>
    );
}