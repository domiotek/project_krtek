import React from "react";

import classes from "./Shift.css";
import NoteHolder from "../../../../components/NoteHolder/NoteHolder";

export default function ShiftView() {

    return (
        <div className={classes.Wrapper}>
            <div className={classes.Toolbar}>
                <button>
                    <img src="/ui/level-up.png" alt="Level up" />
                    Przejdź do dnia
                </button>
                <button>Edytuj</button>
            </div>
            
            <PlannedShiftSection />

            <CoWorkersSection />

            <NoteHolder />
        </div>
    );
}


const CoWorkersSection = React.memo(function CoWorkersSection() {
    return (
        <div className={classes.CoWorkersSection}>
            <h4><span>Razem z</span></h4>
            <div className={classes.Container}>
                <div className={classes.Panel}>
                    <h3>Agi</h3>
                    <h5>Barman</h5>
                    <h6>Od 12:30</h6>
                </div>
            </div>
        </div>
    )
});


function PendingShiftSection() {
    
    return (
        <div className={classes.PendingShiftSection}>
            <h2>To już czas</h2>
            <h6>Zmiana już się zakończyła lub ku temu zmierza</h6>

            <div className={classes.ButtonBox}>
                <button>Uzupełnij dane</button>
                lub
                <button>Porzuć zmianę</button>
            </div>
        </div>
    );
}

function FinishedShiftSection() {
    return (
        <div className={classes.FinishedShiftSection}>
            <div className={classes.TimeRangeSection}>
                <div className={classes.TimeRangeHolder}>
                    <span>12:30</span>
                    -
                    <span>23:30</span>
                </div>
                <h4>11h</h4>
            </div>

            <div className={classes.EarningsSection}>
                <h1>436zł</h1>
                <div className={classes.EarningsComponentsHolder}>
                    <div className={classes.EarningsComponent}>
                        <h3>200zł</h3>
                        <h6>Stawka</h6>
                    </div>
                    <span className={classes.PlusSign}>+</span>
                    <div className={classes.EarningsComponent}>
                        <h3>250zł</h3>
                        <h6>Napiwek</h6>
                    </div>
                    <span>-</span>
                    <div className={classes.EarningsComponent}>
                        <h3>14zł</h3>
                        <h6>Odpis</h6>
                    </div>
                </div>
            </div>

            <div className={classes.WageRateSection}>
                <h3>To tak jakbyś zarabiał</h3>
                <h3>35.05 zł/h</h3>
            </div>
        </div>
    );
}


function PlannedShiftSection() {
    return (
        <div className={classes.PlannedShiftSection}>
            <h4>Ta zmiana dopiero się odbędzie</h4>

            <div>
                <h3>Od 12:30</h3>
                <h5>jako kelner</h5>
            </div>
        </div>
    );
}