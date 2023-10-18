import mysql, { MysqlError } from "mysql"
import Output from "../output.js";


export class MysqlController implements WebAPI.Mysql.IMysqlController {
    private pool: mysql.Pool;

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
            localAddress: connectionDetails.address,
            port: connectionDetails.port,
            user: connectionDetails.user,
            password: connectionDetails.password,
            database: connectionDetails.database
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
        return new Promise<WebAPI.Mysql.IPoolConnection | null>(res=>{
            this.pool.getConnection((err,connection)=>{
                if(err) {
                    Output.category("debug").print("error",new Error(`[DB] Couldn't acquire connection with db. ${err.message}`));
                    res(null);
                }else res(connection);
            });
        });
    }

    public reportMysqlError(error: MysqlError): void {
        Output.category("debug").print("error", new Error(`[DB] ${error.message}`))
    }

    public async performQuery<T extends "Select" | "Other">(queryStr: string, values: Array<string | number | null>, conn?: WebAPI.Mysql.IPoolConnection): Promise<WebAPI.Mysql.TGenericMysqlResult<T> | null> {
        const connection = conn ?? await this.getConnection();

        if(connection) {
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