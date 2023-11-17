import React, { useEffect, useState } from "react";

import classes from "./Logout.css";

import { useNavigate } from "react-router-dom";
import { API } from "../types/networkAPI";
import { callAPI } from "../modules/utils";

export default function Logout() {
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");


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
        }, ()=>{
            navigate("/login");
        });
    },[]);

    return (
        <div className={`${classes.ContentBox}`}>
            <img src="/ilustrations/RoadSigns.svg" alt="Lost at intersection" />
            <h3>Log out to continue</h3>
            <p>
                You are currently logged in as:
                <span className={`${classes.LoadingFields} ${name==""?classes.ActiveAnim:""}`}>
                    <span></span>
                    <span></span>
                </span>
                <span className={name==""?classes.Hide:classes.ShowData}>{name} {surname}</span>
                To access the requested website, you can't be signed in.
            </p>
            <button type="button" onClick={clickHandler}>Logout and continue</button>
        </div>
    );
}