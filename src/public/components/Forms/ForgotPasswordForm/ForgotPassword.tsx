import React, { useEffect, useState } from "react";
import InputBox from "../../InputBox/InputBox";
import CustomForm from "../CustomForm/CustomForm";
import { API } from "../../../types/networkAPI";

interface IProps {
    isActive: boolean
    onSuccess: ()=>void
}

export default function ForgotPassword(props: IProps) {
    const [email, setEmail] = useState<string>("");

    useEffect(()=>{
        setEmail("");
    },[props.isActive]);

    return (
       <div>
            <CustomForm 
                doReset={props.isActive}
                url="/auth/recover"
                urlParams={null}
                method="POST"
                onSuccess={res=>props.onSuccess()}
                onFailure={ async (code, err)=>{
                    switch(err) {
                        case "DBError":
                        case "MailerError":
                        case "NoConnection":
                            return "Server is facing temporary server-side error. Try again later."
                        default:
                        case "Other":
                            return "Something went wrong. Try again in a bit."
                    }
                }}
                submitCaption="Send"
                elements={[
                    <InputBox label="Email" globalID={`ForgotPassword-email-${Math.round(Math.random()*100)}`} formControlID="username" inputType="email" isRequired stateUpdater={ev=>setEmail(ev.target.value)} initialValue={email} key={0}/>
                ]}/>
       </div>
    );
}