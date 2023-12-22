import React, { useState } from "react";
import classes from "./Feedback.css";
import subPageClasses from "./SubPages.css";
import CustomForm from "../components/Forms/CustomForm/CustomForm";
import InputBox, { CheckBox, TextAreaInputBox } from "../components/InputBox/InputBox";
import SelectBox from "../components/SelectBox/SelectBox";
import { useTranslation } from "react-i18next";

export default function FeedbackPage() {
    const [type, setType] = useState<"opinion" | "problem">("opinion");
    const [title, setTitle] = useState<string>("");
    const [desc, setDesc] = useState<string>("");
    const [annonymity, setAnnonymity] = useState<boolean>(false);

    const {t} = useTranslation("feedback");
    const {t: tc} = useTranslation("common");

    return (
        <section className={`${subPageClasses.SubPage} ${classes.FeedbackPage}`}>
            <div className={classes.Wrapper}>
                <h2 className={classes.Header}>{t("header")}</h2>
                <p>{t("desc")}</p>
                <CustomForm 
                    url=""
                    urlParams={null}
                    method="POST"
                    onSuccess={()=>{}}
                    submitCaption={tc("send")}
                    doReset={false}
                >
                    <SelectBox label={t("type")} formControlID="type" stateUpdater={(e)=>setType(e.target.value as any)} initialValue={type} options={[{displayName: t("opinion"), value: "opinion"}, {displayName: t("problem"), value: "problem"}]} autocomplete="off"/>
                    <InputBox label={t("title")} formControlID="title" globalID="title_FeedbackForm" inputType="text" stateUpdater={e=>setTitle(e.target.value)} initialValue={title} isRequired sizeLimit={50}/>
                    <TextAreaInputBox label={t("details")} formControlID="desc" globalID="desc_FeedbackForm" stateUpdater={e=>setDesc(e.target.value)} initialValue={desc} isRequired sizeLimit={255} />
                    <CheckBox label={t("anonymity")} formControlID="annonymity" globalID="annonymity_FeedbackForm" stateUpdater={setAnnonymity} initialValue={annonymity} />
                </CustomForm>
            </div>
        </section>
    );
}