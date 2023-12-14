import React, { useEffect, useState, useTransition } from "react";

import CustomForm, { CustomFormTypes } from "../../../../components/Forms/CustomForm/CustomForm";
import InputBox from "../../../../components/InputBox/InputBox";
import PasswordStrengthIndicator from "../../../../components/PasswordStrengthIndicator/PasswordStrengthIndicator";
import { useTranslation } from "react-i18next";

interface IProps {
    url: string | null
    onSuccess: (password: string)=>void
    onFailure: (response: any)=>Promise<string>
    staticFields?: CustomFormTypes.IFieldDefs
    username: string | null
}

export default function SetPasswordPage(props: IProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordValid, setPasswordValid] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);

    const {t} = useTranslation("portals", {keyPrefix: "pass-page"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    useEffect(()=>{
        setPasswordsMatch(confirmPassword===password&&password!="");
    },[confirmPassword]);

    return (
        <div>
            <h4>{t("header")}</h4>
                <CustomForm
                    doReset={false}
                    url={props.url ?? ""}
                    urlParams={null}
                    method="POST"
                    onSuccess={()=>{
                        props.onSuccess(password)
                    }}
                    onFailure={async res=>await props.onFailure(res)}
                    submitCaption={tc("confirm")}
                    ignoreList={["confirmPassword"]}
                    staticFields={props.staticFields}
                    onBeforeSubmit={(setError)=>{
                        if(!passwordValid)
                            setError(tg("error-messages.password-req-not-met"));
                        if(!passwordsMatch)
                            setError(tg("error-messages.passwords-mismatch"));
                        setConfirmPassword("");
                    }}
                    elements={[
                        <InputBox key="username" globalID={`SetPassword-username-${Math.round(Math.random()*100)}`} label={tc("email-address")} formControlID="username" inputType="email" isRequired={false} initialValue={props.username} stateUpdater={()=>{}} autocomplete="off" hidden/>,
                        <InputBox key="password" globalID={`SetPassword-password-${Math.round(Math.random()*100)}`} label={tc("password")} formControlID="password" inputType="password" isRequired initialValue={password} stateUpdater={ev=>setPassword(ev.target.value)} autocomplete="new-password"/>,
                        <PasswordStrengthIndicator key="PasswordStrength" password={password} validator={setPasswordValid}/>,
                        <InputBox key="confirmPassword" globalID={`SetPassword-cpassword-${Math.round(Math.random()*100)}`} label={t("confirm-password")} formControlID="confirmPassword" inputType="password" isRequired initialValue={confirmPassword} stateUpdater={ev=>setConfirmPassword(ev.target.value)} autocomplete="new-password"/>
                    ]}
            />
        </div>
    );
}