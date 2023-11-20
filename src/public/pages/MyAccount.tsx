import React, { useEffect, useState } from "react";

import classes from "./MyAccount.css";
import commonClasses from "../components/common.css";

import { callAPI, renderDate, renderGender } from "../modules/utils";
import { API } from "../types/networkAPI";
import { DateTime } from "luxon";



function DummyMyAccountDetailsPage() {
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
                <h3>Details</h3>
                <ul className={classes.PropList}>
                    <li>
                        <h4>Email address:</h4> 
                        <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    </li>
                    <li>
                        <h4>Gender:</h4>
                        <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    </li>
                    <li>
                        <h4>Password:</h4>
                        <div className={classes.SpanLike}>
                            <span className={commonClasses.PulseLoadingAnimHolder}></span>
                            <button className={classes.ChangePasswordBtn} type="button" disabled>Change</button>
                        </div>
                        <h5 className={classes.SubDetail}>Last changed: <span className={commonClasses.PulseLoadingAnimHolder}></span></h5>
                        <h6 className={`${classes.SubDetail} ${classes.PasswordNote}`}>To change password, logout and use 'I forgot my password' option. Sorry, not ready yet. 😕</h6>
                    </li>
                    <li>
                        <h4>Joined:</h4> 
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


    useEffect(()=>{
        return callAPI<API.App.UserData.IEndpoint>("GET","/api/user/details",null,
            data=>setUserDetails(data),
            (status, errCode)=>{
                
            }
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
                        <h3>Details</h3>
                        <ul className={classes.PropList}>
                            <li>
                                <h4>Email address:</h4> 
                                <span>{userDetails?.email}</span>
                            </li>
                            <li>
                                <h4>Gender:</h4>
                                <span>{renderGender(userDetails?.gender ?? "")}</span>
                            </li>
                            <li>
                                <h4>Password:</h4>
                                <div className={classes.SpanLike}>
                                    <span>{"<Secret>"}</span>
                                    <button className={classes.ChangePasswordBtn} type="button" disabled>Change</button>
                                </div>
                                <h5 className={classes.SubDetail}>Last changed: {renderDate(DateTime.fromISO(userDetails.lastPasswordChangeDate),"Unknown")}</h5>
                                <h6 className={`${classes.SubDetail} ${classes.PasswordNote}`}>To change password, logout and use 'I forgot my password' option. Sorry, not ready yet. 😕</h6>
                            </li>
                            <li>
                                <h4>Joined:</h4> 
                                <span>{renderDate(DateTime.fromISO(userDetails.creationDate),"Unkown")}</span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        );
    }else return DummyMyAccountDetailsPage();

    
}