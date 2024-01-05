import React, { useEffect, useMemo, useState } from "react";
import { API, WebApp } from "../../../../types/networkAPI";

import classes from "./Shifts.css";

import EditShiftModal from "../../../../modals/EditShift/EditShift";
import AddShiftModal from "../../../../modals/AddShift/AddShift";
import ShiftPanel from "./ShiftPanel";
import { LoadingShiftsView, NoFilterResultsMessage, NoShiftsMessage } from "./Views";
import FilterBox from "../../../FilterBox/FilterBox";
import { DateTime, Info } from "luxon";
import eFilterImg from "../../../../assets/ui/empty_filter.png";
import fFilterImg from "../../../../assets/ui/filled_filter.png";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { handleImport } from "../../../../modules/utils";
import FallbackForm from "../../../LazyLoadFallbackForm/LazyLoadFallbackForm";
import NewShiftPanel from "./NewShiftPanel";

type IShiftFilters = {
    states: {
        name: string
        values: Array<[("Assigned" | "Pending" | "Finished"), string]>
    }
    days: {
        name: string
        values: Array<[("1" | "2" | "3" | "4" | "5" | "6" | "7"), string]>
    }
    roles: {
        name: string
        values: Array<[string,string]>
    }
}

type IShiftFiltersState = {
    [k in keyof IShiftFilters]: Set<IShiftFilters[k]["values"][0][0]>
}


interface IProps {
    shiftsData: API.App.Statistics.IParsedUserShifts | null;
    roles: API.App.GetRoles.IRoleDetails[] | null
    wage: number | null
    setModalContent: WebApp.TSetModalContent
    reloadStats: ()=>void
}

