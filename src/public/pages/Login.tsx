import React, { useEffect, useState } from "react";

import classes from "./Login.css"
import LogoImg from "../assets/Logo.png";
import LoginForm from "../components/Forms/Login/LoginForm";
import TopPopup from "../components/TopPopup/TopPopup";
import { useNavigate } from "react-router-dom";
import { manageClassState } from "../modules/utils";

import SubmenuHeader from "../components/SubmenuHeader/SubmenuHeader";

import RegisterImg from "../assets/ui/add-user.png";
import KeyImg from "../assets/ui/key.png";
import ContactImg from "../assets/ui/comment.png";
import ForgotPasswordForm from "../components/Forms/ForgotPasswordForm/ForgotPassword";
import { useTranslation } from "react-i18next";

type TPanelTypes = "MainPanel" | "PasswordRecoveryPanel" | "PasswordRecoveryEndPointPanel" | "RegistrationInfoPanel" | "ContactInfoPanel" | "HelpCenterPanel";

export default function Login() {
    const [popupState, setPopupState] = useState<{show: boolean, text: string}>({show: false, text: ""});
    const [activePanel, setActivePanel] = useState<TPanelTypes>("MainPanel");

    const {t} = useTranslation("portals", {keyPrefix: "login"});

    const navigate = useNavigate();
    
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        
        if(params.get("r")) {
            let text = "";
            switch(params.get("r")) {
                case "session_expired":
                    text = t("session-expired-message");
                break;
                case "logout":
                    text = t("logout-message");
                break;
            }
            setPopupState({show: true, text});
            setTimeout(()=>setPopupState({show: false, text}),4000);
        }
        

        const session = document.cookie.replace(/(?:(?:^|.*;\s*)session\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        if(session!="") navigate("/Home",{replace: true});
            

    },[]);



    return (
        <div className={` ${classes.ContentBox} ${activePanel=="PasswordRecoveryPanel"?classes.PasswordRecoveryHeightAdjust:""}`}>
            <div className={`${classes.MainPanel}  `}>
                <img src={LogoImg} alt="Logo picture"></img>
                <LoginForm />
                <button className={classes.ShowOptionsPanel} 
                    onClick={()=>{
                        manageClassState(classes.MainPanel,"inactive",classes.Show);
                        manageClassState(classes.MainPanel,"active",classes.HideMainPanel);
                        setActivePanel("HelpCenterPanel");
                    }}>{t("need-help-link")}</button>
            </div>
            <div className={`${classes.AdditionalPanel} ${classes.HelpCenterPanel} ${activePanel=="HelpCenterPanel"?classes.Show:""}`}>
                <SubmenuHeader headerCaption={t("help-center-section")}
                    actionList={[
                        {target: classes.MainPanel, name: classes.HideMainPanel, action:"inactive"},
                        {target: classes.MainPanel, name: classes.Show, action: "active"}
                    ]}
                    onBackCallback={()=>setActivePanel("MainPanel")}
                />
                <div className={classes.PanelContent}>
                    <div className={classes.ItemPanel} onClick={()=>setActivePanel("PasswordRecoveryPanel")}>
                        <img src={KeyImg} alt="Key"/>
                        <h5>{t("forgot-password-entry")}</h5>
                    </div>
                    <div className={classes.ItemPanel} onClick={()=>setActivePanel("RegistrationInfoPanel")}>
                        <img src={RegisterImg} alt="Signup" />
                        <h5>{t("register-entry")}</h5>
                    </div>
                    <div className={classes.ItemPanel} onClick={()=>setActivePanel("ContactInfoPanel")}>
                        <img src={ContactImg} alt="Message" />
                        <h5>{t("other-problem-entry")}</h5>
                    </div>
                </div>
            </div>
            <div className={`${classes.AdditionalPanel} ${classes.PasswordRecoveryPanel} ${activePanel=="PasswordRecoveryPanel"?classes.Show:""}`}>
                <SubmenuHeader headerCaption={t("password-recovery-section")} onBackCallback={()=>setActivePanel("HelpCenterPanel")} />

                <div className={classes.PanelContent}>
                    <img src="/ilustrations/ForgotPassword.svg" alt="Forgotten password"/>
                    <p>{t("account-recovery-message")}</p>
                    <ForgotPasswordForm isActive={activePanel=="PasswordRecoveryPanel"} onSuccess={()=>setActivePanel("PasswordRecoveryEndPointPanel")}/>
                </div>
            </div>
            <div className={`${classes.AdditionalPanel} ${classes.PasswordRecoveryEndPointPanel} ${activePanel=="PasswordRecoveryEndPointPanel"?classes.Show:""}`}>
                <SubmenuHeader headerCaption={t("password-recovery-section")} onBackCallback={()=>setActivePanel("HelpCenterPanel")} />
                <div className={classes.PanelContent}>
                    <img src="/ilustrations/emailSent.svg" alt="Email with a checkmark" />
                    <h3>{t("account-recovery-header")}</h3>
                    <p>{t("account-recovery-desc")}</p>
                    <h5>{t("account-recovery-email-failure")}</h5>
                    <p>{t("account-recovery-spam-notice")}</p>
                </div>
            </div>
            <div className={`${classes.AdditionalPanel} ${classes.RegistrationInfoPanel} ${activePanel=="RegistrationInfoPanel"?classes.Show:""}`}>
                <SubmenuHeader headerCaption={t("registration-section")} onBackCallback={()=>setActivePanel("HelpCenterPanel")} />
                <div className={classes.PanelContent}>
                    <img src="/ilustrations/workFriends.svg" alt="Friends at work"/>
                    <p>{t("register-notice")}</p>
                </div>
            </div>
            <div className={`${classes.AdditionalPanel} ${classes.ContactInfoPanel} ${activePanel=="ContactInfoPanel"?classes.Show:""}`}>
                <SubmenuHeader headerCaption={t("contact-section")} onBackCallback={()=>setActivePanel("HelpCenterPanel")} />                                                        
                <div className={classes.PanelContent}>
                    <img src="/ilustrations/UnderConstruction.svg" alt="Construction site"/>
                    <p>{t("contact-notice")}</p>
                </div>
            </div>
            <TopPopup text={popupState.text} show={popupState.show} popupReseter={()=>setPopupState({show: false, text: popupState.text})}/>
        </div>
    );
}