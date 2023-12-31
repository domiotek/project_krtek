import React from "react";

import classes from "./WorkDay.css";
import NoteHolder from "../../../../components/NoteHolder/NoteHolder";
import ArrowImg from "../../../../assets/ui/left-arrow-angle.png";


export default function WorkDayView() {

    return (
        <div className={classes.Wrapper}>
            <h3>Pracownicy</h3>
            <ul className={classes.EmployeeList}>
                <li className={`${classes.EmployeePanel} ${classes.Personal}`}>
                    <h3>Damian</h3>
                    <h5>Kelner <span></span> 12:30 - 23:00</h5>
                    <img src={ArrowImg} alt="Arrow" />
                </li>
                <li className={classes.EmployeePanel}>
                    <h3>Agi</h3>
                    <h5>Barman <span></span> 12:30 - 23:00</h5>
                </li>
            </ul>

            <NoteHolder />
        </div>
    );
}