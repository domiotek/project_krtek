import { DateTime } from "luxon";
import { MysqlError } from "mysql";
import { APIError } from "../util.js";

class ScheduleAPIError extends APIError<"Schedule"> {
    constructor(errCode: WebAPI.APIErrors<"Schedule">) {
        super(ScheduleManager.name, errCode);
    }
}

/**
 * WebAuthManager expanded with the ability to pass connections to the methods.
 * Normally hidden within public interface.
 */
type InternalWebAuthManager = import("./webAuthManager.js").WebAuthManager;

export class ScheduleManager implements WebAPI.Schedule.IScheduleManager {
    private readonly _db: WebAPI.Mysql.IMysqlController;

    constructor(mysqlConn: WebAPI.Mysql.IMysqlController) {
        this._db = mysqlConn;
    }

    public async getWorkDay(when: DateTime, conn?: WebAPI.Mysql.IPoolConnection) {

        if(!when.isValid) {
            return null;
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const response = await this._db.performQuery<"Select">("SELECT * FROM work_days WHERE date=?",[when.toISODate()],connection);
            let errCode: WebAPI.APIErrors<"Schedule">;

            if(response) {
                switch(response.length) {
                    case 1:
                        if(!conn) connection.release();
                        return new WorkDay(response[0]["workDayID"],this._db,when, response[0]["note"]);
                    default:
                        this._db.reportMysqlError(new Error(`[DB][Schedule] Invalid state for workday on '${when.toISODate()}'. Detected more than one entry(${response.length}).`) as MysqlError);
                        errCode = "DBError";
                    case 0:
                        const insertResponse = await this._db.performQuery<"Other">("INSERT INTO work_days(date) VALUES(?);",[when.toISODate()], connection);
                        if(insertResponse) {
                            if(insertResponse.affectedRows==1) {
                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                return new WorkDay(insertResponse.insertId,this._db, when, null);
                            }else errCode = "DBError";
                        }else errCode = this._db.getLastQueryFailureReason();
                    break;
                }
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async getUserShifts(userID: number, from?: WebAPI.Schedule.ScheduleManager.IDateRangeOptions | undefined, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.ScheduleManager.IUserShifts> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const userExists = await (global.app.webAuthManager as InternalWebAuthManager).userExists(userID, connection);

            let errCode: WebAPI.APIErrors<"Schedule"> | null = null;

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
                    const query = `SELECT workDayID, privateSlotID, date, note FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? ${rangeStr} ORDER BY date ASC;`;

                    const response = await this._db.performQuery<"Select">(query, [userID], connection);

                    if(response) {
                        const result: WebAPI.Schedule.ScheduleManager.IUserShifts = {
                            shifts: [],
                            userSlots: []
                        }

                        for (const row of response) {
                            result.shifts.push(new WorkDay(row["workDayID"],this._db,DateTime.fromJSDate(row["date"]),row["note"]));
                            result.userSlots.push(row["privateSlotID"]);
                        }

                        if(!conn) connection.release();
                        return result;
                    }else errCode = this._db.getLastQueryFailureReason();
                }else errCode = "InvalidRange";
            }else errCode = "NoUser";

            connection.release();
            if(errCode) throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public getCurrentWeek(): Promise<WebAPI.Schedule.IWorkDay[]> {
        return this.getWeek(DateTime.now()) as Promise<WebAPI.Schedule.IWorkDay[]>;
    }

    public async getWeek(ofDay: DateTime, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.IWorkDay[] | null> {
        if(!ofDay.isValid) {
            return null;
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const beginDate = DateTime.fromObject({weekNumber: ofDay.weekNumber});
            
            const result = [];

            for(let i=0; i < 7; i++) {
                const date = beginDate.plus({days: i});
                
                const workDay = await this.getWorkDay(date, connection);

                if(workDay) {
                    result.push(workDay);
                }else {
                    connection.release();
                    throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
                }
            }
            if(!conn) {
                connection.commit();
                connection.release();
            }
            
            return result;
        }

        throw new ScheduleAPIError("NoConnection");
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

    public get ID() {
        return this._workDayID;
    }

    public get note() {
        return this._note;
    }

    public get date() {
        return this._date;
    }

    public async setNote(newNote: string | null, conn?: WebAPI.Mysql.IPoolConnection): Promise<void> {

        if(newNote&&newNote.length > 255) {
            throw new ScheduleAPIError("NoteTooLong");
        }

        const response = await this._db.performQuery<"Other">("UPDATE work_days SET note=? WHERE workDayID=?",[newNote, this._workDayID], conn);

        if(!response || response.affectedRows!=1) {
            conn?.release();
            throw new ScheduleAPIError(response?"DBError":this._db.getLastQueryFailureReason());
        }
        
        this._note = newNote;

    }

    public async getSlot(id: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.IShiftSlot | null> {
        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=? AND privateSlotID=?;",[this._workDayID, id],conn);

        if(response) {
            if(response.length==1) {
                const data = response[0];
                const shift = data["shiftID"]!=null?new Shift(data["shiftID"],this._db,data["userID"],data["startTime"]?DateTime.fromISO(data["startTime"]):null, data["endTime"]?DateTime.fromISO(data["endTime"]):null):null;

                let status: WebAPI.Schedule.WorkDayAPI.IShiftSlot["status"];

                if(shift) {
                    if(shift.startTime&&shift.endTime) status = "Finished";
                    else {
                        if(DateTime.now().startOf("day") < this._date.startOf("day")) status = "Assigned";
                        else status = "Pending";
                    }
                }else status = "Unassigned";

                return {
                    status,
                    requiredRole: data["roleName"],
                    plannedStartTime: DateTime.fromFormat(data["plannedStartTime"],"HH:mm:ss"),
                    plannedEndTime: data["plannedEndTime"]?DateTime.fromFormat(data["plannedEndTime"],"HH:mm:ss"):null,
                    assignedShift: shift
                }
            }else return null;
        }
        
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async getSlotIDs(conn?: WebAPI.Mysql.IPoolConnection): Promise<number[]> {
        const response = await this._db.performQuery<"Select">("SELECT privateSlotID FROM shift_slots WHERE workDayID=?;",[this._workDayID], conn);
 
        if(response) {
            const result =  [];

            for (const row of response) {
                result.push(row["privateSlotID"]);
            }

            return result;
        }
        
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async getAllSlots(conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.ISlots> {
        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=?;",[this._workDayID], conn);

        if(response) {
            const result: WebAPI.Schedule.WorkDayAPI.ISlots = {};

            const statusCache: WebAPI.Schedule.WorkDayAPI.IShiftSlot["status"] = DateTime.now().startOf("day") < this._date.startOf("day")?"Assigned":"Pending";

            for (const row of response) {
                const shift = row["shiftID"]!=null?new Shift(row["shiftID"],this._db,row["userID"],row["startTime"]?DateTime.fromISO(row["startTime"]):null, row["endTime"]?DateTime.fromISO(row["endTime"]):null):null;

                let status: WebAPI.Schedule.WorkDayAPI.IShiftSlot["status"];
                if(shift) {
                    if(shift.startTime&&shift.endTime) status = "Finished";
                    else status = statusCache;
                }else status = "Unassigned";

                result[row["privateSlotID"]] = {
                    status,
                    requiredRole: row["roleName"],
                    plannedStartTime: DateTime.fromFormat(row["plannedStartTime"],"HH:mm:ss"),
                    plannedEndTime: row["plannedEndTime"]?DateTime.fromFormat(row["plannedEndTime"],"HH:mm:ss"):null,
                    assignedShift: shift
                };
            }
            
            return result;
        }
        
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async addSlot(requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined, conn?: WebAPI.Mysql.IPoolConnection): Promise<number> {

        if(!startTime.isValid||(endTime?!endTime.isValid:false)) {
            conn?.release();
            throw new ScheduleAPIError("InvalidDate");
        }

        const roleID = await (global.app.webAuthManager as InternalWebAuthManager).getRoleID(requiredRole, conn);

        if(roleID===null) {
            conn?.release();
            throw new ScheduleAPIError("InvalidRole");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            let errCode: WebAPI.APIErrors<"Schedule">;
            if(!conn) connection.beginTransaction();

            const IDs = await this.getSlotIDs(connection);

            let nextID;

            for(let i=0; i<WorkDay.MAX_SLOT_COUNT; i++) {
                if(!IDs.includes(i)) {
                    nextID = i;
                    break;
                }
            }

            if(nextID!==undefined) {
                const response = await this._db.performQuery<"Other">("INSERT INTO shift_slots(workDayID, privateSlotID, plannedStartTime, plannedEndTime, roleRequiredID) VALUES(?,?,?,?,?)",[this._workDayID,nextID,startTime.toFormat("HH:mm:ss"),endTime?.toFormat("HH:mm:ss") ?? null,roleID],connection);
                if(response) {
                    if(response.affectedRows==1) {
                        if(!conn) {
                            connection.commit();
                            connection.release();
                        }
                        
                        return nextID;
                    }else errCode = "DBError";
                }else errCode = this._db.getLastQueryFailureReason();
            }else errCode = "MaxSlotCountReached";
            
            if(!conn || errCode) connection.release();
            if(errCode) throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async editSlot(slotID: number, requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined, conn?: WebAPI.Mysql.IPoolConnection) {

        if(!startTime.isValid&&(endTime?!endTime.isValid:false)) {
            conn?.release();
            throw new ScheduleAPIError("InvalidDate");
        }

        const roleID = await (global.app.webAuthManager as InternalWebAuthManager).getRoleID(requiredRole, conn);
            
        if(roleID===null) {
            conn?.release();
            throw new ScheduleAPIError("InvalidRole");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            let errCode: WebAPI.APIErrors<"Schedule">;
            if(!conn) connection.beginTransaction();
            
            const query = "UPDATE shift_slots SET plannedStartTime=?, plannedEndTime=?, roleRequiredID=? WHERE workDayID=? AND privateSlotID=?";
            const response = await this._db.performQuery<"Other">(query,[startTime.toFormat("HH:mm:ss"),endTime?.toFormat("HH:mm:ss") ?? null,roleID, this._workDayID, slotID],connection);
            if(response) {
                if(response.affectedRows==1) {
                    if(!conn) {
                        connection.commit();
                        connection.release();
                    }
                   
                    return;
                }else errCode = "InvalidSlot";
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async deleteSlot(id: number, conn?: WebAPI.Mysql.IPoolConnection) {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const slot = await this.getSlot(id, connection);
            let errCode: WebAPI.APIErrors<"Schedule"> | null = null;

            if(slot) {
                
                let canGo: boolean = false;

                if(slot.assignedShift) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shifts WHERE shiftID=?",[slot.assignedShift.ID], connection);
    
                    if(response&&response.affectedRows==1) canGo=true;
                }else canGo = true;
                
                if(canGo) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shift_slots WHERE workDayID=? AND privateSlotID=?",[this._workDayID,id], connection);
    
                    if(response) {
                        if(response.affectedRows==1) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return true;
                        }
                    }else errCode = this._db.getLastQueryFailureReason();
                }else errCode = "DBError";
            }
           
            if(!conn || errCode) connection.release();
            if(errCode) throw new ScheduleAPIError(errCode);
            return false;
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async deleteAllSlots(conn?: WebAPI.Mysql.IPoolConnection) {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const IDs = await this.getSlotIDs(connection);

            for (const ID of IDs) {
                const response = await this.deleteSlot(ID,connection);
                if(response!==true) {
                    connection.release();
                    throw new ScheduleAPIError("DBError");
                }
            }

            if(!conn) {
                connection.commit();
                connection.release();
            }
           
            return;
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async assignUser(slotID: number, userID: number, conn?: WebAPI.Mysql.IPoolConnection){
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const slot = await this.getSlot(slotID, connection);
            let errCode: WebAPI.APIErrors<"Schedule"> = "DBError";

            if(slot) {
                let canProceed = false;

                if(slot.assignedShift!==null) {
                    const response = await this.unassignUser(slotID, connection);
                    if(response===true) canProceed=true;
                }else canProceed = true;


                const roleResult = await (global.app.webAuthManager as InternalWebAuthManager).hasRole(userID, slot.requiredRole, connection);

                if(roleResult===false) {
                    throw new ScheduleAPIError("UserWithoutRole");
                }

                const otherSlotsCheck = await this._db.performQuery<"Select">("SELECT privateSlotID FROM shift_slots NATURAL JOIN shifts WHERE workDayID=? AND userID=?", [this._workDayID, userID], connection);

                if(otherSlotsCheck) {
                    if(otherSlotsCheck.length>0) {
                        connection.release();
                        throw new ScheduleAPIError("UserAlreadyAssigned");
                    }
                }else {
                    connection.release();
                    throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
                }

                if(canProceed) {
                    let response = await this._db.performQuery<"Other">("INSERT INTO shifts(userID, startTime, endTime) VALUES(?,?,?);",[userID,null, null],connection);
                    
                    if(response) {
                        if(response.affectedRows===1) {
                            response = await this._db.performQuery<"Other">("UPDATE shift_slots SET shiftID=? WHERE workDayID=? AND privateSlotID=?",[response.insertId, this._workDayID, slotID],connection);

                            if(response&&response.affectedRows===1) {
                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                
                                return;
                            }
                        }
                    }else errCode = this._db.getLastQueryFailureReason();
                }
            }else errCode = "InvalidSlot";

            connection.release();
            throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async unassignUser(slotID: number, conn?: WebAPI.Mysql.IPoolConnection) {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const slot = await this.getSlot(slotID, connection);
            let errCode: WebAPI.APIErrors<"Schedule"> | null = null;

            if(slot) {
                
                let canProceed: boolean = false;

                if(slot.assignedShift) {
                    const response = await this._db.performQuery<"Other">("DELETE FROM shifts WHERE shiftID=?",[slot.assignedShift.ID], connection);
    
                    if(response&&response.affectedRows==1) canProceed=true;
                }else {
                    if(!conn) connection.release();
                    return true;
                }
                
                if(canProceed) {
                    const response = await this._db.performQuery<"Other">("UPDATE shift_slots SET shiftID=null WHERE workDayID=? AND privateSlotID=?",[this._workDayID,slotID], connection);
    
                    if(response) {
                        if(response.affectedRows==1) {
                            if(!conn) {
                                connection.commit();
                                connection.release();
                            }
                            return true;
                        }
                    }else errCode = this._db.getLastQueryFailureReason();
                }else errCode = "DBError";
    
            }
           
            if(!conn || errCode) connection.release();
            if(errCode) throw new ScheduleAPIError(errCode);
            
            return false;
        }

        throw new ScheduleAPIError("NoConnection");
    }

}


class Shift implements WebAPI.Schedule.IShift {
    private _shiftID: number;
    private _startTime: luxon.DateTime | null;
    private _endTime: luxon.DateTime | null;
    private _userID: number;
    private _db: WebAPI.Mysql.IMysqlController;


    constructor(shiftID: number, db: WebAPI.Mysql.IMysqlController,userID: number, startTime: luxon.DateTime | null, endTime: luxon.DateTime | null) {
        this._shiftID = shiftID;
        this._startTime = startTime;
        this._endTime = endTime;
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

    public get startTime(): luxon.DateTime | null {
        return this._startTime;
    }

    public get endTime(): luxon.DateTime | null {
        return this._endTime;
    }

    public async getUser(conn?: WebAPI.Mysql.IPoolConnection) {
        const result = await (global.app.webAuthManager as InternalWebAuthManager).getUser(this._userID, conn);

        if(result) return result;
        
        conn?.release();
        throw new ScheduleAPIError("NoUser");
    }

    public async updateData(startTime: luxon.DateTime, endTime: luxon.DateTime, conn?: WebAPI.Mysql.IPoolConnection) {
        let errCode: WebAPI.APIErrors<"Schedule"> = "InvalidDate";
        
        if(startTime.isValid&&endTime.isValid&&endTime > startTime) {
            const response = await this._db.performQuery("UPDATE shifts SET startTime=?, endTime=? WHERE shiftID=?",[startTime.toFormat("HH:mm:ss"), endTime.toFormat("HH:mm:ss"), this._shiftID], conn);
            if(response) {
                if((response as WebAPI.Mysql.IMysqlQueryResult).affectedRows==1) {
                    this._startTime = startTime;
                    this._endTime = endTime;
                    return;
                }else errCode = "DBError";
            }else errCode = this._db.getLastQueryFailureReason();
        }

        throw new ScheduleAPIError(errCode);
    }

}