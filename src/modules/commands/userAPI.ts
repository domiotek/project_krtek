import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { getPrintableDataTable, initArrayOfArrays } from "../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("users","Used to create, manage and view accounts for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        let users;

        try {
            users = await global.app.webAuthManager.getAllUsers();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch accounts",error.errCode, data.colorsMode));
            return;
        }


        const headers = ["UserID", "Email","Name","Surname", "Gender", "Rank", "Created at", "Last accessed at", "Password last changed at"];
        const dataTable = initArrayOfArrays<string>(headers.length);

        
        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const user of users) {
            const values = [
                user.userID.toString(), 
                user.email, 
                user.name,
                user.surname,
                user.gender,
                user.rankName, 
                user.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                user.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`),
                user.lastPasswordChangeDate.toFormat(`dd LLL yyyy HH:mm`)
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        request.respond(getPrintableDataTable(dataTable));
        
    });


    command.addSubCommand({
        name: "create",
        desc: "Creates new WebAPI account. Please note that it's discouraged to manually create accounts for users, it's better to send them an invite using invitesAPI. Use it with caution!",
        params: [
            {
                name: "email",
                desc: "Valid email address (case insensitive). Will fail if given invalid email",
                type: "string",
                caseSensitive: false
            },
            {
                name: "password",
                desc: "Password that matches all requirements (At least 8 characters long with one uppercase, one lowercase, digit and one symbol)",
                type: "string"
            },
            {
                name: "name",
                desc: "First name",
                type: "string"
            },
            {
                name: "surname",
                desc: "Last name",
                type: "string"
            },
            {
                name: "gender",
                desc: "User's gender.",
                type: "enum",
                enum: ["f", "m", "o"]
            }
        ]
    }, async (request, data)=>{

        const userDetails: WebAPI.Auth.UserAPI.IUserRegistrationData = {
            email: data.parameters["email"] as string,
            password: data.parameters["password"] as string,
            name: data.parameters["name"] as string,
            surname: data.parameters["surname"] as string, 
            gender: data.parameters["gender"] as string
        }

        try {
            await global.app.webAuthManager.createUser(userDetails);
            request.respond(`${insertColor("fg_green","Account created!",data.colorsMode)}`);
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't user with that parameters",error.errCode, data.colorsMode));
        }
    });
    
    command.addSubCommand({
        name: "get",
        desc: "Retrieves details about the specified account",
        params: [
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
    }, async (req, data)=>{

        const userID = data.parameters["userID"] as number | undefined;
        const email = data.parameters["email"] as string | undefined;

        let errCode;
        let user;

        try {
            user = await global.app.webAuthManager.getUser(userID ?? email ?? "");
        } catch (error: any) {
            if(!error.errCode) throw error;
            errCode = error.errCode;
        }

        if(user) {
            req.respond("Account Details:\n========================================", false);
            req.respond(`User ID: ${insertColor("fg_cyan",user.userID.toString(), data.colorsMode)}`, false);
            req.respond(`Email: ${insertColor("fg_cyan",user.email,data.colorsMode)}`,false);
            req.respond(`Name: ${insertColor("fg_cyan",user.name,data.colorsMode)}`, false);
            req.respond(`Surname: ${insertColor("fg_cyan",user.surname,data.colorsMode)}`, false);
            req.respond(`Gender: ${insertColor("fg_cyan",user.gender,data.colorsMode)}`, false);
            req.respond(`Rank: ${insertColor("fg_cyan",user.rankName,data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", user.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Last accessed at: ${insertColor("fg_cyan",user.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Password last changed at: ${insertColor("fg_cyan",user.lastPasswordChangeDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`);
        }else {
            req.respond(getCommandErrorDisplayText(`Couldn't get details of account identified by: ${insertColor("fg_cyan",userID?.toString() ?? email ?? "", data.colorsMode)}`,errCode ?? "NoUser", data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "set-password",
        desc: "Allows for updating user's password. Please note, that this will not notify user of the change and isn't very privacy friendly, since it takes plain text password, which is later on hashed and salted. Use only when absolutely necessary with the intention, that the user will change their password right after using safe.",
        params: [
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
            }, 
            {
                name: "password",
                desc: "New plain text password.",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const userID = data.parameters["userID"] as number | undefined;
        const email = data.parameters["email"] as string | undefined;
        const password = data.parameters["password"] as string;

        try {
            await global.app.webAuthManager.setPassword(userID ?? email ?? "", password);
            req.respond(insertColor("fg_green","Password set successfully.",data.colorsMode));
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't set password for an account identified by: ${insertColor("fg_cyan",userID?.toString() ?? email ?? "", data.colorsMode)}`,error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "assign-rank",
        desc: "Assigns given rank to the specified user.",
        params: [
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
            }, 
            {
                name: "rankName",
                desc: "Rank to assign",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const userID = data.parameters["userID"] as number | undefined;
        const email = data.parameters["email"] as string | undefined;
        const rankName = data.parameters["rankName"] as string;

        try {
            await global.app.webAuthManager.assignRank(userID ?? email ?? "",rankName);
            req.respond(insertColor("fg_green","Rank has been successfully assigned.",data.colorsMode));
        } catch (error:any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't assign rank for an account identified by: ${insertColor("fg_cyan",userID?.toString() ?? email ?? "", data.colorsMode)}`,error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({
        name: "list-ranks",
        desc: "Lists all defined ranks.",
        params: []
    }, async (req, data)=>{
        let ranks;
        try {
            ranks = await global.app.webAuthManager.getRanks();
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't fetch ranks",error.errCode, data.colorsMode));
            return;
        }

        const headers = ["Rank ID", "Name","Display name"];
        const dataTable = initArrayOfArrays<string>(headers.length);

        
        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const rank of ranks) {
            const values = [
                rank.ID.toString(), 
                rank.rankName, 
                rank.displayName,
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        req.respond(getPrintableDataTable(dataTable));
    });

    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageUsers");
        },
    }, variant=>{
        variant.excludeSubCommand("create");
        variant.excludeSubCommand("get");
        variant.excludeSubCommand("set-password");
        variant.excludeSubCommand("assign-rank");
        variant.excludeSubCommand("list-ranks");

    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","viewUsers") && !checkRequirement("allowedAction","manageUsers");
        },
    },variant=>{
        variant.overwriteMainHandler(async (request, data)=>{
            request.respond(insertColor("fg_yellow","You don't have permissions to access this command."));
        });
    });


    global.app.commands.register(command);
}