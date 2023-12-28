import { DateTime } from "luxon";
import { APIError } from "../util.js";

class FeedbackAPIError extends APIError<"Feedback"> {
    constructor(errCode: WebAPI.APIErrors<"Feedback">) {
        super(FeedbackManager.name, errCode);
    }
}

export class FeedbackManager implements WebAPI.Feedback.IFeedbackManager {
    private readonly _db: WebAPI.Mysql.IMysqlController;


    constructor(mysql: WebAPI.Mysql.IMysqlController) {
        this._db = mysql;
    }


    public async createTicket(type: string, title: string, desc: string, creator: string | number | null): ReturnType<WebAPI.Feedback.IFeedbackManager["createTicket"]> {
        
        let userID: number | null = null;

        if(creator!=null) {
            userID = await global.app.webAuthManager.resolveUserKey(creator, true);
        }

        const connection = await this._db.getConnection();
        if(connection) {

            let response = await this._db.performQuery<"Select">("SELECT feedbackTypeID FROM feedback_types WHERE name=?",[type],connection);
            const feedbackTypeID = response&&response[0]?response[0]["feedbackTypeID"]:-1;

            let errCode: WebAPI.APIErrors<"Feedback">;

            if(feedbackTypeID!=-1) {
                const queryStr = `INSERT INTO feedback_tickets(feedbackTypeID, userID, title, \`desc\`) VALUES(?,?,?,?)`;
                const response = await this._db.performQuery<"Other">(queryStr,[feedbackTypeID, userID, title, desc],connection);
                
                if(response) {
                    if(response.affectedRows===1)
                        connection.release();
                        return response.insertId;
                }else errCode = this._db.getLastQueryFailureReason();

            }else if(response) {
                connection.release();
                return null;
            }else errCode = this._db.getLastQueryFailureReason();

            connection.release();
            throw new FeedbackAPIError(errCode);
        }
        
        throw new FeedbackAPIError("NoConnection");
    }

    public async getTicket(ticketID: number): ReturnType<WebAPI.Feedback.IFeedbackManager["getTicket"]> {
        let queryStr = `SELECT * FROM feedback_tickets NATURAL JOIN feedback_types WHERE ticketID=?;`;
        const response = await this._db.performQuery<"Select">(queryStr,[ticketID]);

        if(response) {
            if(response.length===1) {
                return {
                    ID: response[0]["ticketID"],
                    type: response[0]["name"],
                    creatorUserID: response[0]["userID"],
                    title: response[0]["title"],
                    desc: response[0]["desc"],
                    submittedOn: DateTime.fromJSDate(response[0]["submittedOn"])
                }
            }else return null;
        }

        throw new FeedbackAPIError(this._db.getLastQueryFailureReason());
    }

    public async listTickets(): ReturnType<WebAPI.Feedback.IFeedbackManager["listTickets"]> {
        const result: WebAPI.Feedback.ITicketDetails[] = [];

        let queryStr = `SELECT * FROM feedback_tickets NATURAL JOIN feedback_types;`;
        const response = await this._db.performQuery<"Select">(queryStr,[]);

        if(response) {
            for (const row of response) {
                result.push({
                    ID: row["ticketID"],
                    type: row["name"],
                    creatorUserID: row["userID"],
                    title: row["title"],
                    desc: row["desc"],
                    submittedOn: DateTime.fromJSDate(row["submittedOn"])
                });
            }

            return result;
        }

        throw new FeedbackAPIError(this._db.getLastQueryFailureReason());
    }

    public async dropTicket(ticketID: number): ReturnType<WebAPI.Feedback.IFeedbackManager["dropTicket"]> {
        const result = await this._db.performQuery<"Other">(`DELETE FROM feedback_tickets WHERE ticketID=?`,[ticketID]);

        if(result) {
            if(result.affectedRows===1) {
                return true;
            }else return false;
        }
        
        throw new FeedbackAPIError(this._db.getLastQueryFailureReason());
    }

    public async dropAllTickets(): ReturnType<WebAPI.Feedback.IFeedbackManager["dropAllTickets"]> {
        const response = await this._db.performQuery(`DELETE FROM feedback_tickets;`,[]);    

        if(response==null) {
            throw new FeedbackAPIError(this._db.getLastQueryFailureReason());
        }
    }
}