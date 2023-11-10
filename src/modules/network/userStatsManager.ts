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
            conn?.rollback();
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

            if(userID===null) {
                connection.rollback();
                connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT * FROM user_prop WHERE userID=? AND date <= ? ORDER BY date DESC LIMIT 1;`;
            const response = await this._db.performQuery<"Select">(queryStr,[userID, date.startOf("month").toISODate()],connection);

            if(response) {
                if(!conn) 
                    connection.release();

                if(response.length===1) {
                    return {
                        wage: response[0]["wage"],
                        externalIncome: response[0]["externalIncome"],
                        goalAmount: response[0]["goalAmount"]
                    }
                }else return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.rollback();
            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setHistoricUserData(userKey: string | number, date: DateTime, data: WebAPI.Statistics.IUnsureHistoricUserData, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["setHistoricUserData"]> {
        if(!date.isValid) {
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

		date = date.startOf("month");

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();

			const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

			if(userID===null) {
				if(!conn) connection.release();
				throw new StatsAPIError("NoUser");
			}

			let isTargetMonthSet = false;

			let checkResponse = await this._db.performQuery<"Select">("SELECT userID FROM user_prop WHERE userID=? AND date=?",[userID, date.toISODate()],connection);

			if(checkResponse&&checkResponse.length==1) {
				isTargetMonthSet = true;
			}else {
				if(!conn) connection.release();
				throw new StatsAPIError(this._db.getLastQueryFailureReason());
			}

			let queryStr;
			let values: Array<string | number | null> = [];

			const historicDataTemplate: WebAPI.Statistics.IHistoricUserData = {
				externalIncome: null,
				wage: null,
                goalAmount: null
			}

			type TTemplateKeys = keyof typeof historicDataTemplate;


            if(isTargetMonthSet) { //Updating already existing record
				let fieldList = "";

				for (const field of Object.keys(historicDataTemplate)) {
					if(data[field as TTemplateKeys]!==undefined) {
						fieldList += field+"=? ";
						values.push(data[field as TTemplateKeys] as any);
					}
				}

				fieldList = fieldList.substring(0,fieldList.length - 1);

				values.push(userID, date.toISODate());

				queryStr = `UPDATE user_prop SET ${fieldList} WHERE userID=? AND date=?`;

            }else { //Inserting new record for the month
				const existingData = await this.getHistoricUserData(userID, date, connection) ?? {} as typeof historicDataTemplate;

				values.push(userID, date.toISODate());

				let fieldList = "";
				let valueList = "";

				for (const field of Object.keys(historicDataTemplate)) {
					fieldList += field+",";
					valueList += "?,";
					values.push(data[field as TTemplateKeys] ?? existingData[field as TTemplateKeys] ?? null);
				}

				fieldList = fieldList.substring(0,fieldList.length - 1);
				valueList = valueList.substring(0,valueList.length - 1);

				queryStr = `INSERT INTO user_prop(userID, date, ${fieldList}) VALUES(?, ?, ${valueList})`;
            }

            let errCode: WebAPI.APIErrors<"Stats">;


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

    public async getCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["getCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {

            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

            if(userID===null) {
                if(!conn) connection.release();
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `SELECT * FROM user_stats_cache WHERE userID=?`;
            const response = await this._db.performQuery<"Select">(queryStr,[userID],connection);

            if(response) {
                if(response.length===1) {
                    const cacheDate = DateTime.fromJSDate(response[0]["targetMonth"]);

                    if(cacheDate.isValid&&DateTime.now().startOf("month").equals(cacheDate.startOf("month"))) {
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
                    }else await this.dropCacheState(userID,connection);
                }

                if(!conn) connection.release();

                return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.rollback();
            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async setCacheState(userKey: string | number, stats: WebAPI.Statistics.IMonthUserStats, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["setCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

            if(userID===null) {
                if(!conn) {
                    connection.rollback();
                    connection.release();
                }
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `INSERT INTO user_stats_cache(userID, totalHours, shiftCount, wagePerHour, totalWage, totalTip, totalDeduction, maxTip, minTip, avgTip, externalIncome) VALUES(?,?,?,?,?,?,?,?,?,?,?)`;
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
                stats.avgTip,
                stats.externalIncome ?? 0
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

            connection.rollback();
            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async dropCacheState(userKey: string | number, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["dropCacheState"]> {
        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            if(!conn) connection.beginTransaction();
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

            if(userID===null) {
                if(!conn) {
                    connection.rollback();
                    connection.release();
                }
                throw new StatsAPIError("NoUser");
            }

            let errCode: WebAPI.APIErrors<"Stats">;

            let queryStr = `DELETE FROM user_stats_cache WHERE userID=?`;
           
            const response = await this._db.performQuery<"Other">(queryStr,[userID],connection);

            if(response) {
                if(!conn) {
                    connection.commit();
                    connection.release();
                }
                return;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.rollback();
            connection.release();
            throw new StatsAPIError(errCode);
        }

        throw new StatsAPIError("NoConnection");
    }

    public async getStatsOf(userKey: string | number, date: luxon.DateTime, conn?: WebAPI.Mysql.IPoolConnection): ReturnType<WebAPI.Statistics.IUserStatsManager["getStatsOf"]> {

        if(!date.isValid) {
            conn?.rollback();
            conn?.release();
            throw new StatsAPIError("InvalidDate");
        }

        const connection = conn ?? await this._db.getConnection();

        if(connection) {
            const userID = await (global.app.webAuthManager as InternalWebAuthManager).resolveUserKey(userKey, true, connection);

            if(userID===null) {
                if(!conn) connection.release();
                return null;
            }

           
            let statsData = null;
            let isCurrentMonth = false;

			const history = await this.getHistoricUserData(userID, date, connection);

			const wagePerHour = history?.wage ?? null
            const externalIncome = history?.externalIncome ?? null;

            if(date.startOf("month").equals(DateTime.now().startOf("month"))) {
                isCurrentMonth = true;
                statsData = await this.getCacheState(userID,connection);
            }


            let recalculatedStats = false;

            if(statsData == null) {
                let queryStr = `SELECT SUM(duration) as totalHours, COUNT(*) as shiftCount, SUM(tip) as totalTip, SUM(deduction) as totalDeduction, MAX(tip) as maxTip, Min(tip) as minTip, AVG(tip) as avgTip FROM shifts NATURAL JOIN shift_slots NATURAL JOIN work_days WHERE userID=? AND MONTH(date) = ? AND YEAR(date) = ?;`;
                const response = await this._db.performQuery<"Select">(queryStr,[userID, date.month, date.year],connection);
    
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
                    connection.rollback();
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

        conn?.rollback();
        conn?.release();
        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }

    public async getCurrentAmount(): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["getCurrentAmount"]> {
        const stats = await this._statsManager.getStatsOf(this._userID,DateTime.now());

        if(stats) {
            if(stats.totalWage&&stats.wagePerHour)
                return stats.wagePerHour * stats.totalWage + stats.totalTip + (stats.externalIncome ?? 0) - stats.totalDeduction;
            else return null;
        }

        throw new StatsAPIError(this._db.getLastQueryFailureReason());
    }
    
    public async addMilestone(title: string, amount: number): ReturnType<WebAPI.Statistics.GoalAPI.IGoalManager["addMilestone"]> {

        const connection = await this._db.getConnection();


        if(!connection)
            throw new StatsAPIError("NoConnection");


        const milestonesData = await this.getMilestones(connection);

        if(milestonesData.milestones.length===GoalManager.MAX_MILESTONE_COUNT) {
            connection.release();
            throw new StatsAPIError("MilestoneLimitReached");
        }

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