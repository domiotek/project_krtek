namespace HelpData {
    interface IHelpRemoteResponse {
        __type: "CommandHelpData",
        commandNames: Array<string>
        commands: Array<ICommandHelpData>
        /**
         * If there is only one command, highlight given subcommand.
         * Applies when requested help <command> <subcommand>
         */
        highlightSubcommand?: string
        errMessage?: string
    }

    interface ISubcommandHelpData {
        name: string,
        desc: string,
        params: ParametersList,
    }

    interface ICommandHelpData extends ISubcommandHelpData {
        subcommandNames: Array<string>
        subcommands: Array<ISubcommandHelpData>
    }
}