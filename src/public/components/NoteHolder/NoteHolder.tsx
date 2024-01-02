import React, { useCallback, useState } from "react";

import classes from "./NoteHolder.css";
import { DateTime } from "luxon";


interface IProps {
    header: string
    content: string
    lastAuthor: string | null
    lastChange: DateTime | null
    allowChange: boolean
    duringEditText?: string
    createNoteDesc: string
}

export default function NoteHolder(props: IProps) {
    const [note, setNote] = useState<string>(props.content);
    const [editActive, setEditActive] = useState<boolean>(false);   

    const cancelAction = useCallback(()=>{
        setEditActive(false);
        setNote(props.content);
    },[]);

    const saveAction = useCallback(()=>{
        setEditActive(false);
    }, []);

    const editAction = useCallback(()=>{
        setEditActive(true)
    }, []);

    const buttons = editActive?[<button onClick={cancelAction}>Anuluj</button>,<button onClick={saveAction}>Zapisz</button>]:(props.allowChange?<button onClick={editAction}>Zmień</button>:"")
    const subtext = 
    editActive?
        props.duringEditText ?? "Pamiętaj o zapisaniu zmian."
    :
        `Ostatnio zmieniono ${props.lastChange?.toFormat("dd/LL/yyyy")} ${props.lastAuthor?"przez " + props.lastAuthor:""}.`;

    return (
        <div className={classes.NoteHolder}>
            <h4>{props.header}</h4>
            {
                props.lastChange==null&&!editActive?
                    <div className={classes.NewNoteWrapper}>
                        <h4>Jeszcze nic tu nie ma</h4>
                        <h6>{props.createNoteDesc}</h6>
                        <button onClick={editAction}>Utwórz</button>
                    </div>
                :
                    <div>
                        <textarea title="Note" value={note} onChange={e=>setNote(e.target.value)} readOnly={!editActive} />
                        <h6>{subtext} {buttons}</h6>
                    </div>
            }
        </div>
    );
}