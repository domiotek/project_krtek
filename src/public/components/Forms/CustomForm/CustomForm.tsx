import React, { FormEventHandler, useEffect, useState } from "react";

import classes from "./CustomForm.css"
import { callAPI, parseFormData } from "../../../modules/utils";
import { API } from "../../../types/networkAPI"

export namespace CustomFormTypes {

    export interface IFieldDefs {
        [name: string]: string
    }

    export interface IProps<T extends API.IBaseAPIEndpoint> {
        url: T["url"]
        urlParams: T["urlParams"]
        method: T["method"]
        elements?: JSX.Element[]
        children?: JSX.Element | JSX.Element[]
        onFailure?: (code: number, err: T["errCodes"], errorType: "Server" | "Client")=>Promise<string | undefined>
        onSuccess: (data: T["returnData"])=>void
        onBeforeSubmit?: (setErrorMessage: (text: string)=>void, setDynamicFields: (data: IFieldDefs)=>void)=>void
        submitCaption: string
        doReset: boolean
        ignoreList?: string[]
        staticFields?: IFieldDefs
    }
}

export default function CustomForm<T extends API.IBaseAPIEndpoint>(props: CustomFormTypes.IProps<T>) {
    if(!props.children&&!props.elements)
    throw new Error("No Form elements were given.");

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

        let dynamicFields: CustomFormTypes.IFieldDefs | undefined;

        if(props.onBeforeSubmit) {
            let blockSubmit = false;

            function setErrorMessage(message: string) {
                if(blockSubmit) return;
                blockSubmit = true;
                setErrorMessage(message);
            }

            function setDynamicFields(fields: CustomFormTypes.IFieldDefs) {
                dynamicFields = fields;
            }

            props.onBeforeSubmit(setErrorMessage,setDynamicFields);

            if(blockSubmit) {
                setSubmitDisabled(false);
                return;
            }
        }
 
        if(props.url!="") {
            try {
                const aborter = callAPI(props.method, props.url, props.urlParams, 
                    data=>{
                        setSubmitDisabled(false);
                        props.onSuccess(data);
                    }, async (code, err, type)=>{
                        let message;
                        
                        if(props.onFailure) 
                            message = await props.onFailure(code, err, type);
                        
                        if(message===undefined)
                            message = type=="Server"?
                                "Server is having troubles right now. Try again in a bit."
                               :
                                "Something isn't right. Try reloading.";

                        setErrorMessage(message);
                        setSubmitDisabled(false);
                    }, new URLSearchParams(parseFormData(form,props.ignoreList, props.staticFields, dynamicFields))
                );
                setTimeout(aborter,2500);
            } catch (error) {
                setErrorMessage("This form is broken. Try reloading.");
                console.error(error);
                setSubmitDisabled(false);
            }
        }else {
            setSubmitDisabled(false);
            props.onSuccess({});
        }

        return false;
    }

    return (
        <form className={classes.Form} onSubmit={submitHandler}>
            <p className={`${classes.ErrorDialog} ${errorMessage!==null?classes.DialogShown:""}`}>
                {errorMessage}
            </p>
            {props.elements ?? props.children}
            <button type="submit" disabled={submitDisabled}>{props.submitCaption}</button>
        </form>
    );
}