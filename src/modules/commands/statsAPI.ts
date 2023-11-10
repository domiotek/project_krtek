import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";
import { APIError} from "../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

function respondWithStats(req:CommandsHandling.CommandsRequest,stats: WebAPI.Statistics.IMonthUserStats, header: string, colorsMode: OutputColorsMode) {
    req.respond(`Statistics of ${header}:\n===================================`, false);
    req.respond(`Total worked hours: ${insertColor("fg_cyan",stats.totalHours.toString()+" h", colorsMode)}`, false);
    req.respond(`Total shift count: ${insertColor("fg_cyan",stats.shiftCount.toString(), colorsMode)}`, false);
    req.respond(`Wage per hour: ${insertColor("fg_cyan",stats.wagePerHour!=null?stats.wagePerHour.toString()+" zł":"Unavailable", colorsMode)}`, false);
    req.respond(`Total wage: ${insertColor("fg_cyan",stats.totalWage!=null?stats.totalWage.toString()+" zł":"Unavailable", colorsMode)}`, false);
    req.respond(`Total tip: ${insertColor("fg_cyan",stats.totalTip.toString()+" zł", colorsMode)}`, false);
    req.respond(`Total deduction: ${insertColor("fg_cyan",stats.totalDeduction.toString()+" zł", colorsMode)}`, false);
    req.respond(`Total earnings: ${insertColor("fg_cyan",stats.wagePerHour!=null?(stats.wagePerHour*(stats.totalWage as number) + stats.totalTip - stats.totalDeduction).toString()+" zł":"Unavailable", colorsMode)}`);
}

export default function(){

    const command = new Command("stats","Used to view and manage WebAPI user stats. ",[
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
    ],false);

    command.mainHandler(async (req, data)=>{
        const emailParam = data.parameters["email"] as string | undefined;
        const userIDParam = data.parameters["userID"] as number | undefined;

        try {
            const stats = await global.app.userStatsManager.getStatsOf(userIDParam ?? emailParam ?? "",DateTime.now());

            if(stats) {
                respondWithStats(req, stats, "current month",data.colorsMode);
            }else throw new APIError("UserStatsManager","NoUser");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't fetch statistics", error.errCode, data.colorsMode));
        }
    });


    command.addSubCommand({
        name: "of",
        desc: "Displays user statistics from specified month.",
        params: [
            {
                name: "date",
                desc: "Date representing target month and year.",
                type: "date"
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

        const emailParam = data.parameters["email"] as string | undefined;
        const userIDParam = data.parameters["userID"] as number | undefined;
        const dateParam = data.parameters["date"] as DateTime;


        try {
            const stats = await global.app.userStatsManager.getStatsOf(userIDParam ?? emailParam ?? "",dateParam);

            if(stats) {
                respondWithStats(req, stats, dateParam.toFormat("LLLL yyyy"), data.colorsMode);
            }else throw new APIError("UserStatsManager","NoUser");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't fetch statistics", error.errCode, data.colorsMode));
        }
    });

    command.addSubCommand({ 
        name: "drop-cache",
        desc: "Deletes statistics cache from current month of specified user.",
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
        const emailParam = data.parameters["email"] as string | undefined;
        const userIDParam = data.parameters["userID"] as number | undefined;
        
        try {
            await global.app.userStatsManager.dropCacheState(emailParam ?? userIDParam ?? "");
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't delete stats cache",error.errCode,data.colorsMode));
            return;
        }

        req.respond(insertColor("fg_green","Successfully cleared stats cache.", data.colorsMode));
    });

    command.addVariant({
        type: "customTest",
        testHandler(params, client, checkRequirement) {
            return !checkRequirement("allowedAction","manageUsers");
        },
    }, variant=>{
        variant.excludeSubCommand("of");
        variant.excludeSubCommand("drop-cache");

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