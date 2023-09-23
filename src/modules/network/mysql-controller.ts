import mysql, { MysqlError } from "mysql"
import Output from "../output.js";


export class MysqlController implements WebAPI.Mysql.IMysqlController {
    private pool: mysql.Pool;


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
}