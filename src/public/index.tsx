import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Route, Routes} from "react-router-dom";

import './index.css';
import App from './App';
import NoPage from './pages/NoPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Portal from './pages/Portal';
import PasswordRecoveryPortal from './pages/portals/PasswordRecovery/PasswordRecovery';
import BrokenLinkPortal from './pages/portals/BrokenLink/BrokenLink';
import OnBoardingPortal from './pages/portals/OnBoarding/OnBoarding';
import Logout from './pages/Logout';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<App />}>
              <Route index element={<Home />}/>
              <Route path='/Home' element={<Home />}/>
              <Route path="/Announcements" element={<Home />}/>
              <Route path='*' element={<NoPage />} />
          </Route>
          <Route path='/p' element={<Portal />}>
              <Route path="/p/Invite" element={<OnBoardingPortal />} />
              <Route path="/p/ResetPassword" element={<PasswordRecoveryPortal />} />
              <Route path="*" element={<BrokenLinkPortal />} />
          </Route>
          <Route path='/Login' element={<Login />} />
          <Route path="/Logout" element={<Logout />} />
        </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
