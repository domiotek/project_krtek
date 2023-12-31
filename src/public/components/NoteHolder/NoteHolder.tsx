import React from "react";

import classes from "./NoteHolder.css";

export default function NoteHolder() {
    return (
        <div className={classes.NoteHolder}>
            <h4>Notatka</h4>
            <textarea title="Note">
                Klucze w marchewce
                Svijany na końcówce
            </textarea>
            <h6>Ostatnio zmieniono 6/9/2023 przez Damian. <button>Zmień</button></h6>
        </div>
    );
}