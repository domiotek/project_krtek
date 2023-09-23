import React from "react";
import { Outlet } from "react-router-dom";
import FooterContent from "../components/FooterContent/FooterContent";

import layoutClasses from "./layouts/MiddleBox.css";


export default function Portal() {
    return (
        <div className={layoutClasses.MiddleBoxContainer}>
            <div className={layoutClasses.MiddleBox}>
                <div className={`${layoutClasses.Content}`}>
                    <Outlet />
                </div>
                <div className={layoutClasses.Footer}>
                    <FooterContent />
                </div>
            </div>
        </div>
    );
}