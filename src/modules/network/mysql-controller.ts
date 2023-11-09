import mysql, { MysqlError } from "mysql"
import Output from "../output.js";
import { findFirstStackEntryNotFrom, formatErrorStackEntry, parseErrorObject } from "../util.js";


export class MysqlController implements WebAPI.Mysql.IMysqlController {
    public static readonly MAX_CONNECTON_ACTIVE_TIME = 60000;
    private pool: mysql.Pool;

    private _activeConnections: Map<number, WebAPI.Mysql.IConnectionRecord> = new Map();

    private _lastFailure: WebAPI.Auth.ILastFailureReasonObject = {
        error: null,
        reason: "Success"
    }

    /**
     * Manages connections with mysql database.
     * @param connectionDetails Authentication parameters as well as connection pool size.
     */
    constructor(connectionDetails: IEnvironmentConfig["mysql"]) {
        this.pool = mysql.createPool({
            connectionLimit: connectionDetails.connectionLimit,
            host: connectionDetails.address,
            port: connectionDetails.port,
            user: connectionDetails.user,
            password: connectionDetails.password,
            database: connectionDetails.database
        });

        this.pool.addListener("release",connection=>{
            Output.category("debug").print("notice",`[DB] [${connection.threadId}] Connection has been released.`, "mysql");
            const record = this._activeConnections.get(connection.threadId);
            if(record) clearTimeout(record.timeout);

            this._activeConnections.delete(connection.threadId);
        });
    }
    
    public testConnection() {
        return new Promise<boolean>((res,rej)=>{
            this.pool.getConnection((err,connection)=>{
                if(err) {rej(err); return;}
                else res(true);

                connection.release();
            });
        });
    }

    public getConnection(): Promise<WebAPI.Mysql.IPoolConnection | null> {
        const stackDetails = parseErrorObject(new Error());
        const acquiringMethod = findFirstStackEntryNotFrom(stackDetails.stackParts,MysqlController.name);
        const formattedMethod = formatErrorStackEntry(acquiringMethod);

        return new Promise<WebAPI.Mysql.IPoolConnection | null>(res=>{
            this.pool.getConnection((err,connection)=>{
                if(err) {
                    Output.category("debug").print("error",new Error(`[DB] Couldn't acquire connection with db. ${err.message}`));
                    res(null);
                }else {
                    Output.category("debug").print("notice",`[DB] [${connection.threadId}] Connection acquired ${formattedMethod}.`)
                    const ID = setTimeout(()=>{
                        Output.category("debug").print("warning", `[DB] [${connection.threadId}] Connection hasn't been released in required amount of time. Releasing now.`)
                        .print("warning",`\tAcquired ${record.acquiringLocation}; Last query: '${record.lastQuery}'; Queried ${record.queryingLocation};`);

                        connection.rollback();
                        connection.release();
                    },MysqlController.MAX_CONNECTON_ACTIVE_TIME);
                    
                    const record: WebAPI.Mysql.IConnectionRecord = {
                        timeout: ID,
                        acquiringLocation: formattedMethod,
                        lastQuery: null,
                        queryingLocation: null
                    }

                    this._activeConnections.set(connection.threadId as number,record);

                    res(connection);
                }
            });
        });
    }

    public reportMysqlError(error: MysqlError): void {
        Output.category("debug").print("error", new Error(`[DB] ${error.sql}; ${error.message}`))
    }

    public async performQuery<T extends "Select" | "Other">(queryStr: string, values: Array<string | number | null>, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Mysql.TGenericMysqlResult<T> | null> {
        const connection = conn ?? await this.getConnection();

        if(connection) {
            const queryingErr = new Error();
            const stackDetails = parseErrorObject(queryingErr);
            const queryingMethod = findFirstStackEntryNotFrom(stackDetails.stackParts,MysqlController.name);

            const record = this._activeConnections.get(connection.threadId as number);
            if(record) {
                record.lastQuery = queryStr;
                record.queryingLocation = formatErrorStackEntry(queryingMethod);
            }

            return await new Promise<WebAPI.Mysql.TGenericMysqlResult<T> | null>(res=>{
                connection.query(queryStr,values,(err: MysqlError | null,results: WebAPI.Mysql.TGenericMysqlResult<T>)=>{
                    if(err) {
                        this.reportMysqlError(err);
                        this._lastFailure = {error: err, reason: "DBError"};
                        res(null);
                        return;
                    }
                    this._lastFailure = {error: null, reason: "Success"};
                    res(results);
                    if(!conn) connection.release();
                });
                
                if(global.app.env.flags.printMySQLQueries)
                    Output.category('debug').print("notice",`[DB] [${connection.threadId}] Executing query: '${queryStr}' with values: '${values}';`,"mysql");
            });
        }else {
            this._lastFailure = {error: null, reason: "NoConnection"};
            return null;
        }
    }

    public escapeValue(value: string) {
        return this.pool.escape(value);
    }

    public getLastQueryError() {
        if(this._lastFailure.error)
            return this._lastFailure.error;
        else throw new Error("[MysqlController] Trying to read last error on successfull request result.");
    }

    public getLastQueryFailureReason() {
        if(this._lastFailure.reason!="Success")
            return this._lastFailure.reason;
        else throw new Error("[MysqlController] Trying to read last failure reason on successfull request result.");
    }
}