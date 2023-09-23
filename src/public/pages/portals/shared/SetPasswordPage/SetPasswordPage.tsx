import React, { useEffect, useState } from "react";

import CustomForm, { CustomFormTypes } from "../../../../components/Forms/CustomForm/CustomForm";
import InputBox from "../../../../components/InputBox/InputBox";
import PasswordStrengthIndicator from "../../../../components/PasswordStrengthIndicator/PasswordStrengthIndicator";

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

    useEffect(()=>{
        setPasswordsMatch(confirmPassword===password&&password!="");
    },[confirmPassword]);

    return (
        <div>
            <h4>Choose your password</h4>
                <CustomForm
                    doReset={false}
                    url={props.url ?? ""}
                    method="POST"
                    onSuccess={()=>{
                        props.onSuccess(password)
                    }}
                    onFailure={async res=>await props.onFailure(res)}
                    submitCaption="Confirm"
                    ignoreList={["confirmPassword"]}
                    staticFields={props.staticFields}
                    onBeforeSubmit={(setError)=>{
                        if(!passwordValid)
                            setError("Password doesn't meet all requirements.");
                        if(!passwordsMatch)
                            setError("Passwords don't match.");
                        setConfirmPassword("");
                    }}
                    elements={[
                        <InputBox key="username" globalID={`SetPassword-username-${Math.round(Math.random()*100)}`} label="Email" formControlID="username" inputType="email" isRequired={false} initialValue={props.username} stateUpdater={()=>{}} autocomplete="off" hidden/>,
                        <InputBox key="password" globalID={`SetPassword-password-${Math.round(Math.random()*100)}`} label="Password" formControlID="password" inputType="password" isRequired initialValue={password} stateUpdater={ev=>setPassword(ev.target.value)} autocomplete="new-password"/>,
                        <PasswordStrengthIndicator key="PasswordStrength" password={password} validator={setPasswordValid}/>,
                        <InputBox key="confirmPassword" globalID={`SetPassword-cpassword-${Math.round(Math.random()*100)}`} label="Confirm password" formControlID="confirmPassword" inputType="password" isRequired initialValue={confirmPassword} stateUpdater={ev=>setConfirmPassword(ev.target.value)} autocomplete="new-password"/>
                    ]}
            />
        </div>
    );
}