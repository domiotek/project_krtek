import React, { useEffect, useRef, useState } from "react";
import {DragDropContext, Draggable, DropResult, Droppable, DroppableProvided} from "@hello-pangea/dnd";

import classes from "./Settings.css";
import commonClasses from "../../../common.css";

import CustomForm, { CustomFormTypes } from "../../../Forms/CustomForm/CustomForm";
import { CurrencyInputBox } from "../../../InputBox/InputBox";
import ManageMilestoneModal from "../../../../modals/ManageMilestone/ManageMilestone";
import { API, WebApp } from "../../../../types/networkAPI";
import { callAPI, render2FloatingPoint } from "../../../../modules/utils";

import EditImage from "../../../../assets/ui/pen.png";
import DeleteImage from "../../../../assets/ui/bin.png";
import DragImage from "../../../../assets/ui/drag.png";

interface IProps {
    setModalContent: WebApp.TSetModalContent
    reloadStats: ()=>void
}

type Milestones = Array<IMilestoneData>;

interface IMilestoneData {
    ID: number
    title: string
    value: number
    changed: boolean
}

export default function SettingsTab(props: IProps) {
    const [wage, setWage] = useState<number>(0);
    const orgWage = useRef<number>(0);
    const [income, setIncome] = useState<number>(0);
    const orgIncome = useRef<number>(0);

    const [milestones, setMilestones] = useState<Milestones>([]);

    const maxMilestoneCount = useRef<number>(0);
    let newMilestoneIDCounter = useRef<number>(-1);
    let removedMilestonesIDList = useRef<number[]>([]);
    let addedMilestonesCount = useRef<number>(0);
    let reorderedMilestones = useRef<boolean>(false);

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
                    const arr: Milestones = [];

                    for (let i=0; i < data.goal.milestones.length; i++) {
                        const milestone = data.goal?.milestones[i];
                        arr.push({
                            ID: milestone.ID,
                            title: milestone.title,
                            value: milestone.amount,
                            changed: false
                        });
                    }

                    setMilestones(arr);
                }

                setIsLoading(false);
                afterFetchUpdate.current = true;
            });
    }, []);

    useEffect(()=>{
        if(!isLoading&&!afterFetchUpdate.current) 
            setChangesMade(true);

        afterFetchUpdate.current=false;
    },[newMilestoneIDCounter.current, removedMilestonesIDList.current, addedMilestonesCount.current, reorderedMilestones.current, wage, income]);

    function renderMilestonePanel(milestone: IMilestoneData, index: number) {

        function EditMilestoneClickHandler() {
            props.setModalContent(
                <ManageMilestoneModal
                    exit={()=>props.setModalContent(null)} 
                    successCallback={(title, value)=>{
                        const changed =  milestone.title!=title||milestone.value!=value;
                        props.setModalContent(null);

                        milestones[index] = {
                            ID: milestone.ID,
                            title,
                            value,
                            changed
                        }
                        setMilestones([...milestones]);
                        if(changed) setChangesMade(true);
                    }} 
                    milestoneInfo={{ID: milestone.ID, title: milestone.title, value: milestone.value}}
                />
            )
        }

        function DeleteMilestoneClickHandler(this: number) {
            const arr = [...milestones];

            arr.splice(index,1);

            if(milestone.ID > 0) {
                removedMilestonesIDList.current.push(milestone.ID);
            }else {
                addedMilestonesCount.current--;
            }

            setMilestones(arr);
            setChangesMade(true);
        }

        return (
            <Draggable draggableId={`${milestone.ID}`} index={index} key={milestone.ID}>
                {(provided, snapshot)=>(
                    <li ref={provided.innerRef} className={`${classes.MilestonePanel} ${snapshot.isDragging?classes.DraggedPanel:""}`} {...provided.draggableProps} >
                        <span>{milestone.title}</span>
                        <div className={classes.RightPanel}>
                            <span>{render2FloatingPoint(milestone.value)}zł</span>
                            <div className={classes.ButtonsContainer}>
                                <button type="button" disabled={disableInputs} onClick={EditMilestoneClickHandler.bind(index)}>
                                    <img src={EditImage} alt="Edit" />
                                </button>
                                <button type="button" disabled={disableInputs} onClick={DeleteMilestoneClickHandler.bind(index)}>
                                    <img src={DeleteImage} alt="Delete" />
                                </button>
                            </div>
                        </div> 
                        <i className={classes.DragSurface} {...provided.dragHandleProps}>
                            <img src={DragImage} alt="Drag here"/>    
                        </i>       
                    </li>
                )}
            </Draggable>
        );
    }

    function addMilestoneClickHandler() {
        props.setModalContent(
            <ManageMilestoneModal
                exit={()=>props.setModalContent(null)} 
                successCallback={(title, value)=>{
                    props.setModalContent(null);
        
                    milestones.push({
                        ID: newMilestoneIDCounter.current,
                        title, 
                        value, 
                        changed: true
                    });
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
        for (const element of milestones) {
    
            processedMilestones.push({
                ID: element.ID,
                title: element.title,
                amount: element.value
            });
            if(element.changed&& element.ID > 0) changedMilestones++;
        }
    
        formData["milestones"] = JSON.stringify(processedMilestones);
        formData["removedIDList"] = JSON.stringify(removedMilestonesIDList.current);
        formData["addedMilestonesCount"] = addedMilestonesCount.current.toString();
        formData["changedMilestonesCount"] = changedMilestones.toString();
        formData["reorderedMilestones"] = reorderedMilestones.current.toString();

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
            <div className={classes.NoMilestonesPanel}>
                <img src="/ilustrations/NoData.svg" alt="No data"/>
                <h5>No milestones</h5>
            </div>
        );
    }

    function MilestoneReorderHandler({ destination, source }: DropResult) {
        // dropped outside the list
        if (!destination) return;
        
        const newMilestones = Array.from(milestones);
        const [removed] = newMilestones.splice(source.index, 1);
        newMilestones.splice(destination.index, 0, removed);

        setMilestones(newMilestones);
        reorderedMilestones.current = true;
    };

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
                        <div className={classes.MilestoneList}>
                            {
                                Object.keys(milestones).length>0?
                                    <DragDropContext onDragEnd={MilestoneReorderHandler}>
                                        <Droppable droppableId="list">
                                            {(provided)=>(
                                                <ul ref={provided.innerRef} {...provided.droppableProps}>
                                                    {
                                                        milestones.map(renderMilestonePanel)
                                                    }
                                                    {provided.placeholder}
                                                </ul>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                :
                                    renderNoMilestonesPanel()
                            }
                           
                        </div>
                    </div>
                </div>
            </CustomForm>
        </div>  
    );
}