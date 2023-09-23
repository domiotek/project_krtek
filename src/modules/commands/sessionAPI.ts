import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { getPrintableDataTable, initArrayOfArrays } from "../util.js";

function describeAPIError(errorCode: string) {
    let message;

    switch(errorCode) {
        case "DBError": message = "There was an issue with database."; break;
        case "NoConnection": message = "Server couldn't establish connection with the database.";break;
        case "InvalidToken": message = "Given token doesn't exist."; break;
        case "NoUser": message = "Couldn't find user matching given criteria."; break;
        case "InvalidSession": message="Given token doesn't represent any session."; break;
        default: message = "No additional information.";
    } 

    return message;
}

export default function(){

    const command = new Command("sessions","Used to manage and view WebAPI account' auth sessions. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        const sessionsResult = await global.app.webAuthManager.getAllSessions();

        if(sessionsResult.result=="Success") {
            const headers = ["Session","User","IP address","Created at", "Last accessed at", "Expires at"];
            const dataTable = initArrayOfArrays<string>(headers.length);

            
            for(let i=0; i< headers.length; i++)
                dataTable[i].push(headers[i]);

            for (const session of sessionsResult.data) {
                const user = await global.app.webAuthManager.getUser(session.userID);

                const values = [
                    session.sessionID, 
                    insertColor( user.result=="Success"?"fg_white":"fg_yellow",user.result=="Success"?user.data.email:session.userID,data.colorsMode),
                    session.ipAddress,
                    session.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                    session.lastAccessDate.toFormat("dd LLL yyyy HH:mm"),
                    insertColor(DateTime.now() > session.expirationDate?"fg_red":"fg_green",session.expirationDate.toFormat(`dd LLL yyyy HH:mm`),data.colorsMode)
                ];

                for(let i=0; i<values.length; i++)
                    dataTable[i].push(values[i]);
            }

            request.respond(getPrintableDataTable(dataTable,[0,9]));
        }else {
            const message = describeAPIError(sessionsResult.result);
            request.respond(`Couldn't fetch sessions - ${insertColor("fg_red",sessionsResult.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
        
    });

    command.addSubCommand({
        name: "get",
        desc: "Retrieves details about the given session",
        params: [
            {
                name: "session",
                desc: "Token identifying the session",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["session"] as string;

        const session = await global.app.webAuthManager.getSessionDetails(token);

        if(session.result=="Success") {
            const user = await global.app.webAuthManager.getUser(session.data.userID);

            req.respond("SessionDetails:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",token, data.colorsMode)}`, false);
            req.respond(`User: ${insertColor(user.result=="Success"?"fg_cyan":"fg_yellow",user.result=="Success"?`${user.data.email} (${user.data.userID})`:session.data.userID.toString(), data.colorsMode)}`,false);
            req.respond(`IP address: ${insertColor("fg_cyan",session.data.ipAddress, data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", session.data.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Last accessed at: ${insertColor("fg_cyan", session.data.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",session.data.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > session.data.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            const message = describeAPIError(session.result);
            req.respond(`Couldn't get details of ${insertColor("fg_cyan",token, data.colorsMode)} session - ${insertColor('fg_red',session.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "delete",
        desc: "Allows for deleting auth session",
        params: [
            {
                name: "session",
                desc: "Token identifying the action",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["session"] as string;

        const result = await global.app.webAuthManager.dropSession(token)

        if(result===true) {
            req.respond(insertColor("fg_green","Session deleted successfully.",data.colorsMode));
        }else {
            const message = describeAPIError(result);
            req.respond(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} auth session - ${insertColor('fg_red',result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired auth sessions.",
        params: []
    }, async (req, data)=>{
        const response = await global.app.webAuthManager.dropAllExpiredSessions();

        if(response===true) {
            req.respond(insertColor("fg_green","Successfully deleted all expired auth sessions.",data.colorsMode));
        }else {
            const message = describeAPIError(response);
            req.respond(`Couldn't delete auth sessions- ${insertColor("fg_red",response, data.colorsMode)}\n${insertColor("fg_grey",message, data.colorsMode)}`);
        }
    });

    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageSessions");
        },
    }, variant=>{
        variant.excludeSubCommand("get");
        variant.excludeSubCommand("delete");
        variant.excludeSubCommand("delete-expired");
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewSessions") && !checkRequirement("allowedAction","manageSessions");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}