import React, { createContext, useState } from "react";

import PuffLoader from "react-spinners/PuffLoader";

import classes from "./WidgetBox.css";

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
                        <h5>That didn't work</h5>
                    </div>
                    <div className={`${classes.LoadingPanel} ${state=="Loading"?classes.Visible:""}`}>
                        <PuffLoader size="80px" color="#4166DC" />
                    </div>
                </div>
            </div>
        </WidgetContext.Provider>
       
    );
}