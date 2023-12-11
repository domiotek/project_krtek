import React, { useEffect, useState } from "react";
import SetPasswordPage from "../shared/SetPasswordPage/SetPasswordPage";
import FlowFinishPage from "../shared/FinishPage/FinishPage";

import PortalClasses from "../Portals.css";
import classes from "./OnBoarding.css";

import ArrowLeftImg from "../../../assets/ui/left-arrow-angle.png";

import CustomForm from "../../../components/Forms/CustomForm/CustomForm";
import InputBox from "../../../components/InputBox/InputBox";
import SelectBox from "../../../components/SelectBox/SelectBox";

import { API } from "../../../types/networkAPI";
import { useTranslation } from "react-i18next";

export default function OnBoardingPortal() {
    const [phase, setPhase] = useState(3);
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [gender, setGender] = useState("o");

    const {t} = useTranslation("portals", {keyPrefix: "onboarding"});
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");

    useEffect(()=>{
        const abort = new AbortController();
        new Promise<void>(async res=>{
            const result = await fetch(`/auth/GetEmailFromToken?token=${new URLSearchParams(window.location.search).get("token") ?? ""}&type=invite`,{signal: abort.signal});
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
        <div className={`${PortalClasses.Portal} ${PortalClasses.ImageHeader} ${classes.OnBoardingPortal} ${classes[`Phase${phase}`]}`}>
            <button className={`${classes.BackButton} ${phase==2?classes.Visible:""}`} onClick={()=>setPhase(phase - 1)}>
                <img src={ArrowLeftImg} alt="Arrow back"></img>
            </button>
            <div className={PortalClasses.ImageHolder}>
                <img className={`${phase==0?classes.ActiveImg:""} ${classes.Phase0Image}`} src="/ilustrations/welcome.svg" alt="Welcome sign" />
                <img className={`${phase==1?classes.ActiveImg:""} ${classes.Phase1Image}`} src="/ilustrations/AddInformation.svg" alt="Personal information" />
                <img className={`${phase==2?classes.ActiveImg:""} ${classes.Phase2Image}`} src="/ilustrations/SecureLogin.svg" alt="Secure login" />
                <img className={`${phase==3?classes.ActiveImg:""} ${classes.Phase3Image}`} src="/ilustrations/complete.svg" alt="Action complete" />
            </div>
            <div className={`${PortalClasses.PageHolder} ${classes.Container}`}>
                <div className={`${PortalClasses.Page} ${classes.WelcomePage} ${phase==0?PortalClasses.Show:""}`}>
                    <h2>{t("phase0.header")}</h2>
                    <p>{t("phase0.desc")}</p>
                    <button onClick={()=>setPhase(1)}>{t("phase0.forward")}</button>
                </div>
                <div className={`${PortalClasses.Page} ${phase==1?PortalClasses.Show:""}`}>
                    <h3>{t("phase1.header")}</h3>
                    <CustomForm 
                        doReset={false}
                        url={""}
                        urlParams={null}
                        method="POST"
                        onSuccess={()=>setPhase(2)}
                        onFailure={async ()=>{return "This can't fail"}}
                        submitCaption={tc("next")}
                        elements={[
                            <InputBox key="name" globalID={`OnBoarding-name-${Math.round(Math.random()*100)}`} label={t("phase1.name")} formControlID="name" inputType="text" isRequired initialValue={name} stateUpdater={ev=>setName(ev.target.value)} autocomplete="given-name" pattern="[A-Z]{1}[a-z]{1,}"/>,
                            <InputBox key="surname" globalID={`OnBoarding-surname-${Math.round(Math.random()*100)}`} label={t("phase1.surname")} formControlID="surname" inputType="text" isRequired initialValue={surname} stateUpdater={ev=>setSurname(ev.target.value)} autocomplete="family-name" pattern="[A-Z]{1}[a-z]{1,}"/>,
                            <SelectBox 
                                key="gender" 
                                label={tc("gender")}
                                formControlID="gender"
                                initialValue={gender}
                                autocomplete="sex" 
                                stateUpdater={ev=>setGender(ev.target.value)} 
                                options={[
                                    {value: "o", displayName: tg("gender_o")},
                                    {value: "m", displayName: tg("gender_m")},
                                    {value: "f", displayName: tg("gender_f")}
                                ]} 
                            />
                        ]}
                    />
                </div>
                <div className={`${PortalClasses.Page} ${phase==2?PortalClasses.Show:""}`}>
                    <SetPasswordPage 
                        url={"/auth/signup"} 
                        onSuccess={()=>setPhase(3)} 
                        onFailure={async (res: API.Auth.SignUp.IResponse)=>{
                            if(res.errCode=="UserExists")
                                return tg("error-messages.user-exists");
                            if(res.errCode=="InvalidEmail" || res.errCode=="InvalidToken") 
                                return tg("error-messages.invite-corrupted");
                            return tg("error-messages.generic-create-account");
                        }}
                        username={username}
                        staticFields={{
                            token: new URLSearchParams(window.location.search).get("token") ?? "",
                            name,
                            surname,
                            gender
                        }}
                    />
                </div>
                <div className={`${PortalClasses.Page} ${phase==3?PortalClasses.Show:""}`}>
                    <FlowFinishPage header={t("phase3.header")} description={t("phase3.desc")} buttonCaption={t("go-to-login")} redirectUrl="/Login"/>
                </div>
            </div>
            
            
        </div>
    );
}