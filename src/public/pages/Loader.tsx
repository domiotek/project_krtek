import React from "react";

import classes from "./Loader.css";

import Loader from "react-spinners/SyncLoader";


export default function SuspenseLoader() {
    return (
        <div className={classes.Container}>
             <Loader color="#4166DC" speedMultiplier={0.75}/>
        </div>
       
    );
}