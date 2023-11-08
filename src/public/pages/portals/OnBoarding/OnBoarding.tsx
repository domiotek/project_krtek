import React, { useEffect, useState } from "react";
import SetPasswordPage from "../shared/SetPasswordPage/SetPasswordPage";
import FlowFinishPage from "../shared/FinishPage/FinishPage";

import PortalClasses from "../Portals.css";
import classes from "./OnBoarding.css";

import WelcomeImg from "../../../assets/ilustrations/welcome.svg";
import PersonalInfoImg from "../../../assets/ilustrations/AddInformation.svg";
import SecureLoginImg from "../../../assets/ilustrations/SecureLogin.svg";
import ArrowLeftImg from "../../../assets/ui/left-arrow-angle.png";
import CompleteImg from "../../../assets/ilustrations/complete.svg";

import CustomForm from "../../../components/Forms/CustomForm/CustomForm";
import InputBox from "../../../components/InputBox/InputBox";
import SelectBox from "../../../components/SelectBox/SelectBox";

import { API } from "../../../types/networkAPI";

export default function OnBoardingPortal() {
    const [phase, setPhase] = useState(0);
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [gender, setGender] = useState("o");

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
                <img className={`${phase==0?classes.ActiveImg:""} ${classes.Phase0Image}`} src={WelcomeImg} alt="Welcome sign" />
                <img className={`${phase==1?classes.ActiveImg:""} ${classes.Phase1Image}`} src={PersonalInfoImg} alt="Personal information" />
                <img className={`${phase==2?classes.ActiveImg:""} ${classes.Phase2Image}`} src={SecureLoginImg} alt="Secure login" />
                <img className={`${phase==3?classes.ActiveImg:""} ${classes.Phase3Image}`} src={CompleteImg} alt="Action complete" />
            </div>
            <div className={`${PortalClasses.PageHolder} ${classes.Container}`}>
                <div className={`${PortalClasses.Page} ${classes.WelcomePage} ${phase==0?PortalClasses.Show:""}`}>
                    <h2>Hello!</h2>
                    <p>You've been invited to join our community.</p>
                    <button onClick={()=>setPhase(1)}>Join now!</button>
                </div>
                <div className={`${PortalClasses.Page} ${phase==1?PortalClasses.Show:""}`}>
                    <h3>Enter your information</h3>
                    <CustomForm 
                        doReset={false}
                        url={""}
                        urlParams={null}
                        method="POST"
                        onSuccess={()=>setPhase(2)}
                        onFailure={async ()=>{return "This can't fail"}}
                        submitCaption="Next"
                        elements={[
                            <InputBox key="name" globalID={`OnBoarding-name-${Math.round(Math.random()*100)}`} label="Name" formControlID="name" inputType="text" isRequired initialValue={name} stateUpdater={ev=>setName(ev.target.value)} autocomplete="given-name" pattern="[A-Z]{1}[a-z]{1,}"/>,
                            <InputBox key="surname" globalID={`OnBoarding-surname-${Math.round(Math.random()*100)}`} label="Surname" formControlID="surname" inputType="text" isRequired initialValue={surname} stateUpdater={ev=>setSurname(ev.target.value)} autocomplete="family-name" pattern="[A-Z]{1}[a-z]{1,}"/>,
                            <SelectBox 
                                key="gender" 
                                label="Gender" 
                                formControlID="gender"
                                initialValue={gender}
                                autocomplete="sex" 
                                stateUpdater={ev=>setGender(ev.target.value)} 
                                options={[
                                    {value: "o", displayName: "Other"},
                                    {value: "m", displayName: "Male"},
                                    {value: "f", displayName: "Female"}
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
                                return "User with that email already exists";
                            if(res.errCode=="InvalidEmail" || res.errCode=="InvalidToken") 
                                return "This invite is corrupted. Try getting another one.";
                            return "Couldn't create your account at this time."
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
                    <FlowFinishPage header="All done!" description="Your account has been created. You can login now." buttonCaption="Login" redirectUrl="/Login"/>
                </div>
            </div>
            
            
        </div>
    );
}