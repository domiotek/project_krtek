import React, { useEffect, useState } from "react";

import subPageClasses from "./SubPages.css";
import classes from "./About.css";
import { callAPI, renderDate } from "../modules/utils";
import { API } from "../types/networkAPI";
import { DateTime } from "luxon";

export default function AboutPage() {
    const [ver, setVer] = useState<API.App.Version.IResponseData | null>(null);

    useEffect(()=>{
        return callAPI<API.App.Version.IEndpoint>("GET","/api/app/version",null,
            (data)=>setVer(data),
            ()=>setVer({version: "?.?.?", buildType: "", buildDate: "Unknown"})
        )
    }, []);

    return (
        <div className={subPageClasses.SubPage}>
            <div className={classes.Wrapper}> 
                <div className={classes.Header}>
                    <a href="/Home"><img src="Logo.png" alt="Logo"/></a>
                    <div>
                        <h2>Project krtek</h2>
                        <h5 className={classes.VerField}>Ver. <span>{ver?.version}-{ver?.buildType}</span> release.</h5> 
                        <h5 className={classes.BuiltOnField}>Built on: {renderDate(DateTime.fromISO(ver?.buildDate ?? ""),"")}</h5>
                        <h5 className={classes.AuthorField}>Author: Damian Omiotek (<a href="mailto: damianomiotek@outlook.com">damianomiotek@outlook.com</a>)</h5>
                    </div>
                </div>
                <div>
                    <h3>Credits</h3>
                    <ul className={classes.CreditsList}>
                        <li>
                            UI-related images have been made by <a href="https://www.flaticon.com/authors/freepik">Freepik</a> from <a href="https://www.flaticon.com">flaticon.com</a>.
                        </li>
                        <li>
                            Ilustrations from <a href="https://undraw.co">undraw.co</a>.
                        </li>
                    </ul>
                   
                </div>
                <section className={classes.AboutSection}>
                    <h3>About</h3>
                    <div>
                        <p>
                            System designed for small pub that allows for managing employees and their schedule.
                        </p>
                        <p>
                            It aims to create an environment, that will allow employees do and find everything related to their job in one place.
                            Since it's focused on closed community, general registrations are blocked.
                        </p>
                        <p>
                            For more details and roadmap of the project visit:<br></br>
                            <a href="https://www.github.com/domiotek/project_krtek">Github repository</a>.
                        </p>
                    </div>
                   
                </section>
                
            </div>
            
        </div>
    );
}