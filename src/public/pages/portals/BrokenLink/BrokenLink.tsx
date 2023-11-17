import React, { useEffect, useState } from "react";

import PortalClasses from "../Portals.css";
import classes from "./BrokenLink.css";
import { useNavigate } from "react-router-dom";

export default function BrokenLinkPortal() {
    const [isServerIssue, setIsServerIssue] = useState(false);
    const navigate = useNavigate();

    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        
        if(params.get("issue")=="ServerError") 
            setIsServerIssue(true) 
    },[]);

    return (
        <div className={`${PortalClasses.Portal} ${classes.BrokenLinkPortal}`}>
            <img src="/ilustrations/BrokenCar.svg" alt="Broken"/>
            <h3>This link doesn't work</h3>
            <p>
                {isServerIssue?
                    "But it's not your fault! We ran into a problem. Try again in a moment and if the issue persists, please contact us - we will be happy to help."
                :
                    "This link is invalid or already expired."
                }
            </p>
            <button type="button" onClick={()=>navigate("/Login")}>Go home</button>
        </div>
    )
}