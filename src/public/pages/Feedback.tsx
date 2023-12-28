import React, { useState } from "react";
import classes from "./Feedback.css";
import subPageClasses from "./SubPages.css";
import CustomForm from "../components/Forms/CustomForm/CustomForm";
import InputBox, { CheckBox, TextAreaInputBox } from "../components/InputBox/InputBox";
import SelectBox from "../components/SelectBox/SelectBox";
import { useTranslation } from "react-i18next";
import { API } from "../types/networkAPI";
import { useNavigate } from "react-router-dom";

export default function FeedbackPage() {
    const [type, setType] = useState<"opinion" | "problem">("opinion");
    const [title, setTitle] = useState<string>("");
    const [desc, setDesc] = useState<string>("");
    const [anonymity, setAnonymity] = useState<boolean>(false);

    const [stage, setStage] = useState<0 | 1>(0);

    const {t} = useTranslation("feedback");
    const {t: tc} = useTranslation("common");

    const navigate = useNavigate();

    return (
        <section className={`${subPageClasses.SubPage} ${classes.FeedbackPage}`}>
            <div className={`${classes.Wrapper} ${stage==0?classes.Active:""}`}>
                <h2 className={classes.Header}>{t("header")}</h2>
                <p>{t("desc")}</p>
                <CustomForm<API.App.PostFeedback.IEndpoint> 
                    url="/api/app/feedback"
                    urlParams={null}
                    method="POST"
                    onSuccess={()=>setStage(1)}
                    submitCaption={tc("send")}
                    doReset={false}
                >
                    <SelectBox label={t("type")} formControlID="type" stateUpdater={(e)=>setType(e.target.value as any)} initialValue={type} options={[{displayName: t("opinion"), value: "opinion"}, {displayName: t("problem"), value: "problem"}]} autocomplete="off"/>
                    <InputBox label={t("title")} formControlID="title" globalID="title_FeedbackForm" inputType="text" stateUpdater={e=>setTitle(e.target.value)} initialValue={title} isRequired sizeLimit={50}/>
                    <TextAreaInputBox label={t("details")} formControlID="desc" globalID="desc_FeedbackForm" stateUpdater={e=>setDesc(e.target.value)} initialValue={desc} isRequired sizeLimit={255} />
                    <CheckBox label={t("anonymity")} formControlID="anonymity" globalID="anonymity_FeedbackForm" stateUpdater={setAnonymity} initialValue={anonymity} />
                </CustomForm>
            </div>
            <div className={`${classes.Wrapper} ${classes.SuccessPage} ${stage==1?classes.Active:""}`}>
                <img src="/ilustrations/ThankYou.svg" alt="Thank you" />
                <h2>{t("sp-header")}</h2>
                <p>{t("sp-desc",{context: type})}</p>
                <button onClick={()=>navigate("/Home")}>{tc("go-home")}</button>
            </div>
        </section>
    );
}