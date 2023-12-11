import React, { useEffect, useState } from "react";

import PortalClasses from "../Portals.css";
import classes from "./BrokenLink.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function BrokenLinkPortal() {
    const [isServerIssue, setIsServerIssue] = useState(false);
    const navigate = useNavigate();

    const {t} = useTranslation("portals", {keyPrefix: "brk-link"});

    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        
        if(params.get("issue")=="ServerError") 
            setIsServerIssue(true) 
    },[]);

    return (
        <div className={`${PortalClasses.Portal} ${classes.BrokenLinkPortal}`}>
            <img src="/ilustrations/BrokenCar.svg" alt="Broken"/>
            <h3>{t("header")}</h3>
            <p>
                {isServerIssue?
                    t("desc_server")
                :
                    t("desc_client")
                }
            </p>
            <button type="button" onClick={()=>navigate("/Login")}>{t("link")}</button>
        </div>
    )
}