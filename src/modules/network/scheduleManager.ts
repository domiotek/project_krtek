import { DateTime } from "luxon";
import { MysqlError } from "mysql";


export class ScheduleManager implements WebAPI.Schedule.IScheduleManager {
    private readonly _db: WebAPI.Mysql.IMysqlController;

    constructor(mysqlConn: WebAPI.Mysql.IMysqlController) {
        this._db = mysqlConn;
    }

    public async getWorkDay(when: DateTime, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.ScheduleManager.TGetWorkDayResult> {
        let result: WebAPI.Schedule.ScheduleManager.TGetWorkDayResult = {
            result: "NoConnection"
        }

        if(!when.isValid) {
            result.result = "InvalidDate"
            return result;
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const response = await this._db.performQuery<"Select">("SELECT * FROM work_days WHERE date=?",[when.toISODate()],connection);

            if(response) {
                switch(response.length) {
                    case 1:
                        result = {
                            result: "Success",
                            data: new WorkDay(response[0]["workDayID"],this._db,when, response[0]["note"])
                        }
                        if(!conn) connection.release();
                        return result;
                    default:
                        this._db.reportMysqlError(new Error(`[DB][Schedule] Invalid state for workday on '${when.toISODate()}'. Detected more than one entry(${response.length}).`) as MysqlError);
                    case 0:
                        const insertResponse = await this._db.performQuery<"Other">("INSERT INTO work_days(date) VALUES(?);",[when.toISODate()], connection);
                        if(insertResponse) {
                            if(insertResponse.affectedRows==1) {
                                result = {
                                    result: "Success",
                                    data: new WorkDay(insertResponse.insertId,this._db, when, null)
                                }

                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                return result;
                            }else result.result = "DBError";
                        }else result.result = this._db.getLastQueryFailureReason();
                    break;
                }
            }else result.result = this._db.getLastQueryFailureReason();

            if(!conn) {
                connection.rollback();
                connection.release();
            }
        }

        return result;
    }

    public async getUserShifts(userID: number, from?: WebAPI.Schedule.ScheduleManager.IDateRangeOptions | undefined): Promise<WebAPI.Schedule.ScheduleManager.TGetUserShiftsResult> {
        let result: WebAPI.Schedule.ScheduleManager.TGetUserShiftsResult = {
            result: "NoConnection"
        }

        const connection = await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const userExists = await global.app.webAuthManager.userExists(userID);

            if(userExists) {
                let rangeStr = "";
                let rangeErr = true;

                if(from) {
                    switch(true) {
                        case from.after!=undefined&&from.before!=undefined:
                            if(from.after?.isValid&&from.before?.isValid) {

                                if(from.after > from.before && from.after!= from.before) {
                                    rangeErr = false;
                                    rangeStr = `AND date BETWEEN '${from.before.toISODate()}' AND '${from.after.toISODate()}'`;
                                }
                            }
                        break;
                        case from.before!=undefined&&from.before.isValid:
                            rangeErr = false;
                            rangeStr = `AND date < '${from.before?.toISODate()}'`;
                        break;
                        case from.after!=undefined&&from.after.isValid:
                            rangeErr = false;
                            rangeStr = `AND date > '${from.after?.toISODate()}'`;
                        break;
                    }
                }else rangeErr = false;

                if(!rangeErr) {
                    const query = `SELECT workDayID, privateSlotID, date, note FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? ${rangeStr};`;

                    const response = await this._db.performQuery<"Select">(query, [userID], connection);

                    if(response) {
                        result = {
                            result: "Success",
                            data: {
                                shifts: [],
                                userSlots: []
                            }
                        }

                        for (const row of response) {
                            result.data.shifts.push(new WorkDay(row["workDayID"],this._db,DateTime.fromJSDate(row["date"]),row["note"]));
                            result.data.userSlots.push(row["privateSlotID"]);
                        }
                    }else result.result = this._db.getLastQueryFailureReason();
                }else result.result = "InvalidRange";
            }else result.result = "InvalidUser";

            connection.release();
        }

        return result;
    }

    public getCurrentWeek(): Promise<WebAPI.Schedule.ScheduleManager.TGetWeekResult> {
        return this.getWeek(DateTime.now());
    }

