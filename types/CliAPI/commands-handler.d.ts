
namespace CommandsHandling {
    /**
     * Request interface for default socket requests handling.
     */
    type CommandsRequest = FramAPI.IRequestInterface<
    "HTTP" | "SOCKET",
    FramAPI.SocketServer.IClient | null,
    FramAPI.SocketServer.ISubscriptionsInterface | null, 
    (response: any, isFinal?: boolean)=>void >;

    /**
     * Object passed into command and subcommand hadlers containing
     * additional data such as processed parameters and colorsMode.
     */
    interface IExecutionData {
        /**
         * Colors mode used by client that requested command execution.
         */
        readonly colorsMode: OutputColorsMode
        readonly rawParameters: IRawParamsCollection
        readonly parameters: IParsedParamsCollection
        /**
         * NamedPairs parameters and parsed values parsed for them.
         */
        readonly switches: IParsedParamsCollection
    }

    /**
     * Handler for commands execution. 
     * @async Can be used as async.
     */
    type ExecutionHandler = (request: CommandsRequest, executionData: IExecutionData) => void;

    interface ICommandsHandler {

        /**
         * Registers new command. Command has to be defined using Command class.
         * @param command Command instance
         */
        register(command: ICommand);

        /**
         * Executes command request using data from APIServer.
         */
        async execute(request: CommandsRequest, colorsMode: OutputColorsMode);

        /**
         * Checks whether command with given name is registered.
         * @param command Command name.
         */
        isCommandRegistered(command: string) : boolean;

        /**
         * Returns command if such exists or undefined otherwise.
         * @param name Command name.
         */
        getCommand(name: string) : ICommand | undefined;

        /**
         * Returns list of names of registered commands.
         */
        getCommandNames(): Array<string>;
    }

    interface ISubCommandDetails {
        name: string
        desc: string
        params: ParametersList
    }

    interface ICommand {
        readonly name : string;
        readonly description : string;
        readonly params: ParametersList;

        /**
         * Registers main handler. Main handler will be called if there is no subcommands defined or incoming request doesn't
         * call any subcommand.
         */
        mainHandler(handler: ExecutionHandler);

        /**
         * Adds new subcommand.
         * @param details Details object with name, description and parameters.
         * @param handler Execution handler.
         */
        addSubCommand(details: ISubCommandDetails, handler: ExecutionHandler) : void;

        /**
         * Checks if command has specified subcommand.
         * @param name subcommand name
         * @param inVariant Check if subcommand exists in specified variant.
         */
        hasSubCommand(name: string, inVariant?: number) : boolean;

        /**
         * Adds command's variant. Variants may overwrite subcommands, main handler, their details, such as parameters, description and also exclude
         * global subcommands and main handler from variant. 
         * @param requirements Requirements client must meet for the variant to take effect.
         * @param callback Callback used for defining variant.
         */
        addVariant(requirements: IRequirements,callback: (variant: ICommandVariantInterface)=>void);

        /**
         * Finds command's variant valid for client that requested command execution.
         * If none of the defined variants match client, method will return undefined
         */
        findMatchingVariant(request: CommandsRequest) : IVariantSearchResult

        /**
         * Returns help data extracted from command details. 
         * @param forVariant Get data in the specififed variant context.
         */
        getHelpData(forVariant?: ICommandVariant) : HelpData.ICommandHelpData | null

        /**
         * Executes command using request data from APIServer.
         * @param request 
         */
        async execute(request: CommandsRequest, colorsMode?: OutputColorsMode);
    }

    /**
     * Variant's requirements.
     */
    interface IRequirements {
        type: "minVersion" | "maxVersion" | "exactVersion" | "HTTPOrigin" | "allowedAction" | "customTest"
        /**
         * Version to be tested against.
         */
        version?: string
        /**
         * If 'customTest' is set in type property, that handler will be called for every command execution
         * to determine if client is eligible for that variant. 
         */
        testHandler?: (params: Array<string>, client: FramAPI.SocketServer.IClient | null, checkRequirement: RequirementCheckFunction<LimitedRequirementsType>)=>boolean

        /**
         * Action to be checked. Applicable when type is set to 'allowedAction'.
         */
        action?: CLIUserAuthentication.ActionNames
    }

    /**
     * Used for checkRequirement util function inside 'customTest' handler of variant requirements.
     * Removes 'customTest' from allowed check types.
     */
    type LimitedRequirementsType = Exclude<IRequirements["type"],"customTest">

