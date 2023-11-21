import { DateTime } from "luxon";
import {Command } from "../commands-handler.js";
import { insertColor } from "../../output.js";
import { APIError, getPrintableDataTable, initArrayOfArrays} from "../../util.js";
import { getCommandErrorDisplayText } from "./common/utils.js";

export default function(){

    const command = new Command("stats","Used to view and manage WebAPI user stats. ",[
        {
            name: "date",
            desc: "Date representing target month and year.",
            type: "date",
            optional: true
            
        }
    ],false);

    command.mainHandler(async (req, data)=>{
        const dateParam = data.parameters["date"] as DateTime | undefined;

        interface IData {
            userID: number
            name: string
            shifts: number
            hours: number
            deduction: number
        }

        const userStats: IData[] = [];

        try {
            const users = await global.app.webAuthManager.getAllUsers();

            for (const user of users) {
                const stats = await global.app.userStatsManager.getStatsOf(user.userID, dateParam ?? DateTime.now()) as NonNullable<WebAPI.Statistics.IMonthUserStats>

                userStats.push({
                    userID: user.userID,
                    name: user.name,
                    shifts: stats.shiftCount,
                    hours: stats.totalHours,
                    deduction: stats.totalDeduction
                })
            }
        } catch (error: any) {
            if(!error.errCode) throw error;
            req.respond(getCommandErrorDisplayText("Couldn't fetch statistics",error.errCode, data.colorsMode));
            return;
        }


        const headers = ["UserID","Name", "Shifts", "Hours (h)", "Deduction (zł)"];
        const dataTable = initArrayOfArrays<string>(headers.length);

        for(let i=0; i< headers.length; i++)
            dataTable[i].push(headers[i]);

        for (const stats of userStats) {
            const values = [
                stats.userID.toString(), 
                stats.name,
                stats.shifts.toString(),
                stats.hours.toString(),
                stats.deduction.toString()
            ];

            for(let i=0; i<values.length; i++)
                dataTable[i].push(values[i]);
        }

        req.respond(`Statistics of ${dateParam?dateParam.toFormat("LLLL yyyy"):"current month"}:\n`, false);
        req.respond(getPrintableDataTable(dataTable));
    });


    command.addSubCommand({
        name: "of",
        desc: "Displays user statistics from specified month.",
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
                name: "date",
                desc: "Date representing target month and year.",
                type: "date",
                optional: true
            }
        ]
    }, async (req, data)=>{

        const emailParam = data.parameters["email"] as string | undefined;
        const userIDParam = data.parameters["userID"] as number | undefined;
        const dateParam = data.parameters["date"] as DateTime | undefined;

        try {
            const stats = await global.app.userStatsManager.getStatsOf(userIDParam ?? emailParam ?? "",dateParam ?? DateTime.now());

            if(stats) {
                req.respond(`Statistics of ${dateParam?dateParam.toFormat("LLLL yyyy"):"current month"}:\n===================================`, false);
                req.respond(`Total worked hours: ${insertColor("fg_cyan",stats.totalHours.toString()+" h", data.colorsMode)}`, false);
                req.respond(`Total shift count: ${insertColor("fg_cyan",stats.shiftCount.toString(), data.colorsMode)}`, false);
                req.respond(`Wage per hour: ${insertColor("fg_cyan",stats.wagePerHour!=null?stats.wagePerHour.toString()+" zł":"Unavailable", data.colorsMode)}`, false);
                req.respond(`Total wage: ${insertColor("fg_cyan",stats.totalWage!=null?stats.totalWage.toString()+" zł":"Unavailable", data.colorsMode)}`, false);
                req.respond(`Total tip: ${insertColor("fg_cyan",stats.totalTip.toString()+" zł", data.colorsMode)}`, false);
                req.respond(`Total deduction: ${insertColor("fg_cyan",stats.totalDeduction.toString()+" zł", data.colorsMode)}`, false);
                req.respond(`Total earnings: ${insertColor("fg_cyan",stats.wagePerHour!=null?(stats.totalWage as number + stats.totalTip - stats.totalDeduction).toString()+" zł":"Unavailable", data.colorsMode)}`);
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