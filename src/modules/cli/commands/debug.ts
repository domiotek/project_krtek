import {Command } from "../commands-handler.js";
import Output, { insertColor } from "../../output.js";
import { fillWith } from "../../util.js";
import * as Time from "../../time.js";

export default function(){

    const command = new Command("debug","Debug commands are intended to be used for development purpouses.",[],false);

    command.mainHandler((request,data)=>{
        if(global.app.env.debuggingEnabled) {
            request.respond(insertColor("fg_magenta","You don't have permissions to run this type of command.",data.colorsMode),false);
            if(global.app.env.server.type=="Public"&&global.app.userAuth.isActionAvailableForEveryone("useDebug")) {
                request.respond(insertColor("fg_red","Your access has been blocked, because server is configured to provide debug tools to all users, while being publicly available. If you are an owner, restrict debug tools only to specific users and try again. \n\nThis action has been automatically taken by the server itself and cannot be disabled.", data.colorsMode));
                Output.category("debug").print("warning","Refusing debug access. Server type is public, and 'useDebug' permission is granted for all users.");
            }else request.respond("",true);
        }else request.respond(insertColor("fg_magenta","Debugging mode isn't enabled.",data.colorsMode));
    });

    command.addVariant({
        type: "customTest",
        testHandler: (p,client)=>{
            return global.app.env.debuggingEnabled&&global.app.userAuth.isActionAllowedFor(client?.datastore.get("authToken"),"useDebug")&&(global.app.env.server.type!="Public"||!global.app.userAuth.isActionAvailableForEveryone("useDebug"))
        }
    },variant=>{
        variant.excludeMainHandler();

        variant.overwriteSubCommand("flags", async (request, data)=>{
            const name = data.parameters["flagName"] as string;
            if(name) {
                if(Object.keys(global.app.env.flags).includes(name)) {
                    global.app.env.flags[name] = data.parameters["flagValue"] as boolean;
                    request.respond("Flag set.");
                }else request.respond(insertColor("fg_red","Invalid debug flag.",data.colorsMode));
            }else {
                request.respond("Defined flags\nName                           State\n==========================================\n",false);
                for (const name in global.app.env.flags) {
                    request.respond(`${fillWith(name,30," ")} ${global.app.env.flags[name]?"true":"false"}`,false);
                }
                request.respond("");
            }
        },{
            desc: "Can be used to both print all defined flags and set flags. If no name is specified, flags will be printed.",
            params: [
                {
                    relation: "allIfFirst",
                    parameters: [
                        {
                            name: "flagName",
                            desc: "Name of flag to set.",
                            type: "string",
                            caseSensitive: true
                        },
                        {
                            name: "flagValue",
                            desc: "New value to set.",
                            type: "boolean"
                        }
                    ]
                }
            ]
        });
    
        variant.overwriteSubCommand("clients", async (request, data)=>{
            const clients = global.app.server?.socketServer.clients.getIDs() ?? [];
            const includingMe = Object.keys(data.parameters).includes("-a");
            let i=0;
            switch(data.parameters["action"]) {
                case "kick": 
                    for (const ID of clients) {
                       const client = global.app.server?.socketServer.clients.get(ID);
                       if(includingMe||ID!=request.client?.ID) {
                           client?.kick("Kicked by other client using debug command.");
                           i++;
                        } 
                    }
                    request.respond(`Kicked ${i} clients.`);
                break;
                case "unregister": 
                    for (const ID of clients) {
                       const client = global.app.server?.socketServer.clients.get(ID);
                       if(includingMe||ID!=request.client?.ID) {
                           client?.subscriptions.kickFromAll(`Debug command executed by one of clients.`);
                           i++;
                        } 
                    }
                    request.respond(`Kicked ${i} clients from all subscriptions.`);
                break;
                default:
                    request.respond("Currently connected clients:\n\nID                                      IP Address          Version    Session length      Ping      Subscriptions\n===================================================================================================================",false);
                    for (const ID of clients) {
                        const client = global.app.server?.socketServer.clients.get(ID);
                        
                        request.respond(`${fillWith(ID==request.client?.ID?ID+" (This client)":ID,40," ")}${fillWith(client?.remoteAddress ?? "",20," ")}${fillWith(client?.datastore.get("clientVersion") ?? "Unknown",11," ")}${fillWith(Time.formatDiff(Time.DateTime.fromMillis(client?.connectedAt ?? Date.now()),Time.now(),{shortUnits: true}),20," ")}${fillWith(client?.ping()!=-1?`${client?.ping()}ms`:"<Unmeasurable>",10," ")}${client?.subscriptions.getRegistrations()}`,false);
                        i++;
                    }
                    request.respond(`\nTotal of ${i} clients.`);
                break;
            }
        },{
            desc: "Displays stats about clients connected to the server and allows for kicking and unregistering them from subscriptions.",
            params: [
                {
                    name: "action",
                    desc: "What to do with clients.",
                    type: "enum",
                    enum: ["kick", "unregister"],
                    optional: true,
                    caseSensitive: false
                },
                {
                    name: "-a",
                    desc: "Including me - this client.",
                    type: "literal",
                    optional: true,
                    caseSensitive: false
                }
            ]
        });
    
        variant.overwriteSubCommand("clear-temp",async (request,data)=>{
            global.app.fs.clearTempDirectories();
            request.respond(insertColor("fg_magenta","Content of temp directories should be cleared.",data.colorsMode));
        },{
            desc: "Clears content of the temporary directories defined inside the environment file.",
            params: []
        });
    });

    global.app.commands.register(command);
}