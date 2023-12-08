import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import i18nBackend from "i18next-http-backend";

i18n.use(i18nBackend)
    .use(initReactI18next)
    .init({
        load: "languageOnly",
        ns: ["common"],
        debug: true,
        lng: "pl",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: "/locales/{{lng}}/{{ns}}.json"
        }
    });

export default i18n;