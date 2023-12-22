import React, { useState } from "react";
import InputBox, { CheckBox } from "../../InputBox/InputBox";
import CustomForm from "../CustomForm/CustomForm";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoginForm() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [rememberMe, setRememberMe] = useState<boolean>(false);

    const {t} = useTranslation("portals", {keyPrefix: "login"});
    const {t: tg} = useTranslation("glossary");
    const {t: tc} = useTranslation("common");

    const navigate = useNavigate();

    return (
        <div>
            <CustomForm 
                doReset={false}
                url="/auth/signin"
                urlParams={null}
                method="POST"
                onSuccess={()=>navigate("/Home")}
                onFailure={async (code, err)=>{
                    setPassword("");

                    switch(err) {
                        case "InvalidCredentials": return tg("error-messages.invalid-credentials");
                        default: return tg("error-messages.generic-500");
                    }
                }}
                submitCaption={t("login")}
                elements={[
                    <InputBox key="username" globalID={`Login-username-${Math.round(Math.random()*100)}`} label={tc("email-address")} formControlID="username" inputType="email" stateUpdater={ev=>setEmail(ev.target.value)} isRequired initialValue={email} autocomplete="username"/>,
                    <InputBox key="password" globalID={`Login-password-${Math.round(Math.random()*100)}`} label={tc("password")} formControlID="password" inputType="password" stateUpdater={ev=>setPassword(ev.target.value)} isRequired initialValue={password} autocomplete="current-password"/>,
                    <InputBox key="rememberMeOld" globalID={`Login-rembMe-${Math.round(Math.random()*100)}`} label={t("remember-me")} formControlID="rememberMe" inputType="checkbox" stateUpdater={ev=>setRememberMe(ev.target.checked)} isRequired={false} initialValue={rememberMe}/>,
                    <CheckBox key="rememberMe" globalID={`Login-rembMe-${Math.round(Math.random()*100)}`} label={t("remember-me")} formControlID="rememberMe" stateUpdater={val=>setRememberMe(val)} initialValue={rememberMe} />
                ]}
            />
        </div>
    )
}