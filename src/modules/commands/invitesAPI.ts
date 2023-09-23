import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { fillWith, getPrintableDataTable, initArrayOfArrays } from "../util.js";

function describeAPIError(errorCode: string) {
    let message;

    switch(errorCode) {
        case "AccountExists": message = "Account with that email address already exists."; break;
        case "InvalidEmail": message = "Given email address is invalid."; break;
        case "InviteExists": message = "There is already active invite for the specifed email address."; break;
        case "DBError": message = "There was an issue with database."; break;
        case "NoConnection": message = "Server couldn't establish connection with the database.";break;
        case "InvalidToken": message = "Given token doesn't exist."; break;
        default: message = "No additional information.";
    } 

    return message;
}

export default function(){

    const command = new Command("invites","Used to create, manage and view registration invites for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        const invitesResult = await global.app.webAuthManager.getAllInvites();

        if(invitesResult.result=="Success") {

            const headers = ["Token", "Email","Created at", "Expires at"];
            const dataTable = initArrayOfArrays<string>(headers.length);

            for(let i=0; i< headers.length; i++)
                dataTable[i].push(headers[i]);

            for (const invite of invitesResult.data) {

                const values = [
                    invite.token, 
                    invite.email,
                    invite.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                    insertColor(DateTime.now() > invite.expirationDate?"fg_red":"fg_green",invite.expirationDate.toFormat(`dd LLL yyyy HH:mm`),data.colorsMode)
                ];

                for(let i=0; i<values.length; i++)
                    dataTable[i].push(values[i]);
            }

            request.respond(getPrintableDataTable(dataTable));
        }else {
            const message = describeAPIError(invitesResult.result);
            request.respond(`Couldn't fetch invites - ${insertColor("fg_red",invitesResult.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
        
    });


    command.addSubCommand({
        name: "create",
        desc: "Creates new WebAPI invite",
        params: [
            {
                name: "email",
                desc: "Target email. This email will be then used to create new account without possibility to change it.",
                type: "string",
                caseSensitive: false
            }
        ]
    }, async (request, data)=>{
        const email = data.parameters["email"] as string;

        const token = await global.app.webAuthManager.generateInvite(email);

        if(token.result=="Success") {
            request.respond(`${insertColor("fg_green","Invite generated!",data.colorsMode)}\nToken: ${insertColor("fg_cyan",token.data,data.colorsMode)}\nLink: ${insertColor("fg_cyan",`${global.app.env.server.url}/p/invite?token=${token.data}`,data.colorsMode)}`);
        }else {
            const message = describeAPIError(token.result);
            request.respond(`Couldn't generate new invite for the ${insertColor("fg_cyan", email, data.colorsMode)} email address: ${insertColor("fg_red",token.result,data.colorsMode)}\n  ${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });
    
    command.addSubCommand({
        name: "get",
        desc: "Retrieves details about the given invite",
        params: [
            {
                name: "tokenOrEmail",
                desc: "Token or email identifying the invite",
                type: "string",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["tokenOrEmail"] as string;

        const tokenDetails = await global.app.webAuthManager.getInviteDetails(token);

        if(tokenDetails.result=="Success") {
            req.respond("Invite Details:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",token, data.colorsMode)}`, false);
            req.respond(`Email: ${insertColor("fg_cyan",tokenDetails.data.email, data.colorsMode)}`,false);
            req.respond(`Created at: ${insertColor("fg_cyan", tokenDetails.data.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",tokenDetails.data.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > tokenDetails.data.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            const message = describeAPIError(tokenDetails.result);
            req.respond(`Couldn't get details of ${insertColor("fg_cyan",token, data.colorsMode)} invite - ${insertColor('fg_red',tokenDetails.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "delete",
        desc: "Allows for deleting invites",
        params: [
            {
                name: "token",
                desc: "Token identifying the invite",
                type: "string",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["token"] as string;

        const result = await global.app.webAuthManager.dropInvite(token);

        if(result===true) {
            req.respond(insertColor("fg_green","Invite deleted successfully.",data.colorsMode));
        }else {
            const message = describeAPIError(result);
            req.respond(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} invite - ${insertColor('fg_red',result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "send",
        desc: "Sends invite email to the target of the specified invite.",
        params: [
            {
                name: "tokenOrEmail",
                desc: "Token or email identifying the invite",
                type: "string",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const template = global.app.mailer.getTemplate("RegistrationInvitation");
        const sender = global.app.mailer.getSender("aas");

        const input = data.parameters["tokenOrEmail"] as string;

        const inviteDetails = await global.app.webAuthManager.getInviteDetails(input);

        if(inviteDetails.result=="Success") {

            if(template&&sender) {
                const sendResult = await global.app.mailer.send(sender, inviteDetails.data.email,template, { invitation_link: `http://127.0.0.1:3000/p/Invite?token=${inviteDetails.data.token}`});
                if(sendResult) {
                    req.respond(insertColor("fg_green",`Email has been sent!`, data.colorsMode));
                }else req.respond(insertColor("fg_red","Couldn't send that email right now. No additional information available.", data.colorsMode));
            }else req.respond(insertColor("fg_red","We couldn't sent that email right now due to mailer configuration error.", data.colorsMode));
        }else {
            const message = describeAPIError(inviteDetails.result);
            req.respond(`Couldn't send invite identified by: ${insertColor("fg_cyan",input, data.colorsMode)} - ${insertColor('fg_red',inviteDetails.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired invites.",
        params: []
    }, async (req, data)=>{
        const response = await global.app.webAuthManager.dropAllExpiredInvites();

        if(response===true) {
            req.respond(insertColor("fg_green","Successfully deleted all expired invites.",data.colorsMode));
        }else {
            const message = describeAPIError(response);
            req.respond(`Couldn't delete invites - ${insertColor("fg_red",response, data.colorsMode)}\n${insertColor("fg_grey",message, data.colorsMode)}`);
        }
    });

    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageInvites");
        },
    }, variant=>{
        variant.excludeSubCommand("create");
        variant.excludeSubCommand("send");
        variant.excludeSubCommand("get");
        variant.excludeSubCommand("delete");
        variant.excludeSubCommand("delete-expired");
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewInvites") && !checkRequirement("allowedAction","manageInvites");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}