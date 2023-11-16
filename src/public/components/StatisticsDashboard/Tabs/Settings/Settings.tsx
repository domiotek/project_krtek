import React, { useEffect, useRef, useState } from "react";

import classes from "./Settings.css";
import commonClasses from "../../../common.css";

import CustomForm, { CustomFormTypes } from "../../../Forms/CustomForm/CustomForm";
import { CurrencyInputBox } from "../../../InputBox/InputBox";
import ManageMilestoneModal from "../../../../modals/ManageMilestone/ManageMilestone";
import { API, WebApp } from "../../../../types/networkAPI";
import { callAPI, render2FloatingPoint } from "../../../../modules/utils";

import EditImage from "../../../../assets/ui/pen.png";
import DeleteImage from "../../../../assets/ui/bin.png";

interface IProps {
    setModalContent: WebApp.TSetModalContent
    reloadStats: ()=>void
}

interface IMilestones {
    [ID: number]: IMilestoneData
}

interface IMilestoneData {
    title: string
    value: number
    changed: boolean
}

export default function SettingsTab(props: IProps) {
    const [wage, setWage] = useState<number>(0);
    const orgWage = useRef<number>(0);
    const [income, setIncome] = useState<number>(0);
    const orgIncome = useRef<number>(0);
    const [milestones, setMilestones] = useState<IMilestones>({});
    const maxMilestoneCount = useRef<number>(0);
    let newMilestoneIDCounter = useRef<number>(-1);
    let removedMilestonesIDList = useRef<number[]>([]);
    let addedMilestonesCount = useRef<number>(0);
    const [disableInputs, setDisableInputs] = useState<boolean>(false);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [changesMade, setChangesMade] = useState<boolean>(false);
    const afterFetchUpdate = useRef<boolean>(false);

    useEffect(()=>{
        return callAPI<API.App.Statistics.GetSettings.IEndpoint>("GET","/api/user/stats-settings",null,
            (data)=>{
                maxMilestoneCount.current = data.maxMilestoneCount;
                orgWage.current = data.wageRate ?? 0;
                setWage(data.wageRate ?? 0);
                orgIncome.current = data.externalIncome ?? 0;
                setIncome(data.externalIncome ?? 0);

                if(data.goal) {
                    const obj: IMilestones = {};

                    for (const milestone of data.goal?.milestones) {
                        obj[milestone.ID] = {
                            title: milestone.title,
                            value: milestone.amount,
                            changed: false
                        }
                    }

                    setMilestones(obj);
                }

                setIsLoading(false);
                afterFetchUpdate.current = true;
            });
    }, []);

    useEffect(()=>{
        if(!isLoading&&!afterFetchUpdate.current) 
            setChangesMade(true);

        afterFetchUpdate.current=false;
    },[newMilestoneIDCounter, removedMilestonesIDList, addedMilestonesCount, wage, income]);

    function renderMilestonePanel(ID: number, milestone: IMilestoneData) {

        function EditMilestoneClickHandler() {
            props.setModalContent(
                <ManageMilestoneModal
                    exit={()=>props.setModalContent(null)} 
                    successCallback={(title, value)=>{
                        const changed =  milestone.title!=title||milestone.value!=value;
                        props.setModalContent(null);
                        milestones[ID] = {
                            title,
                            value,
                            changed
                        }
                        setMilestones(Object.assign({},milestones));
                        if(changed) setChangesMade(true);
                    }} 
                    milestoneInfo={{ID: ID, title: milestone.title, value: milestone.value}}
                />
            )
        }

        function DeleteMilestoneClickHandler() {
            delete milestones[ID];

            if(ID > 0) {
                removedMilestonesIDList.current.push(ID);
            }else {
                addedMilestonesCount.current--;
            }

            setMilestones(Object.assign({},milestones));
        }

        return (
            <li key={ID} className={classes.MilestonePanel}>
                <span>{milestone.title}</span>
                <div className={classes.RightPanel}>
                    <span>{render2FloatingPoint(milestone.value)}zł</span>
                    <div className={classes.ButtonsContainer}>
                        <button type="button" disabled={disableInputs} onClick={EditMilestoneClickHandler}>
                            <img src={EditImage} alt="Edit"/>
                        </button>
                        <button type="button" disabled={disableInputs} onClick={DeleteMilestoneClickHandler}>
                            <img src={DeleteImage} alt="Delete" />
                        </button>
                    </div>
                </div>        
            </li>
        );
    }

    function renderMilestones() {
        const result = [];

        for (const ID in milestones) {
            result.push(renderMilestonePanel(parseInt(ID), milestones[ID]));
        }

        return result;
    }

    function addMilestoneClickHandler() {
        props.setModalContent(
            <ManageMilestoneModal
                exit={()=>props.setModalContent(null)} 
                successCallback={(title, value)=>{
                    props.setModalContent(null);
        
                    milestones[newMilestoneIDCounter.current] = {title, value, changed: true};
                    newMilestoneIDCounter.current--;
                    addedMilestonesCount.current++;
                    setMilestones(milestones);
                }}
                milestoneInfo={null}
            />
        );
    }

    function aggregateFormData() {
        const formData: {[index: string]: string} = {};

        if(wage!=orgWage.current||income!=orgIncome.current) {
            formData["props"] = JSON.stringify({
                wage: wage,
                externalIncome: income
            });
        }
    
        const processedMilestones: API.App.Statistics.IMilestone[] = [];
    
        let changedMilestones = 0;
        for (const ID in milestones) {
            const element = milestones[ID];
            const intID = parseInt(ID);
    
            processedMilestones.push({
                ID: intID,
                title: element.title,
                amount: element.value
            });
            if(element.changed&& intID > 0) changedMilestones++;
        }
    
        formData["milestones"] = JSON.stringify(processedMilestones);
        formData["removedIDList"] = JSON.stringify(removedMilestonesIDList.current);
        formData["addedMilestonesCount"] = addedMilestonesCount.current.toString();
        formData["changedMilestonesCount"] = changedMilestones.toString();

        return formData;
    }

    function onBeforeSubmitHandler(setErrorMessage: (msg:string)=>void, setDynamicFields: (fields: CustomFormTypes.IFieldDefs)=>void) {
        setDisableInputs(true);
        const data = aggregateFormData();

        setDynamicFields(data);
    }

    function renderDummyMilestonePanel() {
        return (
            <li className={`${classes.MilestonePanel} ${classes.DummyMilestonePanel}`}>
                <span className={commonClasses.PulseLoadingAnimHolder}></span>
                <div className={classes.RightPanel}>
                    <span className={commonClasses.PulseLoadingAnimHolder}></span>
                    <div className={classes.ButtonsContainer}>
                        <div className={`${commonClasses.PulseLoadingAnimHolder} ${classes.DummyButton}`}></div>
                        <div className={`${commonClasses.PulseLoadingAnimHolder} ${classes.DummyButton}`}></div>
                    </div>
                </div>        
            </li>
        );
       
    }

    function renderNoMilestonesPanel() {
        return (
            <li className={classes.NoMilestonesPanel}>
                <img src="/ilustrations/NoData.svg" alt="No data"/>
                <h5>No milestones</h5>
            </li>
        );
    }

    if(isLoading) {
        return (
            <div className={`${classes.SettingsTabContainer} ${classes.DummySettingsTabContainer}`}>
                <div className={classes.FormContent}>
                    <div className={classes.GeneralInputsWrapper}>
                        <div className={classes.DummyInput}>
                            <span className={commonClasses.PulseLoadingAnimHolder}></span>
                            <div className={commonClasses.PulseLoadingAnimHolder}></div>
                        </div>
                        <div className={classes.DummyInput}>
                            <span className={commonClasses.PulseLoadingAnimHolder}></span>
                            <div className={commonClasses.PulseLoadingAnimHolder}></div>
                        </div>
                    </div>
                    <div className={classes.GoalSettingsContainer}>
                        <h4>Goal settings</h4>
                        <div className={`${classes.AddMilestoneBtn} ${commonClasses.PulseLoadingAnimHolder} ${classes.DummyAddMilestoneBtn}`}></div>
                        <ul className={classes.MilestoneList}>
                            {renderDummyMilestonePanel()}
                            {renderDummyMilestonePanel()}
                            {renderDummyMilestonePanel()}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }else return (
        <div className={classes.SettingsTabContainer}>
            <p className={`${classes.UnsavedChangesMessage} ${changesMade?classes.Shown:""}`}>
                You have unsaved changes.
            </p>
            <CustomForm<API.App.Statistics.PutSettings.IEndpoint>
                url="/api/user/stats-settings"
                urlParams={null}
                method="PUT"
                onSuccess={()=>{
                    setDisableInputs(false);
                    setChangesMade(false);
                    props.reloadStats();
                }}
                submitCaption="Save"
                doReset={false}
                ignoreList={["wageRate", "income"]}
                onBeforeSubmit={onBeforeSubmitHandler}
            >
                <div className={classes.FormContent}>
                    <div className={classes.GeneralInputsWrapper}>
                        <CurrencyInputBox 
                            globalID="statsSettings_wageRate"
                            label="Wage rate"
                            formControlID="wageRate"
                            initialValue={wage}
                            stateUpdater={val=>setWage(val)}
                            isRequired
                            currencyStr="zł/h"
                            disabled={disableInputs}
                        />
                        <CurrencyInputBox 
                            globalID="statsSettings_income"
                            label="External income"
                            formControlID="income"
                            initialValue={income}
                            stateUpdater={val=>setIncome(val)}
                            isRequired
                            disabled={disableInputs}
                        />
                    </div>
                    <div className={classes.GoalSettingsContainer}>
                        <h4>Goal settings</h4>
                        <button
                            type="button"
                            className={classes.AddMilestoneBtn} 
                            disabled={disableInputs||Object.keys(milestones).length==maxMilestoneCount.current}
                            onClick={addMilestoneClickHandler}
                        >
                            Add milestone
                        </button>
                        <ul className={classes.MilestoneList}>
                            {
                                Object.keys(milestones).length>0?
                                    renderMilestones()
                                :
                                    renderNoMilestonesPanel()
                            }
                        </ul>
                    </div>
                </div>
            </CustomForm>
        </div>  
    );
}