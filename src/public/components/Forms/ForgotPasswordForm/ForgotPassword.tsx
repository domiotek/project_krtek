import React, { useEffect, useState } from "react";
import InputBox from "../../InputBox/InputBox";
import CustomForm from "../CustomForm/CustomForm";
import { useTranslation } from "react-i18next";

interface IProps {
    isActive: boolean
    onSuccess: ()=>void
}

export default function ForgotPassword(props: IProps) {
    const [email, setEmail] = useState<string>("");

    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

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
                            return tg("error-messages.generic-500");
                        default:
                        case "Other":
                            return tg("error-messages.generic");
                    }
                }}
                submitCaption={tc("send")}
                elements={[
                    <InputBox label={tc("email-address")} globalID={`ForgotPassword-email-${Math.round(Math.random()*100)}`} formControlID="username" inputType="email" isRequired stateUpdater={ev=>setEmail(ev.target.value)} initialValue={email} key={0}/>
                ]}/>
       </div>
    );
}