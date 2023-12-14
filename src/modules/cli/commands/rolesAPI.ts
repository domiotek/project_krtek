import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../../output.js";
import { APIError, getPrintableDataTable, initArrayOfArrays } from "../../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("roles","Used to manage and view WebAPI user roles.",[],false);

    command.mainHandler(async (request, data)=>{
        
        let roles;
        try {
            roles = await global.app.webAuthManager.getDefinedRoles();
        } catch (error: any) {
            if(!error.errCode) throw error;
            request.respond(getCommandErrorDisplayText("Couldn't fetch roles", error.errCode, data.colorsMode));
            return;
        }

        const headers = ["ID","Code name","User count"];
        const dataTable = initArrayOfArrays<string>(headers.length);
        
        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const role of roles) {
            const users = await global.app.webAuthManager.listUsersWithRole(role.name);

            const values = [
                role.ID.toString(), 
                role.name,
                (users?.length ?? 0).toString()
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        request.respond(getPrintableDataTable(dataTable,));
    });

    command.addSubCommand({
        name: "get-users",
        desc: "Retrieves all users that have specified role assigned.",
        params: [
            {
                name: "roleName",
                desc: "Role's codename",
                type: "string"
            }
        ]
    }, async (req, data)=>{
        const role = data.parameters["roleName"] as string;

        let users;
        try {
            users = await global.app.webAuthManager.listUsersWithRole(role);
            if(!users) throw new APIError("WebAuthManager","InvalidRole");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't fetch user list`, error.errCode, data.colorsMode));
            return;
        }

        req.respond(`Users with '${insertColor("fg_cyan",role, data.colorsMode)}' role:\n========================================`, false);

        for (const user of users) {
            req.respond(`${user.name} ${user.surname} - ${user.email} (${user.userID})`, false);
        }

        req.respond(users.length==0?"No users found":"");
        
    });

    command.addSubCommand({
        name: "get-roles-of",
        desc: "Retrieves all roles that user has assigned.",
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
        const userID = data.parameters["userID"] as string | undefined;
        const email = data.parameters["email"] as string | undefined;

        let roles;
        try {
            roles = await global.app.webAuthManager.getUserRoles(userID ?? email ?? "");
            if(!roles) throw new APIError("WebAuthManager","NoUser");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't fetch role list`, error.errCode, data.colorsMode));
            return;
        }

        req.respond(`Roles assigned to the requested user:\n========================================`, false);

        for (const role of roles) {
            req.respond(`${role.ID} / ${role.name}`, false);
        }

        req.respond(roles.length==0?"No roles found":"");
        
    });

    command.addSubCommand({
        name: "assign",
        desc: "Allows for assigning role to the user.",
        params: [
            {
                name: "roleName",
                desc: "Role's codename",
                type: "string"
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
    }, async (req, data)=>{
        const role = data.parameters["roleName"] as string;
        const userID = data.parameters["userID"] as string | undefined;
        const email = data.parameters["email"] as string | undefined;

        try {
            await global.app.webAuthManager.assignRole(userID ?? email ?? "",role);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't assign role`, error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", `Successfully assigned '${role}' role to the specified user.`));
        
    });

    command.addSubCommand({
        name: "unassign",
        desc: "Allows for unassigning role from the user.",
        params: [
            {
                name: "roleName",
                desc: "Role's codename",
                type: "string"
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
    }, async (req, data)=>{
        const role = data.parameters["roleName"] as string;
        const userID = data.parameters["userID"] as string | undefined;
        const email = data.parameters["email"] as string | undefined;

        try {
            if(!await global.app.webAuthManager.userExists(userID ?? email ?? ""))
                throw new APIError("WebAuthManager","NoUser");
            await global.app.webAuthManager.unassignRole(userID ?? email ?? "",role);
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't unassign role`, error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", `Successfully unassigned '${role}' role from the specified user.`));
        
    });
    
    command.addSubCommand({
        name: "unassign-all",
        desc: "Allows for unassigning all roles from the user.",
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
        const userID = data.parameters["userID"] as string | undefined;
        const email = data.parameters["email"] as string | undefined;

        try {
            if(!await global.app.webAuthManager.userExists(userID ?? email ?? ""))
                throw new APIError("WebAuthManager","NoUser");
            await global.app.webAuthManager.unassignAllRoles(userID ?? email ?? "");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText(`Couldn't unassign roles`, error.errCode, data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green", `Successfully unassigned all roles from the specified user.`));
        
    });
    
    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageUsers");
        },
    }, variant=>{
        variant.excludeSubCommand("get-users");
        variant.excludeSubCommand("get-roles-of");
        variant.excludeSubCommand("assign");
        variant.excludeSubCommand("unassign");
        variant.excludeSubCommand("unassign-all");
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