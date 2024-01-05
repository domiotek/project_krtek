import React, { useCallback, useRef, useState } from "react";

import classes from "./NoteHolder.css";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { callAPI, renderDateTime } from "../../modules/utils";

export interface IUpdatedNote {
    updateTime: DateTime
    note: string
}

interface IProps {
    header: string
    content: string | null
    lastAuthor: string | null
    lastChange: DateTime | null
    allowChange: boolean
    duringEditText?: string
    createNoteDesc: string
    apiEndpoint: string
    updateConfirmedNote: (newNote: IUpdatedNote)=>void
}

export default function NoteHolder(props: IProps) {
    const [note, setNote] = useState<string>(props.content ?? "");
    const [editActive, setEditActive] = useState<boolean>(false);
    const [savingInProgress, setSavingInProgress] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<boolean>(false);
    
    const {t: tc} = useTranslation("common");
    const {t} = useTranslation("shift-modal", {keyPrefix: "note-holder"});
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const cancelAction = useCallback(()=>{
        setEditActive(false);
        setNote(props.content ?? "");
    },[]);

    const saveAction = useCallback(()=>{
        if(note==props.content) {
            setEditActive(false);
            return;
        }
        setSavingInProgress(true);
        
        callAPI("PUT",props.apiEndpoint,null,
            ()=>{
                props.updateConfirmedNote({
                    note: note,
                    updateTime: DateTime.now()
                });
                setEditActive(false);
                setSaveError(false);
                setSavingInProgress(false);
            },()=>{
                setSaveError(true);
                setSavingInProgress(false);
                textAreaRef.current?.focus();
            },new URLSearchParams({data: note}));
    }, [note]);

    const editAction = useCallback(()=>{
        setSaveError(false);
        setEditActive(true);
        textAreaRef.current?.focus();
    }, []);

    const buttons = editActive?
        [
            <span>
                <button type="button" onClick={saveAction}>{tc("save")}</button>
                <button type="button" onClick={cancelAction}>{tc("cancel")}</button>
            </span>
        ]
        :(props.allowChange?
            <button type="button" onClick={editAction}>{tc("change")}</button>
        :"");

    let subtext;

    switch(true) {
        case savingInProgress:
            subtext = t("save-in-progress");
        break;
        case saveError:
            subtext = t("save-failed");
        break;
        case editActive:
            subtext = props.duringEditText ?? t("default-edit-prompt");
        break;
        default:
            subtext = t(`last-change${props.lastAuthor?"-author":""}`, {date: renderDateTime(props.lastChange,t("unknown-date")), author: props.lastAuthor})
    }

    return (
        <div className={classes.NoteHolder}>
            <h4>{props.header}</h4>
            {
                props.content==null&&!editActive?
                    <div className={classes.NewNoteWrapper}>
                        <h4>{t("new-note-header")}</h4>
                        <h6>{props.createNoteDesc}</h6>
                        <button onClick={editAction}>{tc("create")}</button>
                    </div>
                :
                    <div>
                        <textarea className={editActive?classes.Active:""} ref={textAreaRef} title="Note" value={note} onChange={e=>setNote(e.target.value)} readOnly={!editActive} />
                        <h6>{subtext} {buttons}</h6>
                    </div>
            }
        </div>
    );
}