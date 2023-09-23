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
        case "InvalidAction": message = "Given action doesn't exist. Check available action names with account-actions list-types."; break;
        default: message = "No additional information.";
    } 

    return message;
}

export default function(){

    const command = new Command("account-actions","Used to create, manage and view action tokens for accounts for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        const actionResult = await global.app.webAuthManager.getAllTokens();

        if(actionResult.result=="Success") {
            const headers = ["Token", "Action name","User","Created at", "Expires at"];
            const dataTable = initArrayOfArrays<string>(headers.length);

            
            for(let i=0; i< headers.length; i++)
                dataTable[i].push(headers[i]);

            for (const action of actionResult.data) {
                const user = await global.app.webAuthManager.getUser(action.userID);

                const values = [
                    action.tokenID, 
                    action.actionTypeName, 
                    user.result=="Success"?user.data.email:insertColor("fg_yellow",action.userID.toString(), data.colorsMode),
                    action.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                    insertColor(DateTime.now() > action.expirationDate?"fg_red":"fg_green",action.expirationDate.toFormat(`dd LLL yyyy HH:mm`),data.colorsMode)
                ];

                for(let i=0; i<values.length; i++)
                    dataTable[i].push(values[i]);
            }

            request.respond(getPrintableDataTable(dataTable));
        }else {
            const message = describeAPIError(actionResult.result);
            request.respond(`Couldn't fetch account actions- ${insertColor("fg_red",actionResult.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
        
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

        const token = await global.app.webAuthManager.createToken(actionType,userID ?? email ?? "");
        

        if(token.result=="Success") {
            request.respond(`${insertColor("fg_green","Action token generated!",data.colorsMode)}\nToken: ${insertColor("fg_cyan",token.data,data.colorsMode)}\n`);
        }else {
            const message = describeAPIError(token.result);
            request.respond(`Couldn't generate new action token for the user identified with: ${insertColor("fg_cyan", userID?.toString() ?? email ?? "", data.colorsMode)} -  ${insertColor("fg_red",token.result,data.colorsMode)}\n  ${insertColor("fg_grey",message,data.colorsMode)}`);
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
        const token = data.parameters["token"] as string;

        const tokenDetails = await global.app.webAuthManager.getTokenDetails(token);

        if(tokenDetails.result=="Success") {
            const user = await global.app.webAuthManager.getUser(tokenDetails.data.userID);

            req.respond("Account action Details:\n========================================", false);
            req.respond(`Token: ${insertColor("fg_cyan",token, data.colorsMode)}`, false);
            req.respond(`User: ${insertColor(user.result=="Success"?"fg_cyan":"fg_yellow",user.result=="Success"?`${user.data.email} (${user.data.userID})`:tokenDetails.data.userID.toString(), data.colorsMode)}`,false);
            req.respond(`Action type: ${insertColor("fg_cyan",tokenDetails.data.actionTypeName,data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", tokenDetails.data.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expires at: ${insertColor("fg_cyan",tokenDetails.data.expirationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Expired: ${DateTime.now() > tokenDetails.data.expirationDate?insertColor("fg_red","True",data.colorsMode):insertColor("fg_green","False",data.colorsMode)}`);
        }else {
            const message = describeAPIError(tokenDetails.result);
            req.respond(`Couldn't get details of ${insertColor("fg_cyan",token, data.colorsMode)} account action - ${insertColor('fg_red',tokenDetails.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
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

        const result = await global.app.webAuthManager.dropToken(token);

        if(result===true) {
            req.respond(insertColor("fg_green","Action token deleted successfully.",data.colorsMode));
        }else {
            const message = describeAPIError(result);
            req.respond(`Couldn't delete ${insertColor("fg_cyan",token, data.colorsMode)} action token - ${insertColor('fg_red',result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "delete-expired",
        desc: "Deletes all expired account actions.",
        params: []
    }, async (req, data)=>{
        const response = await global.app.webAuthManager.dropAllExpiredTokens();

        if(response===true) {
            req.respond(insertColor("fg_green","Successfully deleted all expired account actions.",data.colorsMode));
        }else {
            const message = describeAPIError(response);
            req.respond(`Couldn't delete account actions - ${insertColor("fg_red",response, data.colorsMode)}\n${insertColor("fg_grey",message, data.colorsMode)}`);
        }
    });

    command.addSubCommand({
        name: "list-types",
        desc: "Lists all possible account action types.",
        params: []
    }, async (req, data)=>{
        req.respond("Defined action types\n=================================================", false);

        const types = await global.app.webAuthManager.getTokenTypes();

        if(types.result=="Success") {
            for (const type of types.data) {
                req.respond(`${insertColor("fg_cyan","●",data.colorsMode)} ${type}`,false);
            }
            req.respond("");
        }else {
            const message = describeAPIError(types.result);
            req.respond(`Couldn't delete account actions - ${insertColor("fg_red",types.result, data.colorsMode)}\n${insertColor("fg_grey",message, data.colorsMode)}`);
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