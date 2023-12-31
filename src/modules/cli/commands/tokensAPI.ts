import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../../output.js";
import { APIError, getPrintableDataTable, initArrayOfArrays } from "../../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("account-actions","Used to create, manage and view action tokens for accounts for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{

        let tokens;
        try {
            tokens = await global.app.webAuthManager.getAllTokens();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch account actions",error.errCode, data.colorsMode));
            return;
        }

        const headers = ["Token", "Action name","User","Created at", "Expires at"];
        const dataTable = initArrayOfArrays<string>(headers.length);

        
        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const action of tokens) {
            const user = await global.app.webAuthManager.getUser(action.userID);

            const values = [
                action.tokenID, 
                action.actionTypeName, 
                user?user.email:insertColor("fg_yellow",action.userID.toString(), data.colorsMode),
                action.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                insertColor(DateTime.now() > action.expirationDate?"fg_red":"fg_green",action.expirationDate.toFormat(`dd LLL yyyy HH:mm`),data.colorsMode)
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        request.respond(getPrintableDataTable(dataTable));
    });


    command.addSubCommand({
        name: "create",
        desc: "Creates new WebAPI account action token",
        params: [
            {
                name: "actionType",
                desc: "Account action names. For full list invoke account-actions list-types",
                type: "string",
                caseSensitive: false
            },
            {
                relation: "oneOf",
                parameters: [
                    {
                        name: "userID",
                        desc: "User's ID.",
                        type: "number"
                    },
                    {
                        name: "email",
                        desc: "User's email.",
                        type: "string"
                    }
                ]
            }
        ]
    }, async (request, data)=>{
        const userID = data.parameters["userID"] as number | undefined;
        const email = data.parameters["email"] as string | undefined;

        const actionType = data.parameters["actionType"] as WebAPI.Auth.AccountsTokenAPI.TAccountActionName;

        try {
            const token = await global.app.webAuthManager.createToken(actionType,userID ?? email ?? "");
            request.respond(`${insertColor("fg_green","Action token generated!",data.colorsMode)}\nToken: ${insertColor("fg_cyan",token,data.colorsMode)}\n`);
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText(`Couldn't generate new action token for the user identified with: ${insertColor("fg_cyan", userID?.toString() ?? email ?? "", data.colorsMode)}`,error.errCode, data.colorsMode));
        }
    });
    
    command.addSubCommand({
        name: "get",
        desc: "Retrieves details about the given account action",
        params: [
            {
                name: "token",
                desc: "Token identifying the action",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const tokenID = data.parameters["token"] as string;

        let token;
        let errCode;

        try {
            token = await global.app.webAuthManager.getTokenDetails(tokenID);
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(token) {
            const user = await global.app.webAuthManager.getUser(token.userID);

            req.respond("Account action Details:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",tokenID, data.colorsMode)}`, false);
            req.respond(`User: ${insertColor(user?"fg_cyan":"fg_yellow",user?`${user.email} (${user.userID})`:token.userID.toString(), data.colorsMode)}`,false);
            req.respond(`Action type: ${insertColor("fg_cyan",token.actionTypeName,data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", token.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",token.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > token.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't get details of ${insertColor("fg_cyan",tokenID, data.colorsMode)} account action`,errCode ?? "InvalidToken", data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete",
        desc: "Allows for deleting account actions",
        params: [
            {
                name: "token",
                desc: "Token identifying the action",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["token"] as string;

        try {
            const result = await global.app.webAuthManager.dropToken(token);
            if(!result) throw  new APIError("WebAuthManager","InvalidToken");
            req.respond(insertColor("fg_green","Action token deleted successfully.",data.colorsMode));
        } catch (error: any) {
            if(!error.errCode) throw error.errCode;
            req.respond(getCommandErrorDisplayText(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} action token`,error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired account actions.",
        params: []
    }, async (req, data)=>{
        try {
            await global.app.webAuthManager.dropAllExpiredTokens();
            req.respond(insertColor("fg_green","Successfully deleted all expired account actions.",data.colorsMode));
        } catch (error:any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't delete account actions`,error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "list-types",
        desc: "Lists all possible account action types.",
        params: []
    }, async (req, data)=>{
        req.respond("Defined action types\n=================================================", false);

        try {
            const types = await global.app.webAuthManager.getTokenTypes();
            for (const type of types) {
                req.respond(`${insertColor("fg_cyan","●",data.colorsMode)} ${type}`,false);
            }
            req.respond("");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't list types of account actions`,error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "renew",
        desc: "Allows for renewing action's validity.",
        params: [
            {
                name: "token",
                desc: "Token identifying the account action",
                type: "string",
                caseSensitive: true
            }
        ]
    }, async (req, data)=>{
        const token = data.parameters["token"] as string;
        
        let result;
        let errCode: WebAPI.APIErrors<"Auth"> | undefined= undefined;
        try {
            result = await global.app.webAuthManager.renewToken(token);
        } catch (error: any) {
            if(!error.errCode) throw error;

            errCode = error.errCode;
        }

        if(result===true) {
            req.respond(insertColor("fg_green","Action token renewed successfully.",data.colorsMode));
        }else {
            if(errCode===undefined) errCode = "InvalidToken";
            req.respond(getCommandErrorDisplayText(`Couldn't renew ${insertColor("fg_cyan",token, data.colorsMode)} action token`,errCode, data.colorsMode));
        }
    });

    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageTokens");
        },
    }, variant=>{
        variant.excludeSubCommand("create");
        variant.excludeSubCommand("get");
        variant.excludeSubCommand("delete");
        variant.excludeSubCommand("delete-expired");
        variant.excludeSubCommand("list-types");
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewTokens") && !checkRequirement("allowedAction","manageTokens");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}