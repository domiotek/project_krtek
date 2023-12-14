import React, { useEffect, useState } from "react";

import subPageClasses from "./SubPages.css";
import classes from "./About.css";
import { callAPI, renderDate } from "../modules/utils";
import { API } from "../types/networkAPI";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
    const [ver, setVer] = useState<API.App.Version.IResponseData | null>(null);

    const {t} = useTranslation("about");

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
                        <h5 className={classes.BuiltOnField}>{t("builton")}: {renderDate(DateTime.fromISO(ver?.buildDate ?? ""),"")}</h5>
                        <h5 className={classes.AuthorField}>{t("author")}: Damian Omiotek (<a href="mailto: damianomiotek@outlook.com">damianomiotek@outlook.com</a>)</h5>
                    </div>
                </div>
                <div>
                    <h3>{t("credits")}</h3>
                    <ul className={classes.CreditsList}>
                        <li>
                           {t("freepik-credit")}<a href="https://www.flaticon.com/authors/freepik">Freepik</a> {t("from")} <a href="https://www.flaticon.com">flaticon.com</a>.
                        </li>
                        <li>
                            {t("undraw-credit")}<a href="https://undraw.co">undraw.co</a>.
                        </li>
                    </ul>
                   
                </div>
                <section className={classes.AboutSection}>
                    <h3>{t("about")}</h3>
                    <div>
                        <p>
                            {t("desc-1")}
                        </p>
                        <p>
                            {t("desc-2")}
                        </p>
                        <p>
                            {t("desc-3")}
                            <br />
                            <a href="https://www.github.com/domiotek/project_krtek">{t("github-link")}</a>.
                        </p>
                    </div>
                   
                </section>
                
            </div>
            
        </div>
    );
}