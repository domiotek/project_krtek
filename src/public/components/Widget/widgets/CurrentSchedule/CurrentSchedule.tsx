import React, { useEffect, useState } from "react";

import classes from "./CurrentSchedule.css";
import commonClasses from "../../../common.css";

import { API } from "../../../../types/networkAPI";
import { callAPI } from "../../../../modules/utils";
import { DateTime } from "luxon";

export default function CurrentScheduleWidget() {
    const [data, setData] = useState<API.App.CommonEntities.IWorkdays | null>(null);
    const [fetchFailed, setFetchFailed] = useState<boolean>(false);

    useEffect(()=>{
        return callAPI<API.App.Widgets.CurrentSchedule.IEndpoint>("GET","/api/widgets/current-schedule",null,
            data=>setData(data),
            ()=>setFetchFailed(true));
    }, []);

    function renderPanels(days: API.App.CommonEntities.IWorkdays) {
        const result = [];

        for(const day of days.workDays) {
            const date = DateTime.fromISO(day.date);
            let sl_Employees = "";
            let ll_Employees = [];

            for (const slot of day.slots) {
                if(slot.employeeName)
                    sl_Employees += `${slot.employeeName}, `;
                ll_Employees.push(<li key={slot.ID}>{slot.employeeName}</li>);
            }

            sl_Employees = sl_Employees.substring(0,sl_Employees.length - 2);

            if(sl_Employees.length==0) sl_Employees="No one";

            result.push(
                <li key={day.ID}>
                    <div className={classes.SmallLayout}>
                        <h5>{date.toFormat("EEEE, d"+(date.month!=DateTime.now().month?"/LL":""))}</h5>
                        <h6>{sl_Employees}</h6>
                    </div>
                    <div className={classes.LargeLayout}>
                        <h5>{date.toFormat("EEEE")}</h5>
                        <h6>{date.toFormat("d LLLL")}</h6>
                        <ul className={classes.EmployeeList}>
                            {ll_Employees.length==0?<li>No one</li>:ll_Employees}
                        </ul>
                    </div>
                </li>
            );
        }

        return result;
    }

    function renderDummyContent() {
        const result = [];

        for(let i=0; i < 7; i++) {

            result.push(
                <li key={i} className={classes.DummyContent}>
                    <div className={classes.SmallLayout}>
                        <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                        <h6 className={commonClasses.PulseLoadingAnimHolder}></h6>
                    </div>
                    <div className={classes.LargeLayout}>
                        <h5 className={commonClasses.PulseLoadingAnimHolder}></h5>
                        <h6 className={commonClasses.PulseLoadingAnimHolder}></h6>
                        <ul className={classes.EmployeeList}>
                            <li className={commonClasses.PulseLoadingAnimHolder}></li>
                            <li className={commonClasses.PulseLoadingAnimHolder}></li>
                        </ul>
                    </div>
                </li>
            );
        }

        return result;
    }

    return (
        <div className={classes.WidgetWrapper}>
                {
                    data?
                        <ul className={classes.DayList}>{renderPanels(data)}</ul>
                    :
                        fetchFailed?
                            <div className={classes.Message}>
                                <img src="/ilustrations/BrokenCar.svg" alt="Error"/>
                                <h5>That didn't work</h5>
                            </div>
                        :
                        <ul className={classes.DayList}>{renderDummyContent()}</ul>
                }
            
        </div>
    );
}