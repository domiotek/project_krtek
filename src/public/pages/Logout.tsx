import React, { useEffect, useState } from "react";

import classes from "./Logout.css";

import { useNavigate } from "react-router-dom";
import { API } from "../types/networkAPI";
import { callAPI } from "../modules/utils";
import { useTranslation } from "react-i18next";

export default function Logout() {
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [gender, setGender] = useState("");

    const {t} = useTranslation("portals", {keyPrefix: "logout"});


    const navigate = useNavigate();

    async function clickHandler() {
        const result = await fetch("/auth/signout?redr=0",{
            method: "GET"
        });

        if(!result.ok) {  
            document.cookie = ""; 
        }

        const params = new URLSearchParams(window.location.search);
        const nextUrl = params.get("then");
        if(nextUrl) window.location.replace(nextUrl);
        else navigate("/Login", {replace: true})

    }

    useEffect(()=>{
        return callAPI<API.App.BasicData.IEndpoint>("GET","/api/user/basic-data", null, data=>{
            setName(data.name);
            setSurname(data.surname);
            setGender(data.gender);
        }, ()=>{
            navigate("/login");
        });
    },[]);

    return (
        <div className={`${classes.ContentBox}`}>
            <img src="/ilustrations/RoadSigns.svg" alt="Lost at intersection" />
            <h3>{t("header")}</h3>
            <p>
                {t("desc-1", {context: gender=="f"?"female":"male"})}
                <span className={`${classes.LoadingFields} ${name==""?classes.ActiveAnim:""}`}>
                    <span></span>
                    <span></span>
                </span>
                <span className={name==""?classes.Hide:classes.ShowData}>{name} {surname}</span>
                {t("desc-2", {context: gender=="f"?"female":"male"})}
            </p>
            <button type="button" onClick={clickHandler}>{t("action")}</button>
        </div>
    );
}