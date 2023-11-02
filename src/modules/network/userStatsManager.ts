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

    public async getHistoricUserData(userKey: string | number, date: luxon.DateTime, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["getHistoricUserData"]> {
        if(!date.isValid) {
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

            if(userID===null) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT wage FROM user_prop_history WHERE userID=? AND date=?`;
            const response = await this._db.performQuery<"Select">(queryStr,[userID, date.startOf("month").toISODate()],connection);

            if(response) {
                if(response.length===1) {
                    if(!conn) 
                        connection.release();

                    return {
                        wage: response[0]["wage"],
                        externalIncome: response[0]["externalIncome"]
                    }
                }else return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setHistoricUserData(userKey: string | number, date: DateTime, data: WebAPI.Statistics.IHistoricUserData, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["setHistoricUserData"]> {
        if(!date.isValid) {
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            if(!conn) connection.beginTransaction();

			const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

			if(userID===null) {
				if(!conn) connection.release();
				throw new StatsAPIError("NoUser");
			}
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `INSERT INTO user_prop_history VALUES(?,?,?)`;

            const response = await this._db.performQuery<"Other">(queryStr,[userID, date.toISODate(), data.wage],connection);

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

    public async getCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["getCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

            if(userID===null) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT * FROM user_stats_cache WHERE userID=?`;
            const response = await this._db.performQuery<"Select">(queryStr,[userID],connection);

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
                        avgTip: response[0]["avgTip"],
                        externalIncome: response[0]["externalIncome"]
                    }
                }else return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setCacheState(userKey: string | number, stats: WebAPI.Statistics.IMonthUserStats, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["setCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

            if(userID===null) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `INSERT INTO user_stats_cache VALUES(?,?,?,?,?,?,?,?,?,?)`;
            const values = [
                userID,
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

    public async dropCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["dropCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            connection.beginTransaction();
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

            if(userID===null) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `DELETE FROM user_stats_cache WHERE userID=?`;
           
            const response = await this._db.performQuery<"Other">(queryStr,[userID],connection);

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
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, connection);

            if(userID===null) {
                if(!conn) connection.release();
                return null;
            }

            let wagePerHour;
            let externalIncome;
            let statsData = null;
            let isCurrentMonth = false;

            if(date.startOf("month").equals(DateTime.now().startOf("month"))) {
                isCurrentMonth = true;
                wagePerHour = user.wage;
                externalIncome = user.externalIncome;
                statsData = await this.getCacheState(userKey,connection,user);
            }else {
                const history = await this.getHistoricUserData(userKey, date, connection, user);
                wagePerHour = history?.wage ?? null;
                externalIncome = history?.externalIncome ?? 0;
            }


            let recalculatedStats = false;

            if(statsData == null) {
                let queryStr = `SELECT SUM(duration) as totalHours, COUNT(*) as shiftCount, SUM(tip) as totalTip, SUM(deduction) as totalDeduction, MAX(tip) as maxTip, Min(tip) as minTip, AVG(tip) as avgTip FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? AND MONTH(date) = ? AND YEAR(date) = ?;`;
                const response = await this._db.performQuery<"Select">(queryStr,[userID, date.month, date.year],conn);
    
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
                        avgTip: response[0]["avgTip"] ?? 0,
                        externalIncome
                    }
                }else {
                    connection.release();
                    throw new StatsAPIError(this._db.getLastQueryFailureReason());
                }

                recalculatedStats = true;
            }

            if(recalculatedStats&&isCurrentMonth) {
                await this.setCacheState(userID, statsData, connection);
            }

            if(!conn) {
                connection.commit();
                connection.release();
            }

            return statsData;
        }

        throw new StatsAPIError("NoConnection");
    }

    public async getGoalOf(userKey: string | number): ReturnType<WebAPI.Statistics.IUserStatsManager["getGoalOf"]> {
        const user = await global.app.webAuthManager.getUser(userKey);

        if(!user) {
            return null;
        }

        return new GoalManager(this, this._db, user.userID);
    }
}



class GoalManager implements WebAPI.Statistics.GoalAPI.IGoalManager {
    private static readonly MAX_MILESTONE_COUNT: number = 10;
    private readonly _db: WebAPI.Mysql.IMysqlController;
    private readonly _userID: number;
    private readonly _statsManager: UserStatsManager;

    constructor(manager: UserStatsManager, db: WebAPI.Mysql.IMysqlController, userID: number) {
        this._db = db;
        this._userID = userID;
        this._statsManager = manager;
    }

    public async getMilestones(conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["getMilestones"]> {

        const query = "SELECT * FROM goal_milestones WHERE userID=? ORDER BY orderTag;";
        const response = await this._db.performQuery<"Select">(query,[this._userID], conn);

        if(response) {
            const result: WebAPI.Statistics.GoalAPI.IMilestonesDetails = {
                milestones: [],
                totalAmount: 0
            };

            for (const row of response) {
                result.milestones.push({
                    ID: row["milestoneID"],
                    orderTag: row["orderTag"],
                    title: row["title"],
                    amount: row["targetAmount"]
                });
                result.totalAmount += row["targetAmount"];
            }

            return result;
        }

        conn?.release();
        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }

    public async getCurrentAmount(): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["getCurrentAmount"]> {
        const stats = await this._statsManager.getStatsOf(this._userID,DateTime.now());

        if(stats) {
            if(stats.totalWage&&stats.wagePerHour)
                return stats.wagePerHour * stats.totalWage + stats.totalTip + stats.externalIncome - stats.totalDeduction;
            else return null;
        }

        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async addMilestone(title: string, amount: number): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["addMilestone"]> {

        const connection = await this._db.getConnection();


        if(!connection)
            throw new StatsAPIError("NoConnection");


        const milestonesData = await this.getMilestones(connection);

        const nextOrderTag = (milestonesData.milestones[milestonesData.milestones.length-1]?.orderTag ?? -1) + 1;
        
        const query = "INSERT INTO goal_milestones(userID, orderTag, title, targetAmount) VALUES(?,?,?,?);";
        const response = await this._db.performQuery<"Other">(query,[this._userID, nextOrderTag, title, amount], connection);
        connection.release();

        if(response&&response.affectedRows==1) {

            return response.insertId;
        }

        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async dropMilestone(ID: number): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["dropMilestone"]> {
        const query = "DELETE FROM goal_milestones WHERE milestoneID=? AND userID = ?";
        const response = await this._db.performQuery<"Other">(query,[ID, this._userID]);

        if(response) {
            if(response.affectedRows==1) return true;
            else return false;
        }

        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async dropAllMilestones(): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["dropAllMilestones"]> {
        const query = "DELETE FROM goal_milestones WHERE userID=?";
        const response = await this._db.performQuery<"Other">(query,[this._userID]);

        if(response==null) 
            throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async setMilestone(ID: number, title: string, amount: number): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["setMilestone"]> {
        const query = "UPDATE goal_milestones SET title=?, amount=? WHERE milestoneID=? AND userID=?;";
        const response = await this._db.performQuery<"Other">(query,[title, amount, ID, this._userID]);

        if(response) {
            if(response.affectedRows==1) return true;
            else return false;
        }

        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async updateMilestoneOrder(newOrder: WebAPI.Statistics.GoalAPI.IMilestoneOrder): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["updateMilestoneOrder"]> {
        throw new StatsAPIError("NotImplemented");
    }
    
}