export default function ShiftsTab(props: IProps) {
    const [expandedShiftID, setExpandedShiftID] = useState<number | null>(null);
    const [filters, setFilters] = useState<IShiftFiltersState>({states: new Set(), days: new Set(), roles: new Set()});
    const [filterRoles, setFilterRoles] = useState<[string, string][] | null>(null);
    const [filterBoxActive, setFilterBoxActive] = useState<boolean>(false);
    const [filteringActive, setFilteringActive] = useState<boolean>(false);

    const navigate = useNavigate();
    const {t} = useTranslation("statistics",{keyPrefix: "shifts-tab"});
    const {t: tg} = useTranslation("glossary");

    const useNewModal = useMemo(()=>{
        try {
            let flags = JSON.parse(localStorage.getItem("featureFlags") ?? "{}");
            return flags["NewShiftModal"];
        } catch (error) {
            return false;
        }
    },[]);

    const weekDayLabels = Info.weekdays();
    
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        
        if(["assigned", "pending", "finished"].includes(params.get("state")?.toLowerCase() ?? "")) {
            const newState = Object.assign({},filters);
            newState["states"].add(params.get("state") as any);
            setFilters(newState);
        }

        navigate("/Statistics/Shifts", {replace: true});
        
    },[]);

    useEffect(()=>{
        const roles: Array<[string, string]> = [];
        for (const roleData of props.roles ?? []) {
            roles.push([roleData.name, tg(`roles.${roleData.name}`)]);
        }
        
        setFilterRoles(roles);
    }, [props.roles]);

    useEffect(()=>{
        let count = 0;
        for (const key in filters) {
            count += filters[key as keyof typeof filters].size;
        }
        setFilteringActive(count > 0);
    },[filters]);

    const ShiftOverviewModal = React.useMemo(()=>React.lazy(()=>
        handleImport(import(/* webpackChunkName: "ShiftOverviewModal" */"../../../../modals/WorkDayOverview/ShiftOverview"),
        <FallbackForm button={{caption: "close", action: ()=>{}}} />
    )),[]);

    function toggleExpandShiftState(this: number) {
        if(expandedShiftID!=this) setExpandedShiftID(this);
        else setExpandedShiftID(null);
    }

    function checkWithFilter<N extends keyof IShiftFilters = keyof IShiftFilters>(name: N, value: IShiftFilters[N]["values"][0][0]) {
        const rule = filters[name];

        if(rule&&(rule.size==0||rule.has(value)))
            return true;
        
        return false;
    }

    function renderShifts(elements: API.App.Statistics.IParsedUserShifts) {
        let result = [];

        function showEditModal(this: [API.App.Statistics.UserShifts.IWorkDay<"OnlyAssigned">, number]) {
            props.setModalContent(
                <EditShiftModal 
                    exit={()=>props.setModalContent(null)} 
                    successCallback={()=>{props.setModalContent(null); props.reloadStats()}} 
                    shiftData={this[0]} 
                    userSlot={this[0].slots[this[1]] as any}
                />
            )
        }

        function showNewModal(this: string) {
            props.setModalContent(
                <ShiftOverviewModal 
                    exit={()=>props.setModalContent(null)} 
                    successCallback={()=>{props.setModalContent(null); props.reloadStats()}}
                    targetDate={DateTime.fromISO(this)} 
                    targetView={"Shift"}
                />
            )
        }

        for (let i=0; i < elements.shifts.length; i++) {
            const ownerSlot = elements.shifts[i].slots[elements.userSlots[i]] as API.App.Statistics.UserShifts.IAssignedShiftSlot;
            const weekDay = DateTime.fromISO(elements.shifts[i].date).weekday;

            if(!checkWithFilter("days",weekDay.toString() as any))
                continue;

            if(!checkWithFilter("states", ownerSlot.status as Exclude<API.App.Statistics.UserShifts.IShiftSlot["status"],"Unassigned">))
                continue;

            if(!checkWithFilter("roles", ownerSlot.requiredRole))
                continue;

            result.push(
                useNewModal?
                <NewShiftPanel key={elements.shifts[i].ID} 
                    workDay = {elements.shifts[i]}
                    userSlot = {elements.userSlots[i]}
                    calcStats = {elements.calcStats[i]}
                    wage = {props.wage as number}
                    showNewModal = {showNewModal.bind(elements.shifts[i].date)}
                />
                :
                <ShiftPanel key={elements.shifts[i].ID} 
                    workDay = {elements.shifts[i]}
                    userSlot = {elements.userSlots[i]}
                    calcStats = {elements.calcStats[i]}
                    renderExpanded = {elements.shifts[i].ID===expandedShiftID}
                    expandToggler = {toggleExpandShiftState}
                    wage = {props.wage as number}
                    showEditModal={showEditModal.bind([elements.shifts[i], elements.userSlots[i]])}
                />
            );

            
        }

        if(result.length==0) {
            result.push(<NoFilterResultsMessage />);
        }

        return result;
    }

    function renderControlsHeader() {

        function addShiftClickHandler() {
            props.setModalContent(
                <AddShiftModal 
                    exit={()=>props.setModalContent(null)} 
                    successCallback={()=>{props.setModalContent(null); props.reloadStats()}} 
                />
            )
        }

        function filterClickHandler() {
            setFilterBoxActive(!filterBoxActive);
        }

        return (
            <div key="ControlsHeader" className={classes.ControlsHeader}>
                <div className={classes.ButtonRow}>
                    <button type="button" className={classes.FilterButton} onClick={filterClickHandler}>
                        <img src={filteringActive?fFilterImg:eFilterImg} alt="Filter icon"/>
                        {t("filter-label")}
                    </button>
                    <button type="button" className={classes.AddShiftButton} onClick={addShiftClickHandler}>
                        {t("new-shift-label")}
                    </button>
                </div>
                <div className={`${classes.FilterBox} ${filterBoxActive?classes.Active:""}`}>
                    <FilterBox<IShiftFilters, keyof IShiftFilters>
                        rules={{
                            "states": {
                                name: t("shift-state-label"),
                                values:[
                                    ["Assigned", tg("shift-states.assigned")],
                                    ["Pending", tg("shift-states.pending")],
                                    ["Finished", tg("shift-states.finished")]
                                ]
                            },
                            "days": {
                                name: t("week-days-label"),
                                values: [
                                    ["1", weekDayLabels[0]],
                                    ["2", weekDayLabels[1]],
                                    ["3", weekDayLabels[2]],
                                    ["4", weekDayLabels[3]],
                                    ["5", weekDayLabels[4]],
                                    ["6", weekDayLabels[5]],
                                    ["7", weekDayLabels[6]]
                                ]
                            },
                            "roles": {
                                name: t("roles-label"),
                                values: filterRoles ?? []
                                
                            }
                        }}
                        state={filters}
                        setState={setFilters}
                    />
                </div>
            </div>
            
        );
    }

    return (
        <div className={classes.ShiftsWrapper}>
            {
                props.shiftsData?
                    [
                        renderControlsHeader(),
                        props.shiftsData.userSlots.length>0? renderShifts(props.shiftsData) : <NoShiftsMessage key="NoShiftsContainer" />
                    ]
                :
                    <LoadingShiftsView />
            }
        </div>
    );
}