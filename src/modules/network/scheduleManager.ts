import { DateTime } from "luxon";
import { MysqlError } from "mysql";
import { APIError, isValidTime } from "../util.js";
import { getDifference } from "../time.js";
import Output from "../output.js";

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
                        if(!conn) {
                            connection.rollback();
                            connection.release();
                        }
                        return new WorkDay(response[0]["workDayID"],this._db,when.toJSDate(), response[0]["note"], response[0]["noteUpdatedAt"], response[0]["noteUpdatedBy"]);
                    default:
                        Output.category("debug").print("error",new Error(`[DB][Schedule] Invalid state for workday on '${when.toISODate()}'. Detected more than one entry (${response.length}).`));
                        errCode = "DBError";
                    break;
                    case 0:
                        const insertResponse = await this._db.performQuery<"Other">("INSERT INTO work_days(date) VALUES(?);",[when.toISODate()], connection);
                        if(insertResponse) {
                            if(insertResponse.affectedRows==1) {
                                if(!conn) {
                                    connection.commit();
                                    connection.release();
                                }
                                return new WorkDay(insertResponse.insertId,this._db, when.toJSDate(), null, null, null);
                            }else errCode = "DBError";
                        }else errCode = this._db.getLastQueryFailureReason();
                    break;
                }
            }else errCode = this._db.getLastQueryFailureReason();

            connection.rollback();
            connection.release();
            throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    private _processShiftOptions({from, state, limit}: WebAPI.Schedule.ScheduleManager.IUserShiftsOptions) {
        const result: {
            range: string | null
            state: string
            limit: string
        } = {range: null, state: "", limit: ""};

        if(from) {
            switch(true) {
                case from.after!=undefined&&from.before!=undefined:
                    if(from.after?.isValid&&from.before?.isValid) {

                        if(from.after < from.before && from.after!= from.before) {
                            result.range = `AND date BETWEEN '${from.after.toISODate()}' AND '${from.before.toISODate()}'`;
                        }
                    }
                break;
                case from.before!=undefined&&from.before.isValid:
                    result.range = `AND date < '${from.before?.toISODate()}'`;
                break;
                case from.after!=undefined&&from.after.isValid:
                    result.range = `AND date > '${from.after?.toISODate()}'`;
                break;
            }
        }
        if(limit&&limit > 0) {
            result.limit = `LIMIT ${limit}`;
        }

        switch(state) {
            case "Assigned":
                result.state = "AND date > CURDATE()";
            break;
            case "Pending":
                result.state = "AND date <= CURDATE() AND ISNULL(startTime) AND ISNULL(endTime)";
            break;
            case "Finished":
                result.state = "AND NOT ISNULL(startTime) AND NOT ISNULL(endTime)";
            break;
        }

        return result;
    }
    
    public async getUserShifts(userID: number, {from, state, limit}: WebAPI.Schedule.ScheduleManager.IUserShiftsOptions, conn?: WebAPI.Mysql.IPoolConnection) {

        async function JSONShiftsParser(this: WebAPI.Schedule.ScheduleManager.IUserShifts) {
            const JSONShifts = [];

            for (const shift of this.shifts) {
                JSONShifts.push(await shift.getJSON());
            }

            return {
                shifts: JSONShifts,
                userSlots: this.userSlots
            }
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const userExists = await (global.app.webAuthManager as InternalWebAuthManager).userExists(userID, true, connection);

            let errCode: WebAPI.APIErrors<"Schedule"> | null = null;

            if(userExists) {
                const queryParts = this._processShiftOptions({from, limit, state});

                if(queryParts.range!=null) {

                    const query = `SELECT workDayID, privateSlotID, date, note, noteUpdatedAt, noteUpdatedBy FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? ${queryParts.range} ${queryParts.state} ORDER BY date ASC ${queryParts.limit};`;

                    const response = await this._db.performQuery<"Select">(query, [userID], connection);

                    if(response) {

                        const result: WebAPI.Schedule.ScheduleManager.IUserShifts = {
                            shifts: [],
                            userSlots: [],
                            getJSON: JSONShiftsParser
                        }

                        result.getJSON.bind(result);

                        for (const row of response) {
                            const workDay = new WorkDay(row["workDayID"],this._db,row["date"],row["note"], row["noteUpdatedAt"], row["noteUpdatedBy"]);
                            result.shifts.push(workDay);
                            result.userSlots.push(row["privateSlotID"]);
                        }

                        if(!conn) {
                            connection.rollback();
                            connection.release();
                        }
                        return result;
                    }else errCode = this._db.getLastQueryFailureReason();
                }else errCode = "InvalidRange";
            }else errCode = "NoUser";

            connection.rollback();
            connection.release();
            if(errCode) throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async countUserShifts(userID: number, {from, state}: WebAPI.Schedule.ScheduleManager.IUserShiftsOptions, conn?: WebAPI.Mysql.IPoolConnection) {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

            const userExists = await (global.app.webAuthManager as InternalWebAuthManager).userExists(userID, true, connection);

            let errCode: WebAPI.APIErrors<"Schedule"> | null = null;

            if(userExists) {
                const queryParts = this._processShiftOptions({from, state});

                if(queryParts.range!=null) {

                    const query = `SELECT COUNT(*) as count FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? ${queryParts.range} ${queryParts.state} ORDER BY date ASC;`;

                    const response = await this._db.performQuery<"Select">(query, [userID], connection);

                    if(response) {

                        if(!conn) {
                            connection.rollback();
                            connection.release();
                        }
                        return response[0]["count"];
                    }else errCode = this._db.getLastQueryFailureReason();
                }else errCode = "InvalidRange";
            }else errCode = "NoUser";

            connection.rollback();
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
                    connection.rollback();
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

    public async getWorkDays(from: DateTime, to: DateTime, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.IWorkDay[] | null> {
        if(!from.isValid||!to.isValid) {
            return null;
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            
            const result = [];

            const diff = getDifference(from.startOf("day"), to.startOf("day"),["days"]).days as number;

            for(let i=0; i < diff + 1; i++) {
                const date = from.plus({days: i});
                
                const workDay = await this.getWorkDay(date, connection);

                if(workDay) {
                    result.push(workDay);
                }else {
                    connection.rollback();
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
    private _noteUpdateTime: DateTime | null;
    private _noteLastUpdaterUserID: number | null;
    private _date: DateTime;

    private static readonly MAX_SLOT_COUNT = 10;

    constructor(workDayID: number, db: WebAPI.Mysql.IMysqlController,date: Date, note: string | null, noteUT: Date | null, noteUUID: number | null) {
        this._workDayID = workDayID;
        this._db = db;
        this._note = note;
        this._date = DateTime.fromJSDate(date);
        this._noteLastUpdaterUserID = noteUUID;
        this._noteUpdateTime = noteUT?DateTime.fromJSDate(noteUT):null;
    }

    public get ID() {
        return this._workDayID;
    }

    public get note() {
        return this._note;
    }

    public get noteUpdateTime() {
        return this._noteUpdateTime;
    }

    public get noteLastUpdater() {
        return global.app.webAuthManager.getUser(this._noteLastUpdaterUserID ?? "", false);
    }

    public get date() {
        return this._date;
    }

    public async getJSON(): Promise<WebAPI.Schedule.WorkDayAPI.IJSONWorkDay> {
        const slots = await this.getAllSlots();

        const resultSlots: WebAPI.Schedule.WorkDayAPI.IJSONSlots = {}

        for (const slotID in slots) {
            const slot = slots[slotID] as NonNullable<typeof slots[0]>;

            resultSlots[slotID] = {
                status: slot.status,
                plannedStartTime: slot.plannedStartTime.toString(),
                plannedEndTime: slot.plannedEndTime?.toString() ?? null,
                requiredRole: slot.requiredRole,
                assignedShift: await slot.assignedShift?.getJSON() ?? null
            }
        }

        return {
            ID: this.ID,
            date: this.date.toString(),
            note: this.note,
            noteUpdateTime: this._noteUpdateTime?.toISO() ?? null,
            noteLastUpdater: (await this.noteLastUpdater)?.name ?? null,
            slots: resultSlots
        }
    }

    public async setNote(newNote: string | null, updater: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<void> {

        if(newNote&&newNote.length > 255) {
            throw new ScheduleAPIError("NoteTooLong");
        }

        if(newNote=="") newNote = null;

        if(newNote!=this._note) {
            const response = await this._db.performQuery<"Other">("UPDATE work_days SET note=?, noteUpdatedAt=CURRENT_TIMESTAMP, noteUpdatedBy=? WHERE workDayID=?",[newNote!=""?newNote:null, updater, this._workDayID], conn);

            if(!response || response.affectedRows!=1) {
                conn?.rollback();
                conn?.release();
                throw new ScheduleAPIError(response?"DBError":this._db.getLastQueryFailureReason());
            }
            
            this._note = newNote;
            this._noteLastUpdaterUserID = updater;
            this._noteUpdateTime = DateTime.now();
        }
    }

    private _processSlotResponse(response: NonNullable<WebAPI.Mysql.TGenericMysqlResult<"Select">>) {
        const result: WebAPI.Schedule.WorkDayAPI.ISlots = {};

        const statusCache: WebAPI.Schedule.WorkDayAPI.IShiftSlot["status"] = DateTime.now().startOf("day") < this._date.startOf("day")?"Assigned":"Pending";

        for (const row of response) {
            const parsedStartTime = row["startTime"]?DateTime.fromISO(row["startTime"]):null;
            const parsedEndTime =  row["endTime"]?DateTime.fromISO(row["endTime"]):null;

            const shift = row["shiftID"]!=null?new Shift(row["shiftID"],this._db,row["userID"],parsedStartTime,parsedEndTime, parseFloat(row["tip"]) ?? 0, parseFloat(row["deduction"]) ?? 0, row["userNote"]):null;

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

    public async getSlot(id: number, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.IShiftSlot | null> {
        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=? AND privateSlotID=?;",[this._workDayID, id],conn);

        if(response) {
           const slots = this._processSlotResponse(response);
           return slots[Object.keys(slots)[0] as any] ?? null;
        }

        conn?.rollback();
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async getUserSlot(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection) {

        const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, conn);

        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=? AND userID=?;",[this._workDayID, userID],conn);

        if(response) {
            const slots = this._processSlotResponse(response);
            return (slots[Object.keys(slots)[0] as any] as WebAPI.Schedule.WorkDayAPI.IAssignedShiftSlot)  ?? null;
        }
        
        conn?.rollback();
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
        
        conn?.rollback();
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async getAllSlots(conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Schedule.WorkDayAPI.ISlots> {
        const response = await this._db.performQuery<"Select">("SELECT * FROM shift_slots NATURAL LEFT JOIN shifts INNER JOIN roles ON roleRequiredID=roleID WHERE workDayID=?;",[this._workDayID], conn);

        if(response) {
            return this._processSlotResponse(response);
        }
        
        conn?.rollback();
        conn?.release();
        throw new ScheduleAPIError(this._db.getLastQueryFailureReason());
    }

    public async addSlot(definer: number, requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined, conn?: WebAPI.Mysql.IPoolConnection): Promise<number> {

        if(!isValidTime(startTime)||(endTime?!isValidTime(endTime):false)) {
            conn?.rollback();
            conn?.release();
            throw new ScheduleAPIError("InvalidTime");
        }

        const roleID = await (global.app.webAuthManager as InternalWebAuthManager).getRoleID(requiredRole, conn);

        if(roleID===null) {
            conn?.rollback();
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
                const response = await this._db.performQuery<"Other">("INSERT INTO shift_slots(workDayID, privateSlotID, plannedStartTime, plannedEndTime, roleRequiredID, definer) VALUES(?,?,?,?,?,?)",[this._workDayID,nextID,startTime.toFormat("HH:mm:ss"),endTime?.toFormat("HH:mm:ss") ?? null,roleID, definer],connection);
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
            
            if(!conn || errCode) {
                connection.rollback();
                connection.release();
            }
            if(errCode) throw new ScheduleAPIError(errCode);
        }

        throw new ScheduleAPIError("NoConnection");
    }

    public async editSlot(slotID: number, requiredRole: string, startTime: DateTime, endTime?: DateTime | undefined, conn?: WebAPI.Mysql.IPoolConnection) {

        if(!isValidTime(startTime)||(endTime?!isValidTime(endTime):false)) {
            conn?.rollback();
            conn?.release();
            throw new ScheduleAPIError("InvalidTime");
        }

        const roleID = await (global.app.webAuthManager as InternalWebAuthManager).getRoleID(requiredRole, conn);
            
        if(roleID===null) {
            conn?.rollback();
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
           
            if(!conn || errCode) {
                connection.rollback();
                connection.release();
            }
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
                    connection.rollback();
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
                        connection.rollback();
                        connection.release();
                        throw new ScheduleAPIError("UserAlreadyAssigned");
                    }
                }else {
                    connection.rollback();
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

            connection.rollback();
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
                    if(!conn) {
                        connection.rollback();
                        connection.release();
                    }
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
           
            if(!conn || errCode) {
                connection.rollback();
                connection.release();
            }
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
    private _tip: number;
    private _deduction: number;
    private _note: string | null;


    constructor(shiftID: number, db: WebAPI.Mysql.IMysqlController,userID: number, startTime: luxon.DateTime | null, endTime: luxon.DateTime | null, tip?: number, deduction?: number, note?: string) {
        this._shiftID = shiftID;
        this._startTime = startTime;
        this._endTime = endTime;
        this._db = db;
        this._userID = userID;
        this._tip = tip ?? 0;
        this._deduction = deduction ?? 0;
        this._note = note ?? null;
    }

    public toJSON() {
        const result = {
            shiftID: this._shiftID,
            startTime: this._startTime?.toString() ?? null,
            endTime: this._endTime?.toString() ?? null,
            tip: this._tip,
            deduction: this._deduction,
            userID: this._userID,
            note: this._note
        }
        return result;
    }

    public async getJSON() {
        return Object.assign({userName: (await this.getUser()).name},this.toJSON());
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

    public get tip(): number {
        return this._tip;
    }

    public get deduction(): number {
        return this._deduction;
    }

    public get note(): string | null {
        return this._note;
    }

    public get userID(): number {
        return this._userID;
    }

    public async getUser(conn?: WebAPI.Mysql.IPoolConnection) {
        const result = await (global.app.webAuthManager as InternalWebAuthManager).getUser(this._userID, true, conn);

        if(result) return result;
        
        conn?.rollback();
        conn?.release();
        throw new ScheduleAPIError("NoUser");
    }

    public async setNote(newNote: string | null, conn?: WebAPI.Mysql.IPoolConnection) {
        if(newNote&&newNote.length > 255) {
            throw new ScheduleAPIError("NoteTooLong");
        }

        if(newNote=="") newNote=null;

        if(newNote!=this._note) {
            const response = await this._db.performQuery<"Other">("UPDATE shifts SET userNote=? WHERE shiftID=?",[newNote!=""?newNote:null, this._shiftID], conn);

            if(!response || response.affectedRows!=1) {
                conn?.rollback();
                conn?.release();
                throw new ScheduleAPIError(response?"DBError":this._db.getLastQueryFailureReason());
            }
            
            this._note = newNote;
        }
    }

    public async updateData(startTime: luxon.DateTime, endTime: luxon.DateTime, tip: number, deduction: number, note?: string, conn?: WebAPI.Mysql.IPoolConnection) {
        let errCode: WebAPI.APIErrors<"Schedule"> = "InvalidTime";

        if(deduction < 0 || tip < 0) {
            conn?.rollback();
            conn?.release();
            throw new ScheduleAPIError("InvalidCurrency");
        }

        const newNote: string | null = note==""?null:note ?? null;
        
        if(isValidTime(startTime)&&isValidTime(endTime)) {
            if(!startTime.startOf("minute").equals(endTime.startOf("minute"))) {
                const response = await this._db.performQuery("UPDATE shifts SET startTime=?, endTime=?, tip=?, deduction=?, userNote=? WHERE shiftID=?",[startTime.toFormat("HH:mm:ss"), endTime.toFormat("HH:mm:ss"), tip, deduction, newNote, this._shiftID], conn);
                if(response) {
                    if((response as WebAPI.Mysql.IMysqlQueryResult).affectedRows==1) {
                        this._startTime = startTime;
                        this._endTime = endTime;
                        this._tip = tip;
                        this._deduction = deduction;
                        this._note = null;
                        return;
                    }else errCode = "DBError";
                }else errCode = this._db.getLastQueryFailureReason();
            }else errCode = "InvalidDuration";
        }

        conn?.rollback();
        conn?.release();
        throw new ScheduleAPIError(errCode);
    }

}