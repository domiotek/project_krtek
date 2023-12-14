import React, { useEffect, useState } from "react";

import PortalClasses from "../Portals.css";
import classes from "./PasswordRecovery.css";

import FlowFinishPage from "../shared/FinishPage/FinishPage";
import SetPasswordPage from "../shared/SetPasswordPage/SetPasswordPage";
import { API } from "../../../types/networkAPI";
import { useTranslation } from "react-i18next";

export default function PasswordRecoveryPortal() {
    const [username, setUsername] = useState("");
    const [flowFinished, setFlowFinished] = useState(false);

    const {t} = useTranslation("portals");
    const {t: tg} = useTranslation("glossary");

    useEffect(()=>{
        const abort = new AbortController();
        new Promise<void>(async res=>{
            const result = await fetch(`/auth/GetEmailFromToken?token=${new URLSearchParams(window.location.search).get("token") ?? ""}&type=action`,{signal: abort.signal});
            if(result.ok) {
                const response = await result.json() as API.Auth.GetEmailFromToken.IResponse;
                if(response.status=="Success") {
                    setUsername(response.email ?? "");
                }
            }
            res();
        });

        return ()=>{
            abort.abort();
        }
    },[]);

    return (
        <div className={`${PortalClasses.Portal} ${classes.PasswordRecoveryPortal}`}>
            <img src={`/ilustrations/${flowFinished?"complete":"ForgotPassword"}.svg`} alt={flowFinished?"Action completed":"Forgotten password"}/>
            <div className={`${PortalClasses.PageHolder} ${flowFinished?classes.FinalContentHolder:classes.ContentHolder}`}>
                <div className={`${PortalClasses.Page} ${!flowFinished?PortalClasses.Show:""} `}>
                    <SetPasswordPage 
                        url={"/auth/change/password"} 
                        onSuccess={()=>setFlowFinished(true)} 
                        onFailure={async ()=>tg("error-messages.generic-change-password")}
                        staticFields={{token: new URLSearchParams(window.location.search).get("token") ?? ""}}
                        username={username}
                    />
                </div>
                <div className={`${PortalClasses.Page} ${flowFinished?PortalClasses.Show:""}`}>
                    <FlowFinishPage header={t("rec-pass.header")} description={t("rec-pass.desc")} redirectUrl="/Login" buttonCaption={t("onboarding.go-to-login")}/>
                </div>
            </div>
        </div>
    );
}