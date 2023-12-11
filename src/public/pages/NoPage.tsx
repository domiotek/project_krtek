import React from "react";
import { Link } from "react-router-dom";
import styles from "./NoPage.css";
import { useTranslation } from "react-i18next";

export default function NoPage(){
    const {t} = useTranslation("not-found");

    return (
        <section className={styles.FlexContainer}>
            <img src="/ilustrations/ResourceNotFound.svg" alt="'404' Image" />
            <div className={styles.MessageHolder}>
                <h3>{t("header")}</h3>
                <p>{t("desc")}</p>
                <Link to="/" className="button">{t("link")}</Link>
            </div>
        </section>
    );
}