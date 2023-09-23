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
        case "UserExists": message = "There is already user with that email address."; break;
        case "InvalidPassword": message = "Given password doesn't meet the requirements."; break;
        default: message = "No additional information.";
    } 

    return message;
}

export default function(){

    const command = new Command("users","Used to create, manage and view accounts for WebAPI. ",[],false);

    command.mainHandler(async (request, data)=>{
        
        const usersResult = await global.app.webAuthManager.getAllUsers();

        if(usersResult.result=="Success") {
            const headers = ["UserID", "Email","Name","Surname", "Gender", "RoleID", "Created at", "Last accessed at", "Password last changed at"];
            const dataTable = initArrayOfArrays<string>(headers.length);

            
            for(let i=0; i< headers.length; i++)
                dataTable[i].push(headers[i]);

            for (const user of usersResult.data) {
                const values = [
                    user.userID.toString(), 
                    user.email, 
                    user.name,
                    user.surname,
                    user.gender,
                    user.roleID.toString(), 
                    user.creationDate.toFormat(`dd LLL yyyy HH:mm`),
                    user.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`),
                    user.lastPasswordChangeDate.toFormat(`dd LLL yyyy HH:mm`)
                ];

                for(let i=0; i<values.length; i++)
                    dataTable[i].push(values[i]);
            }

            request.respond(getPrintableDataTable(dataTable));
        }else {
            const message = describeAPIError(usersResult.result);
            request.respond(`Couldn't fetch accounts- ${insertColor("fg_red",usersResult.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
        
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

        const response = await global.app.webAuthManager.createUser(userDetails);

        if(response===true) {
            request.respond(`${insertColor("fg_green","Account created!",data.colorsMode)}`);
        }else {
            const message = describeAPIError(response);
            request.respond(`Couldn't user with that parameters - ${insertColor("fg_red",response,data.colorsMode)}\n  ${insertColor("fg_grey",message,data.colorsMode)}`);
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

        const userDetails = await global.app.webAuthManager.getUser(userID ?? email ?? "");

        if(userDetails.result=="Success") {
            const user = userDetails.data;
            req.respond("Account Details:\n========================================", false);
            req.respond(`User ID: ${insertColor("fg_cyan",user.userID.toString(), data.colorsMode)}`, false);
            req.respond(`Email: ${insertColor("fg_cyan",user.email,data.colorsMode)}`,false);
            req.respond(`Name: ${insertColor("fg_cyan",user.name,data.colorsMode)}`, false);
            req.respond(`Surname: ${insertColor("fg_cyan",user.surname,data.colorsMode)}`, false);
            req.respond(`Gender: ${insertColor("fg_cyan",user.gender,data.colorsMode)}`, false);
            req.respond(`RoleID: ${insertColor("fg_cyan",user.roleID.toString(),data.colorsMode)}`, false);
            req.respond(`Created at: ${insertColor("fg_cyan", user.creationDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Last accessed at: ${insertColor("fg_cyan",user.lastAccessDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`, false);
            req.respond(`Password last changed at: ${insertColor("fg_cyan",user.lastPasswordChangeDate.toFormat(`dd LLL yyyy HH:mm`), data.colorsMode)}`);
        }else {
            const message = describeAPIError(userDetails.result);
            req.respond(`Couldn't get details of account identified by: ${insertColor("fg_cyan",userID?.toString() ?? email ?? "", data.colorsMode)} - ${insertColor('fg_red',userDetails.result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
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

        const result = await global.app.webAuthManager.setPassword(userID ?? email ?? "", password);

        if(result===true) {
            req.respond(insertColor("fg_green","Password set successfully.",data.colorsMode));
        }else {
            const message = describeAPIError(result);
            req.respond(`Couldn't set password for an account identified by: ${insertColor("fg_cyan",userID?.toString() ?? email ?? "", data.colorsMode)} - ${insertColor('fg_red',result,data.colorsMode)}\n${insertColor("fg_grey",message,data.colorsMode)}`);
        }
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