import {Command } from "../commands-handler.js";

export default function(){

    const command = new Command("<NAME>","<DESC>",[]);

    command.mainHandler(async (request, data)=>{

    });

    command.addSubCommand({
        name: "<NAME>",
        desc: "<DESC>",
        params: []
    }, async (request, data)=>{

    });

    //IMPORTANT!!! Always add variants AFTER all subcommands were added.
    //If you don't want some variant to have certain subcommand, just use variant.excludeSubCommand method.

    command.addVariant({
        type: "minVersion",
        version: "MAJOR.MINOR.PATCH"
    },variant=>{

    });

    //global.app.commands.register(command);
}