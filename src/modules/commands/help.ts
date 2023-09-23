import { Command } from "../commands-handler.js";

export default function(){
    const command = new Command("help", "Displays help about commands.",[
        {
            name: "command",
            desc: "Command to display help about.",
            type: "string",
            caseSensitive: false,
            optional: true
        },
        {
            name: "subcommand",
            desc: "Subcommand to display help about.",
            type: "string",
            caseSensitive: false,
            optional: true
        },
        {
            name: "--list",
            desc: "Displays simple list of supported commands or subcommands if used with command parameter.",
            type: "literal",
            isNamedPair: true,
            optional: true,
            caseSensitive: false
        }
    ],false);

    command.mainHandler(async (request,data)=>{
        const result : HelpData.IHelpRemoteResponse = {
            __type: "CommandHelpData",
            commandNames: [],
            commands: []
        }

        const commandName = data.parameters["command"] as string;

        if(commandName) {
            const command = global.app.commands.getCommand(commandName);

            if(command) {
                result.commandNames.push(commandName);
                const subcommandName = request.params[1];

                if(command.hasSubCommand(subcommandName)) 
                    result.highlightSubcommand = subcommandName;
                else if(subcommandName) result.errMessage = `Requested subcommand isn't supported by that command.`;

                const variant = command.findMatchingVariant(request).variant;

                result.commands.push(command.getHelpData(variant) as HelpData.ICommandHelpData);
            }else result.errMessage = `Requested command isn't supported by the server.`;
        }else {
            result.commandNames = global.app.commands.getCommandNames();

            for (const commandName of result.commandNames) {
                const commandData = global.app.commands.getCommand(commandName) as CommandsHandling.ICommand;
                const variant = commandData.findMatchingVariant(request).variant;
                
                result.commands.push(global.app.commands.getCommand(commandName)?.getHelpData(variant?variant:undefined) as HelpData.ICommandHelpData);
            }
        }
        request.respond(result);
    });

    global.app.commands.register(command);
}