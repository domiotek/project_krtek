import React from "react";

import styles from "./AccountPanelPopup.css"
import AccountPanel from "../AccountPanel/AccountPanel";
import { WebApp } from "../../types/networkAPI";

namespace AccountPanelPopup {
    export interface IProps {
        accountDetails: WebApp.IAccountDetails | null
    }
}

export default function AccountPanelPopup(props: AccountPanelPopup.IProps) {

    return (
        <div className={styles.PopupBox}>
            <AccountPanel variant="vertical" accountDetails={props.accountDetails}/>
        </div>
    );
}