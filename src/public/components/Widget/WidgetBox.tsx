import React, { createContext, useState } from "react";

import PuffLoader from "react-spinners/PuffLoader";

import classes from "./WidgetBox.css";
import { useTranslation } from "react-i18next";

interface IProps {
    children: JSX.Element
    size: "Small" | "Large"
    header: string
    skipLoading?: boolean
}

type TWidgetState = "Loading" | "Ready" | "Unavailable";

export const WidgetContext = createContext<[TWidgetState, (newState: TWidgetState)=>void]>(["Loading",()=>{}]);

export default function WidgetBox(props: IProps) {
    const [state, setState] = useState<TWidgetState>(props.skipLoading?"Ready":"Loading");

    const {t} = useTranslation("home");

    return (
        <WidgetContext.Provider value={[state, setState]}>
            <div className={`${classes.Widget} ${props.size=="Large"?classes.LargeWidget:""}`}>
                <h4>{props.header}</h4>
                <div className={classes.Wrapper}>
                    <div className={`${classes.WidgetContent} ${state==="Ready"?classes.Visible:""}`}>
                        {props.children}
                    </div>
                    <div className={`${classes.ErrorMessage} ${state==="Unavailable"?classes.Visible:""}`}>
                        <img src="/ilustrations/Broken.svg" alt="Broken widget"/>
                        <h5>{t("widget.error-message")}</h5>
                    </div>
                    <div className={`${classes.LoadingPanel} ${state=="Loading"?classes.Visible:""}`}>
                        <PuffLoader size="80px" color="#4166DC" />
                    </div>
                </div>
            </div>
        </WidgetContext.Provider>
       
    );
}