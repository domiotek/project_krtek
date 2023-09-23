import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import commonClasses from "../common.css";
import styles from "./NavMenu.css";


import AccountPanel from "../AccountPanel/AccountPanel";
import { WebApp, API } from "../../types/networkAPI";


interface IProps {
    activeTab: string
    accountDetails: WebApp.IAccountDetails | null
}

export default function NavMenu(props: IProps) {
    const [elements, setElements] = useState<API.App.NavMenu.IResponseData[] | null>(null);

    const navigate = useNavigate();

    const createElement = (elem: API.App.NavMenu.IResponseData)=> {
        const tabID = elem.linkDest.substring(1);
        return (
            <li key={`${tabID}NavBarElem`} className={`${styles.ListEntry} ${tabID==props.activeTab||tabID==="Home"&&props.activeTab===""?styles.ActiveTab:""}`} onClick={()=>navigate(elem.linkDest ?? window.location)}>
                <img src={elem.imageName} alt={elem.imageAlt} />
                <span>{elem.displayName}</span>
            </li>
        );
    }

    const createPlaceholder = (i: number)=>{
        return (
            <li key={`placeHolderNavMenuElem-${i}`} className={`${styles.ListEntry} ${styles.Placeholder} ${commonClasses.PulseLoadingAnimHolder}`}></li>
        );
    }


    useEffect(()=>{
        const aborter = new AbortController();

        new Promise<void>(async res=>{
            const response = await fetch("/api/app/nav-menu-entries", {signal: aborter.signal});

            if(response.ok) {
                const result = await response.json() as API.App.NavMenu.TResponse;

                if(result.status=="Success")
                    setElements(result.data);
            }

            res();
        });

        return ()=>aborter.abort();
    }, []);

    return (
        <ul className={styles.NavMenu}>
            {elements?
                elements.map(elem=>createElement(elem))
            :   
                [0,1,2].map(i=>createPlaceholder(i))
            }
           <li className={styles.AccountPanelWrapper}>
                <AccountPanel variant="horizontal" accountDetails={props.accountDetails}/>
           </li>
        </ul>
    )
}