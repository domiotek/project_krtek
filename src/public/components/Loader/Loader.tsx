import React from "react";

import classes from "./Loader.css";

import SyncLoader from "react-spinners/SyncLoader";
import PuffLoader from "react-spinners/PuffLoader";

interface IProps {
    variant?: "Sync" | "Puff"
}

export default React.memo(function SuspenseLoader(props: IProps) {

    switch(props.variant ?? "Sync") {
        case "Sync":
            return (
                <div className={classes.Container}>
                    <SyncLoader color="#4166DC" speedMultiplier={0.75}/>
                </div>
               
            );
        case "Puff":
            return (
                <div className={`${classes.Container} ${classes.PuffLoader}`}>
                    <PuffLoader color="#4166DC" size={"50%"} speedMultiplier={0.75} />
                </div>
            )
    }
});