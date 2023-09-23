import React, { FormEventHandler, useEffect, useState } from "react";

import classes from "./CustomForm.css"
import { parseFormData } from "../../../modules/utils";
import { API } from "../../../types/networkAPI"

export namespace CustomFormTypes {

    export interface IFieldDefs {
        [name: string]: string
    }

    export interface IProps {
        url: string
        method: "POST" | "GET"
        elements: JSX.Element[]
        onFailure: (Response: any)=>Promise<string>
        onSuccess: (response: any)=>void
        onBeforeSubmit?: (setErrorMessage: (text: string)=>void)=>void
        submitCaption: string
        doReset: boolean
        ignoreList?: string[]
        staticFields?: IFieldDefs
    }
}

export default function CustomForm(props: CustomFormTypes.IProps) {
    const [submitDisabled, setSubmitDisabled] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(()=>{
        setSubmitDisabled(false);
        setErrorMessage(null);
    }, [props.doReset]);

    const submitHandler: FormEventHandler = async e=>{
        e.preventDefault();
        const form = e.target as HTMLFormElement;

        setSubmitDisabled(true);

        if(props.onBeforeSubmit) {
            let blockSubmit = false;
            props.onBeforeSubmit((message: string)=>{
                if(blockSubmit) return;
                blockSubmit = true;
                setErrorMessage(message);
            });

            if(blockSubmit) {
                setSubmitDisabled(false);
                return;
            }
        }
            
        if(props.url!="") {
            try {
                const abort = new AbortController();
    
                setTimeout(()=>abort.abort(),2500);
    
                const response = await fetch(props.url, {
                    method: props.method,
                    body: new URLSearchParams(parseFormData(form,props.ignoreList, props.staticFields)),
                    signal: abort.signal
                });
    
                if(response.ok) {
                    const result: API.IGenericPOSTResponse = await response.json();
                    
                    if(result.status=="Success") props.onSuccess(result);
                    else {
                        const message = await props.onFailure(result);
                        setErrorMessage(message);
                        setSubmitDisabled(false);
                    }
                }
            } catch (error) {
                setErrorMessage("Couldn't perform that request right now. Try again later.");
                console.error(error);
                setSubmitDisabled(false);
            }
        }else {
            setSubmitDisabled(false)
            props.onSuccess({status: "Success", message: "Locally handled request"});
        }

        return false;
    }

    return (
        <form className={classes.Form} onSubmit={submitHandler}>
            <p className={`${classes.ErrorDialog} ${errorMessage!==null?classes.DialogShown:""}`}>
                {errorMessage}
            </p>
            {props.elements}
            <button type="submit" disabled={submitDisabled}>{props.submitCaption}</button>
        </form>
    );
}