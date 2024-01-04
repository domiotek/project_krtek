import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import i18nBackend from "i18next-http-backend";

const availLangs = ["pl", "en"];

const setLang = window.localStorage.getItem("lang") ?? "";

i18n.use(i18nBackend)
    .use(initReactI18next)
    .init({
        load: "languageOnly",
        ns: ["common"],
        lng: availLangs.includes(setLang)?setLang:"pl",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
        supportedLngs: ["pl", "en"],
        backend: {
            loadPath: "/locales/{{lng}}/{{ns}}.json"
        }
    });

export default i18n;