import {Settings} from "luxon";
import i18n from "./i18n";

setTimeout(()=>{
    Settings.defaultLocale = i18n.language;
});