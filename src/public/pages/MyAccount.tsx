import React, { useEffect, useState } from "react";

import classes from "./MyAccount.css";
import commonClasses from "../components/common.css";

import { callAPI, renderDate} from "../modules/utils";
import { API } from "../types/networkAPI";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";



function DummyMyAccountDetailsPage() {
    const {t} = useTranslation("account");
    const {t: tc} = useTranslation("common");

    return (
        <div className={`${classes.MyAccountContainer} ${classes.DummyPage}`}>
            <div className={classes.ContentWrapper}>
            <div className={classes.Header}>
                <img src="/ui/user.png" alt="User profile" />
                <h2><span className={commonClasses.PulseLoadingAnimHolder}></span> <span className={commonClasses.PulseLoadingAnimHolder}></span></h2>
                <h6 className={commonClasses.PulseLoadingAnimHolder}></h6>
                <div className={classes.RolesWrapper}>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                </div>
            </div>

            <section className={classes.DetailsSection}>
                <h3>{t("details-section")}</h3>
                <ul className={classes.PropList}>
                    <li>
                        <h4>{tc("email-address")}:</h4> 
                        <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    </li>
                    <li>
                        <h4>{tc("gender")}:</h4>
                        <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    </li>
                    <li>
                        <h4>{tc("password")}:</h4>
                        <div className={classes.SpanLike}>
                            <span className={commonClasses.PulseLoadingAnimHolder}></span>
                            <button className={classes.ChangePasswordBtn} type="button" disabled>{tc("change")}</button>
                        </div>
                        <h5 className={classes.SubDetail}>{tc("last-updated")}: <span className={commonClasses.PulseLoadingAnimHolder}></span></h5>
                        <h6 className={`${classes.SubDetail} ${classes.PasswordNote}`}>{t("password-change-note")}</h6>
                    </li>
                    <li>
                        <h4>{t("joined-section")}:</h4> 
                        <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    </li>
                </ul>
            </section>
            </div>
            
        </div>
    );
}

export default function MyAccountDetailsPage() {
    const [userDetails, setUserDetails] = useState<API.App.UserData.IResponseData | null>(null);
    const {t} = useTranslation("account");
    const {t: tc} = useTranslation("common");
    const {t: tg} = useTranslation("glossary");


    useEffect(()=>{
        return callAPI<API.App.UserData.IEndpoint>("GET","/api/user/details",null,
            data=>setUserDetails(data)
        );
    },[]);

    if(userDetails) {
        return (
            <div className={classes.MyAccountContainer}>
                <div className={classes.ContentWrapper}>
                    <div className={classes.Header}>
                        <img src="/ui/user.png" alt="User profile" />
                        <h2>{userDetails.name} {userDetails.surname}</h2>
                        <h6>{userDetails?.rankName}</h6>
                        <div className={classes.RolesWrapper}>
                            {
                                userDetails.roles.map(val=><span key={val}>{val}</span>)
                            }
                        </div>
                    </div>
        
                    <section className={classes.DetailsSection}>
                        <h3>{t("details-section")}</h3>
                        <ul className={classes.PropList}>
                            <li>
                                <h4>{tc("email-address")}:</h4> 
                                <span>{userDetails?.email}</span>
                            </li>
                            <li>
                                <h4>{tc("gender")}:</h4>
                                <span>{tg("gender",{context: userDetails?.gender ?? ""})}</span>
                            </li>
                            <li>
                                <h4>{tc("password")}:</h4>
                                <div className={classes.SpanLike}>
                                    <span>{t("secret")}</span>
                                    <button className={classes.ChangePasswordBtn} type="button" disabled>{tc("change")}</button>
                                </div>
                                <h5 className={classes.SubDetail}>{tc("last-updated")}: {renderDate(DateTime.fromISO(userDetails.lastPasswordChangeDate),"Unknown")}</h5>
                                <h6 className={`${classes.SubDetail} ${classes.PasswordNote}`}>{t("password-change-note")}</h6>
                            </li>
                            <li>
                                <h4>{t("joined-section")}:</h4> 
                                <span>{renderDate(DateTime.fromISO(userDetails.creationDate),tc("unknown"))}</span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        );
    }else return (<DummyMyAccountDetailsPage />);

    
}