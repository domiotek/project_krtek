import React, { Suspense } from "react";

import classes from "./Modal.css";
import SuspenseLoader from "../Loader/Loader";

interface IProps {
    children: JSX.Element
}

export default function Modal(props: IProps) {
    return (
        <div className={classes.FullScreenWrapper}>
            <div className={classes.ModalContainer}>
                <Suspense fallback={<SuspenseLoader variant="Puff"/>}>
                    {props.children}
                </Suspense>
            </div>
        </div>
    );
}