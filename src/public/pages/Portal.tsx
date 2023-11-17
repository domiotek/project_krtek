import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import FooterContent from "../components/FooterContent/FooterContent";

import layoutClasses from "./layouts/MiddleBox.css";
import SuspenseLoader from "./Loader";


export default function Portal() {
    return (
        <div className={layoutClasses.MiddleBoxContainer}>
            <div className={layoutClasses.MiddleBox}>
                <div className={`${layoutClasses.Content}`}>
                    <Suspense fallback={<SuspenseLoader />}>
                        <Outlet />
                    </Suspense>
                </div>
                <div className={layoutClasses.Footer}>
                    <FooterContent />
                </div>
            </div>
        </div>
    );
}