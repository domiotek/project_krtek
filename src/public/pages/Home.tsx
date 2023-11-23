import React from "react";

import classes from "./Home.css";
import WidgetBox from "../components/Widget/WidgetBox";
import { useOutletContext } from "react-router-dom";
import { WebApp } from "../types/networkAPI";
import UpcomingShiftsWidget from "../components/Widget/widgets/UpcomingShifts/UpcomingShifts";

export default function Home() {

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    return (
        <div className={classes.HomePage}>
            <h2>Hello, {userData?.accountName}</h2>
            <div className={classes.WidgetContainer}>
                <WidgetBox size="Small" header="Your upcoming shifts">
                    <UpcomingShiftsWidget />
                </WidgetBox>
                
            </div>
        </div>
    );
}