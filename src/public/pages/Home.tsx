import React from "react";

import classes from "./Home.css";
import Widget from "../components/Widget/Widget";
import { useOutletContext } from "react-router-dom";
import { WebApp } from "../types/networkAPI";

export default function Home() {

    const [userData, setModalContent] = useOutletContext() as WebApp.TAppOutletContext;

    return (
        <div className={classes.HomePage}>
            <h2>Hello, {userData?.accountName}</h2>
            <div className={classes.WidgetContainer}>
                
            </div>
        </div>
    );
}