    /**
     * checkRequirement util function inside 'customTest' handler of variant requirements.
     * Allows for checking one specific requirement and further utilize the result of it. 
     * Can be used to create combo requirements with AND and OR operator.
     */
    type RequirementCheckFunction<T> = <T extends LimitedRequirementsType>(type: T, details: RequirementCheckFunctionDetails<T>)=>boolean

    /**
     * Details of checkRequirement util function inside 'customTest' handler of variant requirements.
     * Depend on the provided type.
     */
    type RequirementCheckFunctionDetails<T> = 
        (T extends "minVersion" | "maxVersion" | "exactVersion"?string:never) | 
        (T extends "allowedAction"?CLIUserAuthentication.ActionNames:never) | 
        (T extends "HTTPOrigin"?undefined:never)


    /**
     * Variant's requirements with the version computed.
     */
    interface IParsedRequirements extends IRequirements {
        version?: number
    }

    /**
     * Limited subcommand's details existing inside variant's callback.
     */
    interface IInVariantSubCommandDetails{
        desc?: string
        params?: ParametersList
    }

    /**
     * Interface for defining variant.
     */
    interface ICommandVariantInterface {
        /**
         * Returns current description. If not overwritten, returns main command's description.
         */
        description: ()=>string
        /**
         * Returns current params scheme. If not overwritten, returns main command's parameters scheme.
         */
        params: ()=>ParametersList

        /**
         * Overwrites main command's description.
         */
        overwriteDescription(description: string);

        /**
         * Overwrites main command's parameters scheme.
         */
        overwriteParams(params: ParametersList);

        overwriteMainHandler(handler: ExecutionHandler) : void;

        /**
         * Overwrites subcommand data. 
         * @param name Target subcommand name.
         * @param handler Handler to be executed.
         * @param details Details of subcommand. Whole object as well as individual properties can be skipped if doesn't differ from main command. 
         */
        overwriteSubCommand(name: string, handler: ExecutionHandler, details?: IInVariantSubCommandDetails) : void;

        /**
         * Excludes main handler. When called, command in this variant can be called only in the subcommand context.
         */
        excludeMainHandler();

        /**
         * Excludes subcommand. Specified subcommand will not exist in this variant context. 
         */
        excludeSubCommand(name: string);

        /**
         * Imports exact copy of subcommand from another variant, that was defined for the command. 
         */
        importSubCommand(name: string, variantID: number);
    }

    interface ICommandVariant{
        _overWrittenMainHandler: null | ExecutionHandler
        _overWrittenSubCommands: Map<string, {handler: ExecutionHandler, details?: IInVariantSubCommandDetails}>
        _excludedMainHandler: boolean
        _excludedSubCommands: Set<string>,
        _subcommandsList: Set<string>
        _desc?: string
        _params?: ParametersList
    }

    interface IVariantSearchResult {
        ID: string | null
        variant?: ICommandVariant
        isShadow?: boolean
    }

    interface ISubcommandData {
        details: ISubCommandDetails,
        handler: ExecutionHandler
    }

    /**
     * Parameters scheme.
     */
    type ParametersList = Array<IParameter | IParameterGroup>

    interface IRawParamsCollection {
        [inSchemeParamName: string] : string; 
    }
    interface IParsedParamsCollection {
        [inSchemeParamName: string] : string | number | boolean | luxon.DateTime | null
    }

    interface IParameter {
        readonly name : string;
        readonly desc : string;
        readonly type : "string" | "number" | "boolean" | "date" | "time" | "enum" | "literal";
        /**
         * Must be specified if type equals 'enum'. Contains list of all possible options parameter can take.
         */
        readonly enum?: Array<string>;
        /**
         * If parameter is namedPair type, that is something like '--name'.
         */
        readonly isNamedPair?: boolean;
        /**
         * @default false
         */
        readonly optional?: boolean
        /**
         * @default true
         */
        readonly caseSensitive?: boolean;
    }

    interface IParameterGroup {
        /**
         * Type of relation that bounds all group items.
         * * oneOf - First matching item will be taken. By default, if the input parameters won't match any of the items,
         * matching will fail. That can be changed with the required property.
         * * many - Generic group with no specific rules other than the one, that matching ends after the first non optional
         * item matching failure.
         * * allIfFirst - Whole group is treated as optional. If first item matches with input parameters then all other items in
         * group are enforced to match. 
         * Groups can be nested, but same type groups can be on adjacent levels.
         */
        readonly relation: "oneOf" | "many" | "allIfFirst",
        readonly parameters: ParametersList
        /**
         * Applies to 'oneOf' group. Controls whether matching fails if none of the items match input parameters.
         * @default true
         * @see IParameterGroup.relation for more information
         */
        readonly required?: boolean;
    }
}