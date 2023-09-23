import { Command } from "../commands-handler.js";
import Output, { insertColor } from "../output.js";
import procSpawn from "child_process";

export default function(){
    const command = new Command("server", "Has utility to manage server state and display information about it.",[]);
    const app = global.app;

    command.addSubCommand({
        name: "version",
        desc: "Displays server's version.",
        params: []

    },(request)=>{
        request.respond("Project Krtek " + global.app.version);
    });

    command.addVariant({
        type: "allowedAction",
        action: "manageServer"
    },variant=>{
        variant.overwriteSubCommand("stop",async (request,data)=>{
            setTimeout(()=>process.exit(),1000);
            Output.category("general").fg("yellow").print("Client requested server to close. Closing...");
            request.respond(insertColor("fg_yellow","Server is closing...",data.colorsMode));
        },{
            desc: "Terminates server. After that, you will need to run server again from within server machine."
        });

        variant.overwriteSubCommand("reload", request=>{
            Output.category("general").print("\n\nReloading session...");
            setTimeout(()=>global.app.reload(),1000);
            request.respond("Server is reloading...");
        },{
            desc: "Reloads session by reinitializing server along with clearing stats and reloading config. All debug changes are being also reverted."
        });

        variant.overwriteSubCommand("restart",async (request, data)=>{
            Output.category("general").fg("yellow").print("Received restart request. Restarting...");
            setTimeout(async ()=>{
                if(global.app.env.environmentName=="production") { 
                    await global.app.shutdown();
                    procSpawn.exec(`start cmd /c npm run start-prod`);
                }else {
                    Output.category("general").fg("yellow").print("Since server is running in the development, app will close without starting up a new instance. Nodemon should be your friend.");
                    await global.app.fs.local().remove("PleaseRestartMyAppNodemon.js");
                    await global.app.fs.local().create("PleaseRestartMyAppNodemon.js");
                }
                setTimeout(()=>process.exit(),1000);
            },200);
        request.respond(insertColor("fg_green","Server is restarting. You may need to manually reconnect with the server.",data.colorsMode));
        },{
            desc: "Restarts whole server process. It will load new source code for server if available."
        });
    });
    
    global.app.commands.register(command);
}

