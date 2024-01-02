import React, { useCallback, useState } from "react";

import classes from "./NoteHolder.css";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";


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
    
    const {t: tc} = useTranslation("common");
    const {t} = useTranslation("shift-modal", {keyPrefix: "note-holder"});

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

    const buttons = editActive?
        [
            <button type="button" key={0} onClick={saveAction}>{tc("save")}</button>,
            <button type="button" key={1} onClick={cancelAction}>{tc("cancel")}</button>
        ]
        :(props.allowChange?
            <button type="button" onClick={editAction}>{tc("change")}</button>
        :"");

    const subtext = 
        editActive?
            props.duringEditText ?? t("default-edit-prompt")
        :
            t(`last-change${props.lastAuthor?"-author":""}`, {date: props.lastChange?.toFormat("dd/LL/yyyy"), author: props.lastAuthor});

    return (
        <div className={classes.NoteHolder}>
            <h4>{props.header}</h4>
            {
                props.lastChange==null&&!editActive?
                    <div className={classes.NewNoteWrapper}>
                        <h4>{t("new-note-header")}</h4>
                        <h6>{props.createNoteDesc}</h6>
                        <button onClick={editAction}>{tc("create")}</button>
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