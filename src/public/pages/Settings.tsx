import React, { useCallback, useMemo, useState } from "react";

import classes from "./Settings.css";
import SelectBox from "../components/SelectBox/SelectBox";
import i18n from "../modules/i18n";
import { Settings } from "luxon";
import ToggleSwitch from "../components/ToggleSwitch/ToggleSwitch";
import { useTranslation } from "react-i18next";


export default function SettingsPage() {
    const [lang, setLang] = useState<string>(i18n.language);

    const {t} = useTranslation("settings");
    const {t: tc} = useTranslation("common");

    const langOpts = ()=>{
        const opts = [];

        const langs = i18n.options.supportedLngs;

        if(langs) {
            for (const lang of langs) {
                if(lang!="cimode") 
                    opts.push({displayName: tc(`langs.${lang}`), value: lang})
            }
        }

        return opts;

    };


    const setLangAction = useCallback((e: React.ChangeEvent<HTMLSelectElement>)=>{
        const langs = i18n.options.supportedLngs;
        if(langs && langs.includes(e.target.value)) {
            i18n.changeLanguage(e.target.value);
            setLang(e.target.value);
            Settings.defaultLocale = e.target.value;
            window.localStorage.setItem("lang", e.target.value);
        }
    },[]);

    return (
        <div className={classes.Page}>
            <h2>{t("header")}</h2>

            <section>
                <h4>{t("language.header")}</h4>
                <p className={classes.SectionDesc}>{t("language.desc")}</p>

                <div className={classes.SelectWrapper}>
                    <SelectBox label="" formControlID="" initialValue={lang} stateUpdater={setLangAction} options={langOpts()}  autocomplete="off" /> 
                </div>
            </section>
            <section>
                <h4>{t("experiments.header")}</h4>

                <p className={classes.SectionDesc}>{t("experiments.desc")}</p>

                <h5 className={classes.NoExperimentsText}>{t("experiments.no-items")}</h5>
                {/* <ul className={classes.ExperimentsList} >

                </ul> */}

                <p className={classes.AlertBox}>
                    <img src="/ui/alert.png" alt="Warning sign" />
                    {t("experiments.warning-notice")}
                </p>
            </section>

        </div>
    );
}

interface IExperimentProps {
    title: string
    desc: string
    featureID: string
}

const ExperimentPanel = React.memo(function ExperimentPanel(props: IExperimentProps) {

    let featureFlags: {[ID: string]: boolean};

    try {
        featureFlags = JSON.parse(window.localStorage.getItem("featureFlags") ?? "{}");
    } catch (error) {
        featureFlags = {};
    }

    const updateStateAction = (state: boolean)=>{
        featureFlags[props.featureID] = state;
        window.localStorage.setItem("featureFlags",JSON.stringify(featureFlags));
    }

    return (
        <li>
            <div>
                <h5>{props.title}</h5>
                <p>{props.desc}</p>
            </div>
            <div className={classes.ToggleSwitchWrapper}>
                <ToggleSwitch state={featureFlags[props.featureID]===true} onChange={updateStateAction}/>
            </div>
        </li>
    );
});