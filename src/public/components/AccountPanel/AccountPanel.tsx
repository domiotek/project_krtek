import React from "react";
import { Link } from "react-router-dom";

import styles from "./AccountPanel.css";
import commonClasses from "../common.css";

import settingsImg from "../../assets/ui/gray-settings.png";
import logoutImg from "../../assets/ui/exit.png";
import { WebApp } from "../../types/networkAPI";

export namespace AccountPanel {
    export interface IProps {
        variant: "horizontal" | "vertical"
        accountDetails: WebApp.IAccountDetails | null
    }
}

export default function AccountPanel(props: AccountPanel.IProps) {

    if(props.accountDetails) {
        return (
            <div className={`${styles.AccountPanel} ${props.variant=="horizontal"?styles.Horizontal:styles.Vertical}`}>
                <img src={props.accountDetails.accountImage} alt="User Avatar" />
                <div className={styles.TextWrapper}>
                    <h4>{props.accountDetails.accountName}</h4>
                    <span>{props.accountDetails.accountRole}</span>
                </div>
                <div className={styles.ButtonsWrapper}>
                    <Link className={styles.SettingsLink} to="/Account">
                        <img src={settingsImg} alt="Account settings link"/>
                    </Link>
                    <a className={styles.LogoutLink} href="/auth/signout">
                        <img src={logoutImg} alt="Logout link" />
                        <span>Sign out</span>
                    </a>
                </div>
            </div>
        );
    }else {
        return (
            <div className={`${styles.AccountPanel} ${props.variant=="horizontal"?styles.Horizontal:styles.Vertical}`}>
                <div className={`${styles.ProfilePictureImitation} ${commonClasses.PulseLoadingAnimHolder}`}></div>
                <div className={`${styles.TextWrapper} ${styles.TextPlaceholderWrapper}`}>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                </div>
                <div className={`${styles.ButtonsWrapper} ${styles.ButtonsPlaceholderWrapper}`}>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                </div>
            </div>
        );
    }
}