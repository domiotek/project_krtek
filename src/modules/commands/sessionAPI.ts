import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { getPrintableDataTable, initArrayOfArrays } from "../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("sessions","Used to manage and view WebAPI account' auth sessions. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        let sessions;
        try {
            sessions = await global.app.webAuthManager.getAllSessions();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch sessions", error.errCode, data.colorsMode));
            return;
        }

        const headers = ["Session","User","IP address","Created at", "Last accessed at", "Expires at"];
        const dataTable = initArrayOfArrays<string>(headers.length);
        
        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const session of sessions) {
            const user = await global.app.webAuthManager.getUser(session.userID);

            const values = [
                session.sessionID, 
                insertColor(user?"fg_white":"fg_yellow",user?user.email:session.userID.toString(),data.colorsMode),
                session.ipAddress,
                session.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                session.lastAccessDate.toFormat("dd LLL yyyy HH:mm"),
                insertColor(DateTime.now() > session.expirationDate?"fg_red":"fg_green",session.expirationDate.toFormat(`dd LLL yyyy HH:mm`),data.colorsMode)
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        request.respond(getPrintableDataTable(dataTable,[0,9]));
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

        let session;
        let errCode;

        try {
            session = await global.app.webAuthManager.getSessionDetails(token);
        } catch (error: any) {
            if(!error.errCode) throw error;
            session = null;
            errCode = error.errCode;
        }

        if(session) {
            const user = await global.app.webAuthManager.getUser(session.userID);

            req.respond("SessionDetails:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",token, data.colorsMode)}`, false);
            req.respond(`User: ${insertColor(user?"fg_cyan":"fg_yellow",user?`${user.email} (${user.userID})`:session.userID.toString(), data.colorsMode)}`,false);
            req.respond(`IP address: ${insertColor("fg_cyan",session.ipAddress, data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", session.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Last accessed at: ${insertColor("fg_cyan", session.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",session.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > session.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't get details of ${insertColor("fg_cyan",token, data.colorsMode)} session`,errCode ?? "InvalidSession", data.colorsMode));
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

        let result: boolean = false;
        let errCode: WebAPI.APIErrors<"Auth"> | "InvalidSession"= "InvalidSession";

        try {
            result = await global.app.webAuthManager.dropSession(token);
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(result) {
            req.respond(insertColor("fg_green","Session deleted successfully.",data.colorsMode));
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} auth session`,errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired auth sessions.",
        params: []
    }, async (req, data)=>{

        try {
            await global.app.webAuthManager.dropAllExpiredSessions();
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete auth sessions",error.errCode, data.colorsMode));
        }

        req.respond(insertColor("fg_green","Successfully deleted all expired auth sessions.",data.colorsMode));
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