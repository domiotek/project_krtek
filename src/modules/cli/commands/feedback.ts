import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../../output.js";
import { getPrintableDataTable, initArrayOfArrays } from "../../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("feedback","Allows for viewing and manipulating feedback tickets.",[],false);

    command.mainHandler(async (request, data)=>{
        
        let tickets;

        try {
            tickets = await global.app.feedbackManager.listTickets();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch tickets",error.errCode,data.colorsMode));
            return;
        }


        const headers = ["ID", "Type", "Creator", "Submitted on", "Title", ];
        const dataTable = initArrayOfArrays<string>(headers.length);

        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const ticket of tickets) {

            const values = [
                ticket.ID.toString(), 
                ticket.type,
                ticket.creatorUserID?.toString() ?? "null",
                ticket.submittedOn.toFormat(`dd LLL yyyy HH:mm`),
                ticket.title
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        request.respond(getPrintableDataTable(dataTable));
        
    });
    
    command.addSubCommand({
        name: "view",
        desc: "Displays details of specified ticket.",
        params: [
            {
                name: "ID",
                desc: "Ticket ID",
                type: "number",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const ticketID = data.parameters["ID"] as number;

        let ticket;
        let errCode;
        
        try {
            ticket = await global.app.feedbackManager.getTicket(ticketID);
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(ticket) {
            const user = await global.app.webAuthManager.getUser(ticket.creatorUserID ?? "");
            req.respond("Ticket Details:\n========================================", false);
            req.respond(`ID: ${insertColor("fg_cyan",ticket.ID.toString(), data.colorsMode)}`, false);
            req.respond(`Type: ${insertColor("fg_cyan",ticket.type, data.colorsMode)}`,false);
            req.respond(`Creator: ${insertColor("fg_cyan", user?.email ?? "Anonymous", data.colorsMode)}`, false);
            req.respond(`Submitted on: ${insertColor("fg_cyan",ticket.submittedOn.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Title: ${insertColor("fg_cyan",ticket.title, data.colorsMode)}`, false);
            req.respond(`Description: ${insertColor("fg_cyan", ticket.desc, data.colorsMode)}`);
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't get details of ${insertColor("fg_cyan",ticketID.toString(), data.colorsMode)} feedback ticket`, errCode ?? "InvalitToken", data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete",
        desc: "Allows for deleting feedback tickets",
        params: [
            {
                name: "ticket",
                desc: "ID of the feedback ticket",
                type: "number",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const ticketID = data.parameters["ticket"] as number;
        
        let result;
        let errCode;
        try {
            result = await global.app.feedbackManager.dropTicket(ticketID);
        } catch (error: any) {
            if(!error.errCode) throw error;

            errCode = error.errCode;
        }

        if(result===true) {
            req.respond(insertColor("fg_green","Ticket deleted successfully.",data.colorsMode));
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't delete ${insertColor("fg_cyan",ticketID.toString(), data.colorsMode)} feedback ticket`,errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete-all",
        desc: "Deletes all feedback tickets.",
        params: []
    }, async (req, data)=>{
        try {
            await global.app.feedbackManager.dropAllTickets();
            req.respond(insertColor("fg_green","Successfully deleted all feedback tickets.",data.colorsMode));
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete tickets", error.errCode, data.colorsMode));
        }
    });

    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageFeedbackTickets");
        },
    }, variant=>{
        variant.excludeSubCommand("view");
        variant.excludeSubCommand("delete");
        variant.excludeSubCommand("delete-all");
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewFeedbackTickets") && !checkRequirement("allowedAction","manageFeedbackTickets");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}