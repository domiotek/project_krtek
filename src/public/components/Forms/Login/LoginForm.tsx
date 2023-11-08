import React, { useState } from "react";
import InputBox from "../../InputBox/InputBox";
import CustomForm from "../CustomForm/CustomForm";

import { useNavigate } from "react-router-dom";
import { API } from "../../../types/networkAPI";

export default function LoginForm() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [rememberMe, setRememberMe] = useState<boolean>(false);

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
                        case "InvalidCredentials": return "Invalid email or password.";
                        default: return "Server is experiencing temporary problems. Try again later.";
                    }
                }}
                submitCaption="Login"
                elements={[
                    <InputBox key="username" globalID={`Login-username-${Math.round(Math.random()*100)}`} label="Email" formControlID="username" inputType="email" stateUpdater={ev=>setEmail(ev.target.value)} isRequired initialValue={email} autocomplete="username"/>,
                    <InputBox key="password" globalID={`Login-password-${Math.round(Math.random()*100)}`} label="Password" formControlID="password" inputType="password" stateUpdater={ev=>setPassword(ev.target.value)} isRequired initialValue={password} autocomplete="current-password"/>,
                    <InputBox key="rememberMe" globalID={`Login-rembMe-${Math.round(Math.random()*100)}`} label="Remember me" formControlID="rememberMe" inputType="checkbox" stateUpdater={ev=>setRememberMe(ev.target.checked)} isRequired={false} initialValue={rememberMe}/>
                ]}
            />
        </div>
    )
}