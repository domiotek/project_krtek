import { DateTime } from "luxon";
import { APIError } from "../util.js";

class StatsAPIError extends APIError<"Stats"> {
    constructor(errCode: WebAPI.APIErrors<"Stats">) {
        super(UserStatsManager.name, errCode);
    }
}

/**
 * WebAuthManager expanded with the ability to pass connections to the methods.
 * Normally hidden within public interface.
 */
type InternalWebAuthManager = import("./webAuthManager.js").WebAuthManager;


export class UserStatsManager implements WebAPI.Statistics.IUserStatsManager {
    private _db: WebAPI.Mysql.IMysqlController;

    constructor(db: WebAPI.Mysql.IMysqlController) {
        this._db = db;
    }

    public async getHistoricUserData(userKey: string | number, date: luxon.DateTime, conn?: WebAPI.Mysql.IPoolConnection, user?: WebAPI.Auth.UserAPI.IUserDetails): ReturnType<WebAPI.Statistics.IUserStatsManager["getHistoricUserData"]> {
        if(!date.isValid) {
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userData = user || await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!userData) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT wage FROM user_prop_history WHERE userID=? AND date=?`;
            const response = await this._db.performQuery<"Select">(queryStr,[userData.userID, date.toISODate()],connection);

            if(response) {
                if(response.length===1) {
                    if(!conn) 
                        connection.release();

                    return {
                        wage: response[0]["wage"]
                    }
                }else return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setHistoricUserData(userKey: string | number, date: DateTime, data: WebAPI.Statistics.IHistoricUserData, conn?: WebAPI.Mysql.IPoolConnection, user?: WebAPI.Auth.UserAPI.IUserDetails): ReturnType<WebAPI.Statistics.IUserStatsManager["setHistoricUserData"]> {
        if(!date.isValid) {
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            const userData = user || await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!userData) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `INSERT INTO user_prop_history VALUES(?,?,?)`;
            const response = await this._db.performQuery<"Other">(queryStr,[userData.userID, date.toISODate(), data.wage],connection);

            if(response) {
                if(response.affectedRows==1) {
                    if(!conn) {
                        connection.commit();
                        connection.release();
                    }
                    return;
                }else errCode = "DBError";
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async getCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection, user?: WebAPI.Auth.UserAPI.IUserDetails): ReturnType<WebAPI.Statistics.IUserStatsManager["getCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userData = user || await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!userData) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT * FROM user_stats_cache WHERE userID=?`;
            const response = await this._db.performQuery<"Select">(queryStr,[userData.userID],connection);

            if(response) {
                if(response.length===1) {
                    if(!conn) 
                        connection.release();

                    return {
                        totalHours: response[0]["totalHours"],
                        shiftCount: response[0]["shiftCount"],
                        wagePerHour: response[0]["wagePerHour"],
                        totalWage: response[0]["totalWage"],
                        totalTip: response[0]["totalTip"],
                        totalDeduction: response[0]["totalDeduction"],
                        maxTip: response[0]["maxTip"],
                        minTip: response[0]["minTip"],
                        avgTip: response[0]["avgTip"]
                    }
                }else return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setCacheState(userKey: string | number, stats: WebAPI.Statistics.IMonthUserStats, conn?: WebAPI.Mysql.IPoolConnection, user?: WebAPI.Auth.UserAPI.IUserDetails): ReturnType<WebAPI.Statistics.IUserStatsManager["setCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const userData = user || await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!userData) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `INSERT INTO user_stats_cache VALUES(?,?,?,?,?,?,?,?,?,?)`;
            const values = [
                userData.userID,
                stats.totalHours,
                stats.shiftCount,
                stats.wagePerHour,
                stats.totalWage,
                stats.totalTip,
                stats.totalDeduction,
                stats.maxTip,
                stats.minTip,
                stats.avgTip
            ]
            const response = await this._db.performQuery<"Other">(queryStr,values,connection);

            if(response) {
                if(response.affectedRows==1) {
                    if(!conn) {
                        connection.commit();
                        connection.release();
                    }
                    return;
                }else errCode = "DBError";
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async dropCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection, user?: WebAPI.Auth.UserAPI.IUserDetails): ReturnType<WebAPI.Statistics.IUserStatsManager["dropCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            const userData = user || await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!userData) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `DELETE FROM user_stats_cache WHERE userID=?`;
           
            const response = await this._db.performQuery<"Other">(queryStr,[userData.userID],connection);

            if(response) {
                if(response.affectedRows==1) {
                    if(!conn) {
                        connection.commit();
                        connection.release();
                    }
                    return;
                }else errCode = "DBError";
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async getStatsOf(userKey: string | number, date: luxon.DateTime, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["getStatsOf"]> {

        if(!date.isValid) {
           conn?.release();
           throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            const user = await (global.app.webAuthManager as InternalWebAuthManager).getUser(userKey, connection);

            if(!user) {
                if(!conn) connection.release();
                return null;
            }

            let wagePerHour;
            let statsData = null;
            let isCurrentMonth = false;

            if(date.startOf("month").equals(DateTime.now().startOf("month"))) {
                isCurrentMonth = true;
                wagePerHour = user.wage;
                statsData = await this.getCacheState(userKey,connection,user);
            }else {
                const history = await this.getHistoricUserData(userKey, date, connection, user);
                wagePerHour = history?.wage ?? null;
            }


            let recalculatedStats = false;

            if(statsData == null) {
                let queryStr = `SELECT SUM(duration) as totalHours, COUNT(*) as shiftCount, SUM(tip) as totalTip, SUM(deduction) as totalDeduction, MAX(tip) as maxTip, Min(tip) as minTip, AVG(tip) as avgTip FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? AND MONTH(date) = ? AND YEAR(date) = ?;`;
                const response = await this._db.performQuery<"Select">(queryStr,[user.userID, date.month, date.year],conn);
    
                if(response&&response.length===1) {
                    statsData = {
                        totalHours: response[0]["totalHours"] ?? 0,
                        shiftCount: response[0]["shiftCount"],
                        wagePerHour: wagePerHour,
                        totalWage: wagePerHour==null?null:wagePerHour * response[0]["totalHours"],
                        totalTip: response[0]["totalTip"] ?? 0,
                        totalDeduction: response[0]["totalDeduction"] ?? 0,
                        maxTip: response[0]["maxTip"] ?? 0,
                        minTip: response[0]["minTip"] ?? 0,
                        avgTip: response[0]["avgTip"] ?? 0
                    }
                }else {
                    connection.release();
                    throw new StatsAPIError(this._db.getLastQueryFailureReason());
                }

                recalculatedStats = true;
            }

            if(recalculatedStats&&isCurrentMonth) {
                await this.setCacheState(userKey, statsData, connection, user);
            }

            if(!conn) {
                connection.commit();
                connection.release();
            }

            return statsData;
        }

        throw new StatsAPIError("NoConnection");
    }
}