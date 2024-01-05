import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import classes from "./FooterContent.css";

export default function FooterContent() {
    const {t} = useTranslation("common");

    return (
        <span className={classes.FooterContent}>
            <i>&copy; 2024 {t("footer")}</i> 
            <Link to="/About">{t("footerLink")}</Link>
        </span>
    );
}