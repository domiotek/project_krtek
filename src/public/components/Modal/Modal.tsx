import React from "react";

import classes from "./Modal.css";

interface IProps {
    children: JSX.Element
}

export default function Modal(props: IProps) {
    return (
        <div className={classes.FullScreenWrapper}>
            <div className={classes.ModalContainer}>
                {props.children}
            </div>
        </div>
    );
}