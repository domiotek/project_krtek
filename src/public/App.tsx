import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './App.css';
import accountPanelStyles from './components/AccountPanelPopup/AccountPanelPopup.css';
import commonClasses from "./components/common.css";

import { API, WebApp } from './types/networkAPI';

import logoImg from "./assets/Logo.png";
import hamburgerImg from "./assets/ui/hamburger.png"
import userImg from "./assets/ui/user.png"

import NavMenu from './components/NavMenu/NavMenu';
import FooterContent from './components/FooterContent/FooterContent';
import AccountPanelPopup from './components/AccountPanelPopup/AccountPanelPopup';
import { callAPI, manageClassState } from './modules/utils';
import Modal from './components/Modal/Modal';
import useScrollBlocker from './hooks/useScrollBlocker/useScrollBlocker';

export default function App() {
    const [userData, setUserData] = useState<WebApp.IAccountDetails | null>(null);

	const [activeTab, setActiveTab] = useState(window.location.pathname.substring(1));

    const [modalContent, setModalContent] = useState<JSX.Element | null>(null);

     const [blockScroll, allowScroll] = useScrollBlocker(styles.BlockScroll);

    if(modalContent) blockScroll();
    else allowScroll();

	useEffect(()=>{
		setActiveTab(window.location.pathname.substring(1));
		manageClassState(styles.NavBar,"inactive",styles.OpenNavBar);
		manageClassState(accountPanelStyles.PopupBox,"inactive",accountPanelStyles.OpenPopupBox);
	}, [useLocation()]);

    useEffect(()=>{
        return callAPI<API.App.BasicData.IEndpoint>("GET","/api/user/basic-data", null, (data=>{
            setUserData({
                accountName: data.name,
                accountRole: data.rankName,
                accountImage: userImg
            });
        }));
    },[]);

	useEffect(() => {
		function handleResize() {
			if(document.body.clientWidth > 1200) 
				manageClassState(accountPanelStyles.PopupBox,"inactive",accountPanelStyles.OpenPopupBox);
		}
  
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

    return (
      <div className={styles.App}>
          <section className={styles.Header}>
              <button type='button' className={styles.HamburgerButton} onClick={()=>manageClassState(styles.NavBar,"toggle",styles.OpenNavBar)}>
                  <img src={hamburgerImg} alt="Hamburger menu image"></img>
              </button>
              <Link className={styles.LogoLink} to="/"><img className={styles.Logo} src={logoImg} alt="App Logo"/></Link>
              <button type="button" className={styles.AccountButton} onClick={()=>manageClassState(accountPanelStyles.PopupBox, "toggle", accountPanelStyles.OpenPopupBox)}>
                  {userData?
                  <img src={userImg} alt="Account image" />
                  :
                  <span className={`${styles.HeaderProfilePicturePlaceholder} ${commonClasses.PulseLoadingAnimHolder}`}></span>
                  }
              </button>
          </section>
          <section className={styles.ContentBox}> 
            <section className={`${styles.NavBar}`}>
                <NavMenu activeTab={activeTab} accountDetails={userData}/>
                <section className={styles.MiniFooter}>
                    <FooterContent />
                </section>
            </section>
            <Outlet context={[userData, setModalContent]}/>
          </section>
          <section className={styles.Footer}>
                <FooterContent />
          </section>
          <AccountPanelPopup accountDetails={userData}/>
          <div className='Modal'>{modalContent?<Modal>{modalContent}</Modal>:""}</div>
      </div>
    );
}
