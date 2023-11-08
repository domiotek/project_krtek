import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import Output from "../../../output.js";
import {isAPIError, parseErrorObject, describeAPIError } from "../../../util.js";


/**
 * Default Error handler for REST API.
 * @param err Incoming error. Can be either FastifyError thrown on route level or APIError thrown by API modules.
 */
export async function errorHandler(err: FastifyError, req: FastifyRequest, res: FastifyReply) {
    
    if(isAPIError(err)) {
        const errData = parseErrorObject(err);

        Output.category("debug").print("notice",`[API][${req.method}][${req.url}] ${err.module}.${errData.faultingMethod} call failed with '${err.errCode}'.`,"webapi");

        let message = undefined;

        switch(err.errCode) {
            case "NoConnection":
                res.status(504);
                message = "DB is down";
            break;
            case "DBError":
                res.status(502);
                message = "DB experienced errors"
            break;
            case "NotImplemented":
                res.status(501);
                message = "This functionality isn't ready yet. Why is it accessible?"
            break;
            default:
                res.status(400);
                message = describeAPIError(err.errCode);
            break;
        }

        return {
            status: "Failure",
            errCode: err.errCode,
            message
        }
    }else {
        Output.category("debug").print("error",err);
        res.status(500);
        
        return {
            status: "Failure",
            errCode: "InternalError",
            message: "Uncaught internal error."
        }
    }
    
}