    public async getWeek(ofDay: DateTime): Promise<WebAPI.Schedule.ScheduleManager.TGetWeekResult> {
        let result: WebAPI.Schedule.ScheduleManager.TGetWeekResult = {
            result: "NoConnection"
        }

        if(!ofDay.isValid) {
            result.result = "InvalidDate";
            return result;
        }

        const connection = await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();

            const beginDate = DateTime.fromObject({weekNumber: ofDay.weekNumber});
            
            result = {
                result: "Success",
                data: []
            }

            for(let i=0; i < 7; i++) {
                const date = beginDate.plus({days: i});
                
                const workDay = await this.getWorkDay(date, connection);

                if(workDay.result=="Success") {
                    result.data.push(workDay.data);
                }else {
                    connection.rollback();
                    connection.release();
                    return {result: this._db.getLastQueryFailureReason()}
                }
            }


            connection.commit();
            connection.release();
        }

        return result;
    }
}

class WorkDay implements WebAPI.Schedule.IWorkDay {
    private _workDayID: number;
    private _db: WebAPI.Mysql.IMysqlController;
    private _note: string | null;
    private _date: DateTime;

    private static readonly MAX_SLOT_COUNT = 10;

    constructor(workDayID: number, db: WebAPI.Mysql.IMysqlController,date: DateTime, note: string | null) {
        this._workDayID = workDayID;
        this._db = db;
        this._note = note;
        this._date = date;
    }

    public get note() {
        return this._note;
    }

    public get date() {
        return this._date;
    }

    public async setNote(newNote: string | null): Promise<WebAPI.Schedule.WorkDayAPI.TSetNoteResult> {

        if(newNote&&newNote.length > 255) {
            return "NoteTooLong";
        }

        const response = await this._db.performQuery<"Other">("UPDATE work_days SET note=? WHERE workDayID=?",[newNote, this._workDayID]);

        if(response) {
            if(response.affectedRows==1) {
                this._note = newNote;
                return true; 
            }else return "DBError";
        }else return this._db.getLastQueryFailureReason();
    }

