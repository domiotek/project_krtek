import React, { useEffect, useState } from "react";
import { API, WebApp } from "../../../../types/networkAPI";

import classes from "./Shifts.css";

import EditShiftModal from "../../../../modals/EditShift/EditShift";
import AddShiftModal from "../../../../modals/AddShift/AddShift";
import ShiftPanel from "./ShiftPanel";
import { LoadingShiftsView, NoFilterResultsMessage, NoShiftsMessage } from "./Views";
import FilterBox from "../../../FilterBox/FilterBox";
import { DateTime } from "luxon";


import eFilterImg from "../../../../assets/ui/empty_filter.png";
import fFilterImg from "../../../../assets/ui/filled_filter.png";
import { useNavigate } from "react-router-dom";

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
            roles.push([roleData.name, roleData.displayName]);
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
                        Filter
                    </button>
                    <button type="button" className={classes.AddShiftButton} onClick={addShiftClickHandler}>
                        Add shift
                    </button>
                </div>
                <div className={`${classes.FilterBox} ${filterBoxActive?classes.Active:""}`}>
                    <FilterBox<IShiftFilters, keyof IShiftFilters>
                        rules={{
                            "states": {
                                name: "States",
                                values:[
                                    ["Assigned", "Planned"],
                                    ["Pending", "Pending"],
                                    ["Finished", "Finished"]
                                ]
                            },
                            "days": {
                                name: "Week days",
                                values: [
                                    ["1", "Monday"],
                                    ["2", "Tuesday"],
                                    ["3", "Wednesday"],
                                    ["4", "Thursday"],
                                    ["5", "Friday"],
                                    ["6", "Saturday"],
                                    ["7", "Sunday"]
                                ]
                            },
                            "roles": {
                                name: "Roles",
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