import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { getPrintableDataTable, initArrayOfArrays } from "../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("invites","Used to create, manage and view registration invites for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        let invites;

        try {
            invites = await global.app.webAuthManager.getAllInvites();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch invites",error.errCode,data.colorsMode));
            return;
        }


        const headers = ["Token", "Email","Created at", "Expires at"];
        const dataTable = initArrayOfArrays<string>(headers.length);

        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const invite of invites) {

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
    }, async (req, data)=>{
        const email = data.parameters["email"] as string;

        

        try {
            const token = await global.app.webAuthManager.generateInvite(email);
            req.respond(`${insertColor("fg_green","Invite generated!",data.colorsMode)}\nToken: ${insertColor("fg_cyan",token,data.colorsMode)}\nLink: ${insertColor("fg_cyan",`${global.app.env.server.url}/p/invite?token=${token}`,data.colorsMode)}`);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't generate new invite for the ${insertColor("fg_cyan", email, data.colorsMode)} email address`, error.errCode,data.colorsMode));
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
        const tokenID = data.parameters["tokenOrEmail"] as string;

        let token;
        let errCode;
        
        try {
            token = await global.app.webAuthManager.getInviteDetails(tokenID);
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(token) {
            req.respond("Invite Details:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",token.token, data.colorsMode)}`, false);
            req.respond(`Email: ${insertColor("fg_cyan",token.email, data.colorsMode)}`,false);
            req.respond(`Created at: ${insertColor("fg_cyan", token.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",token.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > token.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't get details of ${insertColor("fg_cyan",tokenID, data.colorsMode)} invite`, errCode ?? "InvalitToken", data.colorsMode));
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
        
        let result;
        let errCode;
        try {
            result = await global.app.webAuthManager.dropInvite(token);
        } catch (error: any) {
            if(!error.errCode) throw error;

            errCode = error.errCode;
        }

        if(result===true) {
            req.respond(insertColor("fg_green","Invite deleted successfully.",data.colorsMode));
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} invite`,errCode, data.colorsMode));
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

        let invite;
        let errCode;

        try {
            invite = await global.app.webAuthManager.getInviteDetails(input);
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(invite) {
            if(template&&sender) {
                const sendResult = await global.app.mailer.send(sender, invite.email,template, { invitation_link: `${global.app.env.server.url}/p/Invite?token=${invite.token}`});
                if(sendResult) {
                    req.respond(insertColor("fg_green",`Email has been sent!`, data.colorsMode));
                }else req.respond(insertColor("fg_red","Couldn't send that email right now. No additional information available.", data.colorsMode));
            }else req.respond(insertColor("fg_red","We couldn't sent that email right now due to mailer configuration error.", data.colorsMode));
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't send invite identified by: ${insertColor("fg_cyan",input, data.colorsMode)}`, errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired invites.",
        params: []
    }, async (req, data)=>{
        try {
            await global.app.webAuthManager.dropAllExpiredInvites();
            req.respond(insertColor("fg_green","Successfully deleted all expired invites.",data.colorsMode));
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete invites", error.errCode, data.colorsMode));
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