    public async getSlot(id: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.TGetSlotResult> {
        let result: WebAPI.Schedule.WorkDayAPI.TGetSlotResult = {
            result: "InvalidSlot"
        }

        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=? AND privateSlotID=?;",[this._workDayID, id],conn);

        if(response) {
            if(response.length==1) {
                const data = response[0];
                result = {
                    result: "Success",
                    data: {
                        requiredRole: data["roleName"],
                        plannedStartTime: DateTime.fromFormat(data["plannedStartTime"],"HH:mm:ss"),
                        plannedEndTime: DateTime.fromFormat(data["plannedStartTime"],"HH:mm:ss"),
                        assignedShift: data["shiftID"]!=null?new Shift(data["shiftID"],this._db,data["userID"],data["startTime"], data["endTime"]):null
                    }
                }
            }
        }else result.result= this._db.getLastQueryFailureReason();

       return result;
    }

    public async getSlotIDs(conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.TGetSlotIDsResult> {
        let result: WebAPI.Schedule.WorkDayAPI.TGetSlotIDsResult = {
            result:"DBError"
        }

        const response = await this._db.performQuery<"Select">("SELECT privateSlotID FROM shift_slots WHERE workDayID=?;",[this._workDayID], conn);
 
        if(response) {
            result = {
                result: "Success",
                data: []
            } 

            for (const row of response) {
                result.data.push(row["privateSlotID"]);
            }
        }else result.result = this._db.getLastQueryFailureReason();

        return result;
    }

    public async getAllSlots(): Promise<WebAPI.Schedule.WorkDayAPI.TGetAllSlots> {
        let result: WebAPI.Schedule.WorkDayAPI.TGetAllSlots = {
            result: "DBError"
        }

        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=?;",[this._workDayID]);

        if(response) {
            result = {
                result: "Success",
                data: {}
            }

            for (const row of response) {
                result.data[row["privateSlotID"]] = {
                    requiredRole: row["roleName"],
                    plannedStartTime: DateTime.fromFormat(row["plannedStartTime"],"HH:mm:ss"),
                    plannedEndTime: DateTime.fromFormat(row["plannedStartTime"],"HH:mm:ss"),
                    assignedShift: row["shiftID"]!=null?new Shift(row["shiftID"],this._db,row["userID"],row["startTime"], row["endTime"]):null
                };
            }
        }else result.result= this._db.getLastQueryFailureReason();

        return result;
    }

    public async addSlot(requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined): Promise<WebAPI.Schedule.WorkDayAPI.TAddSlot> {
        let result: WebAPI.Schedule.WorkDayAPI.TAddSlot = "InvalidDateTimeInput";

        if(startTime.isValid&&(endTime?endTime.isValid:true)) {
            const connection = await this._db.getConnection();

            if(connection) {
                connection.beginTransaction();
                const roleID = await global.app.webAuthManager.getRoleID(requiredRole);
                
                if(roleID.result!="Success") {
                    return "InvalidRole"
                }

                const IDs = await this.getSlotIDs(connection);

                let nextID;

                if(IDs.result=="Success") {
                    for(let i=0; i<WorkDay.MAX_SLOT_COUNT; i++) {
                        if(!IDs.data.includes(i)) {
                            nextID = i;
                            break;
                        }
                    }

                    if(nextID!==undefined) {
                        const response = await this._db.performQuery<"Other">("INSERT INTO shift_slots(workDayID, privateSlotID, plannedStartTime, plannedEndTime, roleRequiredID) VALUES(?,?,?,?,?)",[this._workDayID,nextID,startTime.toFormat("HH:mm:ss"),endTime?.toFormat("HH:mm:ss") ?? null,roleID.data],connection);
                        if(response) {
                            if(response.affectedRows==1) {
                                connection.commit();
                                connection.release();
                                return true;
                            }else return "DBError";
                        }else result = this._db.getLastQueryFailureReason();
                    }else result = "MaxSlotCountReached";
                   
                }else result = this._db.getLastQueryFailureReason();

                connection.rollback();
                connection.release();
            }else result = "NoConnection";
        }
            

        return result;
    }

    public async editSlot(slotID: number, requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined) {
        let result: WebAPI.Schedule.WorkDayAPI.TEditSlotResult = "InvalidDateTimeInput";

        if(startTime.isValid&&(endTime?endTime.isValid:true)) {
            const connection = await this._db.getConnection();

            if(connection) {
                connection.beginTransaction();
                const roleID = await global.app.webAuthManager.getRoleID(requiredRole);
                
                if(roleID.result!="Success") {
                    return "InvalidRole"
                }

                const query = "UPDATE shift_slots SET plannedStartTime=?, plannedEndTime=?, roleRequiredID=? WHERE workDayID=? AND privateSlotID=?";
                const response = await this._db.performQuery<"Other">(query,[startTime.toFormat("HH:mm:ss"),endTime?.toFormat("HH:mm:ss") ?? null,roleID.data, this._workDayID, slotID],connection);
                if(response) {
                    if(response.affectedRows==1) {
                        connection.commit();
                        connection.release();
                        return true;
                    }else return "DBError";
                }else result = this._db.getLastQueryFailureReason();

                connection.rollback();
                connection.release();
            }else result = "NoConnection";
        }
            

        return result;
    }

    public async deleteSlot(id: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.TDeleteSlot> {
        let result: WebAPI.Schedule.WorkDayAPI.TDeleteSlot = "InvalidSlot";

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const slot = await this.getSlot(id, connection);

            if(slot.result=="Success") {
                
                let canGo: boolean = false;

                if(slot.data.assignedShift) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shifts WHERE shiftID=?",[slot.data.assignedShift.ID]);
    
                    if(response&&response.affectedRows==1) canGo=true;
                }else canGo = true;
                
                if(canGo) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shift_slots WHERE workDayID=? AND privateSlotID=?",[this._workDayID,id]);
    
                    if(response) {
                        if(response.affectedRows==1) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return true;
                        }
                    }else result = this._db.getLastQueryFailureReason();
                }else result = "DBError";
    
            }else result = slot.result;

           
            if(!conn) {
                connection.rollback();
                connection.release();
            }
        }else result = "NoConnection";

