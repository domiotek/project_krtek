import {Command } from "../commands-handler.js";
import { insertColor } from "../output.js";

export default function(){

    const command = new Command("auth","Shows details about established client authentication.");

    command.mainHandler(async (request, data)=>{
        const token = request.client?.datastore.get("authToken") as string | undefined;
        if(token) {
            request.respond(`You are authenticated as ${insertColor("fg_green",request.client?.datastore.get("username") ?? "Anonymous",data.colorsMode)}. Welcome!`,false);
            request.respond(`Here are the privileges you get:`,false);
            for (const action of global.app.userAuth.getClientAllowedActions(token)) {
                request.respond(`${insertColor("fg_cyan","●",data.colorsMode)} ${action}`,false);
            }
            request.respond("");
        }else request.respond(insertColor("fg_yellow","You are not currently authenticated.",data.colorsMode));
    });

    global.app.commands.register(command);
}