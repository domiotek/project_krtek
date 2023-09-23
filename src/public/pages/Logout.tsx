import React, { useEffect, useState } from "react";

import layoutClasses from "./layouts/MiddleBox.css";
import classes from "./Logout.css";

import RoadSignsImg from "../assets/ilustrations/RoadSigns.svg";
import { useNavigate } from "react-router-dom";
import { API } from "../types/networkAPI";

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
        const abort = new AbortController();

        new Promise<void>(async res=>{
            const response = await fetch("/api/user/basic-user-data",{
                signal: abort.signal
            });

            if(response.ok) {
                const result = await response.json() as API.App.BasicData.TResponse;

                if(result.status=="Success") {
                    setName(result.data.name);
                    setSurname(result.data.surname);
                }else navigate("/login");
            }
            res();
        });

        return ()=>abort.abort();
    },[]);

    return (
        <div className={layoutClasses.MiddleBoxContainer}>
            <div className={layoutClasses.MiddleBox}>
                <div className={`${layoutClasses.Content} ${classes.ContentBox}`}>
                    <img src={RoadSignsImg} alt="Lost at intersection" />
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
            </div>
        </div>
    );
}