        return result;
    }

    public async deleteAllSlots(): Promise<WebAPI._.TGenericActionResult> {
        let result: WebAPI._.TGenericActionResult = "NoConnection";

        const connection = await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            const IDs = await this.getSlotIDs(connection);

            if(IDs.result=="Success") {
                for (const ID of IDs.data) {
                    const response = await this.deleteSlot(ID,connection);
                    if(response!==true) {
                        connection.rollback();
                        connection.release();
                        return "DBError";
                    }
                }
                connection.commit();
                connection.release();
                return true;
            }else result = IDs.result;

            connection.release();
        }

        return result;
    }

    public async assignUser(slotID: number, userID: number): Promise<WebAPI.Schedule.WorkDayAPI.TAssignUserResult> {
        let result: WebAPI.Schedule.WorkDayAPI.TAssignUserResult = "DBError";

        const connection = await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            const slot = await this.getSlot(slotID);

            if(slot.result=="Success") {
                let canProceed = false;

                if(slot.data.assignedShift!==null) {
                    const response = await this.unassignUser(slotID);
                    if(response===true) canProceed=true;
                }else canProceed = true;

                const user = await global.app.webAuthManager.getUser(userID);

                if(user.result!="Success") {
                    connection.release();
                    return "NoUser";
                }

                const roleResult = await global.app.webAuthManager.hasRole(user.data.userID, slot.data.requiredRole);

                if(roleResult!==true) {
                    connection.release();
                    return roleResult===false||roleResult==="InvalidRole"?"UserWithoutRole":roleResult;
                }

                const otherSlotsCheck = await this._db.performQuery<"Select">("SELECT privateSlotID FROM shift_slots NATURAL JOIN shifts WHERE workDayID=? AND userID=?", [this._workDayID, user.data.userID], connection);

                if(otherSlotsCheck) {
                    if(otherSlotsCheck.length>0) {
                        connection.release();
                        return "AlreadyAssigned";
                    }
                }else {
                    connection.release();
                    return this._db.getLastQueryFailureReason();
                }

                if(canProceed) {
                    let response = await this._db.performQuery<"Other">("INSERT INTO shifts(userID, startTime, endTime) VALUES(?,?,?);",[userID,null, null],connection);
                    
                    if(response) {
                        if(response.affectedRows===1) {
                            response = await this._db.performQuery<"Other">("UPDATE shift_slots SET shiftID=? WHERE workDayID=? AND privateSlotID=?",[response.insertId, this._workDayID, slotID],connection);

                            if(response&&response.affectedRows===1) {
                                connection.commit();
                                connection.release();
                                return true;
                            }
                        }
                    }else result = this._db.getLastQueryFailureReason();

                }
            }else result = slot.result;

            connection.rollback();
            connection.release();
        }else result = "NoConnection";

        return result;
    }

    public async unassignUser(slotID: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.TUnassignUserResult> {
        let result: WebAPI.Schedule.WorkDayAPI.TUnassignUserResult = "InvalidSlot";

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const slot = await this.getSlot(slotID, connection);

            if(slot.result=="Success") {
                
                let canProceed: boolean = false;

                if(slot.data.assignedShift) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shifts WHERE shiftID=?",[slot.data.assignedShift.ID]);
    
                    if(response&&response.affectedRows==1) canProceed=true;
                }else canProceed = true;
                
                if(canProceed) {
                    const response = await this._db.performQuery<"Other">("UPDATE shift_slots SET shiftID=null WHERE workDayID=? AND privateSlotID=?",[this._workDayID,slotID]);
    
                    if(response) {
                        if(response.affectedRows==1) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return true;
                        }
                    }else result = this._db.getLastQueryFailureReason();
                }else result = "DBError";
    
            }else result = slot.result;

           
            if(!conn) {
                connection.rollback();
                connection.release();
            }
        }else result = "NoConnection";

        return result;
    }

}


class Shift implements WebAPI.Schedule.IShift {
    private _shiftID: number;
    private _startTime: luxon.DateTime;
    private _endTime: luxon.DateTime | null;
    private _userID: number;
    private _db: WebAPI.Mysql.IMysqlController;


    constructor(shiftID: number, db: WebAPI.Mysql.IMysqlController,userID: number, startTime: luxon.DateTime, endTime: luxon.DateTime) {
        this._shiftID = shiftID;
        this._startTime = startTime;
        this._endTime = startTime;
        this._db = db;
        this._userID = userID;
    }

    toJSON() {
        const result = {
            shiftID: this._shiftID,
            startTime: this._startTime,
            endTime: this._endTime,
            userID: this._userID
        }
        return result;
    }

    public get ID(): number {
        return this._shiftID;
    }

    public get startTime(): luxon.DateTime {
        return this._startTime;
    }

    public get endTime(): luxon.DateTime | null {
        return this._endTime;
    }

    public async getUser(): Promise<WebAPI.Schedule.ShiftAPI.TGetUserResult> {
        const result = await global.app.webAuthManager.getUser(this._userID);

        if(result.result=="Success") return result;
        else return {result: "NoUser"}
    }

    public async updateData(startTime: luxon.DateTime, endTime: luxon.DateTime): Promise<WebAPI.Schedule.ShiftAPI.TUpdateDataResult> {
        let result: WebAPI.Schedule.ShiftAPI.TUpdateDataResult = "InvalidInput";

        if(startTime.isValid&&endTime.isValid&&endTime > startTime) {
            const response = await this._db.performQuery("UPDATE shifts SET startTime=?, endTime=? WHERE shiftID=?",[startTime.toISO(), endTime.toISO(), this._shiftID]);
            if(response) {
                if((response as WebAPI.Mysql.IMysqlQueryResult).affectedRows==1) {
                    this._startTime = startTime;
                    this._endTime = endTime;
                    return true;
                }else return "InvalidShift";
            }else result = this._db.getLastQueryFailureReason();
        }

        return result;
    }

}