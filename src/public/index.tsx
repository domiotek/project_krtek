import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Route, Routes} from "react-router-dom";

import './index.css';
import App from './App';
import Portal from "./pages/Portal";
import SuspenseLoader from './components/Loader/Loader';

import "./modules/i18n";

const PasswordRecoveryPortal = React.lazy(()=>import(/* webpackChunkName: "p_pass_rec" */'./pages/portals/PasswordRecovery/PasswordRecovery'));
const BrokenLinkPortal = React.lazy(()=>import(/* webpackChunkName: "p_inv_lnk" */'./pages/portals/BrokenLink/BrokenLink'));
const OnBoardingPortal = React.lazy(()=>import(/* webpackChunkName: "p_wlcm" */'./pages/portals/OnBoarding/OnBoarding'));
const Login = React.lazy(()=>import(/* webpackChunkName: "login" */"./pages/Login"));
const Logout = React.lazy(()=>import(/* webpackChunkName: "logout" */"./pages/Logout"));
const About = React.lazy(()=>import(/* webpackChunkName: "about" */"./pages/About"));

const Home = React.lazy(()=>import(/* webpackChunkName: "home" */"./pages/Home"));
const BetaIntro = React.lazy(()=>import(/* webpackChunkName: "beta" */"./pages/BetaIntro"));
const MyAccountDetails = React.lazy(()=>import(/* webpackChunkName: "myacc" */"./pages/MyAccount"));
const Schedule = React.lazy(()=>import(/* webpackChunkName: "schd" */"./pages/Schedule"));
const Statistics = React.lazy(()=>import(/* webpackChunkName: "stats" */"./pages/Statistics"));
const Feedback = React.lazy(()=>import(/* webpackChunkName: "fdbck" */"./pages/Feedback"));
const NoPage = React.lazy(()=>import(/* webpackChunkName: "nopage" */"./pages/NoPage"));
const Settings = React.lazy(()=>import(/* webpackChunkName: "settings" */"./pages/Settings"));

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
              <Route path="/Beta" element={<BetaIntro />} />
              <Route path="/Account" element={<MyAccountDetails />} />
              <Route path='/Schedule' element={<Schedule />} />
              <Route path='/Statistics/:tab?' element={<Statistics />} />
              <Route path="/Feedback" element={<Feedback />} />
              <Route path="/Settings" element={<Settings />} />
              <Route path='*' element={<NoPage />} />
          </Route>
          <Route path='/p' element={<Portal />}>
              <Route path="/p/Invite" element={<OnBoardingPortal />} />
              <Route path="/p/ResetPassword" element={<PasswordRecoveryPortal />} />
              <Route path="*" element={<BrokenLinkPortal />} />
          </Route>
          <Route path='/Login' element={<Portal />} >
              <Route index element={<Login />} />
          </Route>
          <Route path="/Logout" element={<Portal />} >
              <Route index element={<Logout />} />
          </Route>
          <Route path="/About" element={<Suspense fallback={<SuspenseLoader />}><About /></Suspense>} />
        </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
