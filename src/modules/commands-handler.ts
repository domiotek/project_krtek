import {computeVersion} from "./util.js";
import Output, { insertColor } from "./output.js";
import { checkVariantRequirement, matchParamsWithScheme, staticVerifyParameters} from "./commands-handling-util.js";

export default async function commandRequestHandler(request: CommandsHandling.CommandsRequest) {
    
    await global.app.commands.execute(request,request.client?.datastore.get("colorsMode") ?? "colorless");
}

/**
 * Allows for manual command execution outside of the network originated request circuit.
 * @param colorsMode Desired colorsMode.
 * @returns Returns after the first response. Doesn't support continuous response.
 */
export async function executeCommand(command: string, params: Array<string>,colorsMode: OutputColorsMode) : Promise<string> {
    return await new Promise<string>(async resolve=>{
        const request : CommandsHandling.CommandsRequest = {
            origin: "HTTP",
            command,
            params,
            client: null,
            subscriptions: null,
            respond: (response: any)=>{
                resolve(response);
            }
        }
        await global.app.commands.execute(request,colorsMode);
    });
}

export class CommandsHandler implements CommandsHandling.ICommandsHandler {
    private readonly _commands : Map<string, CommandsHandling.ICommand> = new Map();
    public register(command: CommandsHandling.ICommand) {
        if(command.name=="") throw new Error("[Command handling] Command cannot have empty name");

        if(!this._commands.has(command.name.toLowerCase())) this._commands.set(command.name.toLowerCase(),command);
        else throw new Error("[Command handling] Command with that name already exists.");
    }

    public async execute(request: CommandsHandling.CommandsRequest, colorsMode: OutputColorsMode) : Promise<boolean>{
        request.command = request.command.toLowerCase();
        if(this._commands.has(request.command)) {
            await (this._commands.get(request.command) as CommandsHandling.ICommand).execute(request,colorsMode);
            return true;
        }
        
        request.respond(insertColor("fg_red","Invalid command.",colorsMode));
        return false
    }

    public isCommandRegistered(command: string): boolean {
        return this._commands.has(command.toLowerCase());
    }

    public getCommand(name: string) : CommandsHandling.ICommand | undefined {
        return this._commands.get(name.toLowerCase());
    }

    public getCommandNames(): string[] {
        return Array.from(this._commands.keys());
    }
}

export class Command implements CommandsHandling.ICommand {
    public readonly name : string;
    public readonly description: string;
    public readonly params: CommandsHandling.ParametersList;
    public readonly HTTPRequestsAlowed: boolean;

    private _subCommands: Map<string,CommandsHandling.ISubcommandData> = new Map();
    private _variants: Map<number, {requirements: CommandsHandling.IParsedRequirements, variantData: CommandsHandling.ICommandVariant}> = new Map();
    private _shadowVariants: Map<string,CommandsHandling.ICommandVariant> = new Map();
    private _mainHandler: CommandsHandling.ExecutionHandler | null = null;

    constructor(name: string, description: string, params: CommandsHandling.ParametersList=[], allowHTTPOrignatedRequests: boolean=true) {
        this.name = name;
        this.description = description;
        this.params = params;
        this.HTTPRequestsAlowed = allowHTTPOrignatedRequests;

        if(global.app.env.flags.enableStaticCommandVerification) staticVerifyParameters(params);
    }

    private _createShadowVariant(ID: string, variants: Array<number>) : CommandsHandling.ICommandVariant {
        let mainHandler: CommandsHandling.ExecutionHandler | false = this._mainHandler ?? false;
        let params: CommandsHandling.ParametersList = this.params;
        let desc: string = this.description;
        let overWrittenSubcommands: Map<string, {handler: CommandsHandling.ExecutionHandler, details?: CommandsHandling.IInVariantSubCommandDetails}> = new Map();
        let excludedSubcommands: Set<string> = new Set();
        let subcommandsList: Set<string> = new Set(this._subCommands.keys());

        for (const variantID of variants) {
            const variant = this._variants.get(variantID)?.variantData as CommandsHandling.ICommandVariant;
            mainHandler = variant._overWrittenMainHandler ?? (variant._excludedMainHandler?false:mainHandler);
            if(variant._overWrittenMainHandler) {
                mainHandler = variant._overWrittenMainHandler;
                params = variant._params ?? params;
                desc = variant._desc ?? desc;
            }else if(variant._excludedMainHandler){
                mainHandler = false;
                params = variant._params ?? this.params;
                desc = variant._desc ?? this.description;
            }
            
            for (const [name, data] of variant._overWrittenSubCommands) {
                overWrittenSubcommands.set(name,data);
                excludedSubcommands.delete(name);
                subcommandsList.add(name);
            }

            for(const name of variant._excludedSubCommands) {
                overWrittenSubcommands.delete(name);
                excludedSubcommands.add(name);
                subcommandsList.delete(name);
            }
                
        }
        const shadowVariant: CommandsHandling.ICommandVariant = {
            _excludedMainHandler: mainHandler==false,
            _overWrittenMainHandler: mainHandler?mainHandler:null,
            _params: params,
            _desc: desc,
            _overWrittenSubCommands:overWrittenSubcommands,
            _excludedSubCommands: excludedSubcommands,
            _subcommandsList: subcommandsList
        }
        this._shadowVariants.set(ID,shadowVariant);
        return shadowVariant;
    }

    public mainHandler(handler: CommandsHandling.ExecutionHandler) {
        this._mainHandler = handler;
    }

    public addSubCommand(details: CommandsHandling.ISubCommandDetails, handler: CommandsHandling.ExecutionHandler): void {
        if(!this._subCommands.has(details.name)) {
            if(global.app.env.flags.enableStaticCommandVerification) staticVerifyParameters(details.params);
            this._subCommands.set(details.name,{details,handler});
        }else throw new Error("[Command handling] Subcommand already exists.");
    }

    public addVariant(requirements: CommandsHandling.IRequirements,callback: (variant: CommandsHandling.ICommandVariantInterface)=>void) {
        if(requirements.type=="customTest") {
            if(typeof requirements.testHandler != "function") throw new Error(`[Command Variant] Requirements: TestHandler not given when type is 'customTest'.`);
        }else if(requirements.type=="HTTPOrigin") {
            if(this.HTTPRequestsAlowed) throw new Error("[Command Variant] Requirements: Added HTTPOrigin variant, when main handler supports it.");
        }else if(requirements.type=="allowedAction"){
            if(typeof requirements.action != "string") throw new Error(`[Command Variant] Requirements: Action not given when the type requires it.`);
        }else {
            try {
                if(typeof requirements.version!="string") throw new Error(`[Command Variant] Requirements: Version not given when the type requires it.`);
                (requirements as CommandsHandling.IParsedRequirements).version = computeVersion(requirements.version)
            } catch (error) {
                Output.category("debug").print("error",error as Error);
            }
        }
        
        const variantData : CommandsHandling.ICommandVariant = {
            _overWrittenMainHandler: null,
            _overWrittenSubCommands: new Map(),
            _excludedMainHandler: false,
            _excludedSubCommands: new Set(),
            _subcommandsList: new Set(this._subCommands.keys()),
        }
        
        callback({
            description: ()=>variantData._desc ?? this.description,
            params: ()=>variantData._params ?? this.params,
            overwriteDescription: (description: string)=>{
                variantData._desc = description;
            },
            overwriteParams: (params: CommandsHandling.ParametersList)=>{
                if(global.app.env.flags.enableStaticCommandVerification) staticVerifyParameters(params);
                variantData._params = params;
            },
            overwriteMainHandler: (handler: CommandsHandling.ExecutionHandler)=>{
                if(variantData._excludedMainHandler) throw new Error("[Command Variant] Do not overwrite main handler when it was excluded before.")
                variantData._overWrittenMainHandler = handler;
            },
            overwriteSubCommand: (name: string, handler: CommandsHandling.ExecutionHandler, details?: CommandsHandling.IInVariantSubCommandDetails)=>{
                if(variantData._excludedSubCommands.has(name)) throw new Error(`[Command Variant] Do not overwrite subcommand if it was excluded before.`);
                if(details?.params&&global.app.env.flags.enableStaticCommandVerification) staticVerifyParameters(details.params);
                if(!this._subCommands.has(name)) {
                    if(!details) throw new Error(`[Command Variant] When you add new subcommand inside the variant, providing details object with the description is required.`);
                    if(!details.params) details.params = [];
                }
                variantData._overWrittenSubCommands.set(name,{handler,details});
                variantData._subcommandsList.add(name);
            },
            excludeMainHandler: ()=> {
                if(variantData._overWrittenMainHandler) throw new Error(`[Command Variant] Do not exclude main handler if it was overwritten.`);
                variantData._excludedMainHandler = true
            },
            excludeSubCommand: (name: string) =>{ 
                if(variantData._overWrittenSubCommands.has(name)) throw new Error(`[Command Variant] Do not exclude subcommand if it was overwritten.`);
                variantData._excludedSubCommands.add(name)
                variantData._subcommandsList.delete(name);
            },
            importSubCommand: (name: string, variantID: number)=>{//
                if(!this._variants.has(variantID)) throw new Error(`[Command Variant] Can not import subcommand from {${variantID}} variant that does not exist (yet?).`);
                const variant = this._variants.get(variantID)?.variantData as CommandsHandling.ICommandVariant;
                if(!variant._overWrittenSubCommands.has(name)) throw new Error(`[Command Variant] Can not import subcommand from {${variantID}} variant when it does not modify or add that subcommand.`);
                if(variantData._overWrittenSubCommands.has(name)) throw new Error(`[Command Variant] Do not import subcommand from other variant, if you added subcommand with the same name in this variant.`);
                variantData._overWrittenSubCommands.set(name, variant._overWrittenSubCommands.get(name) as CommandsHandling.ISubcommandData);
                variantData._subcommandsList.add(name);
            }
        });
        this._variants.set(this._variants.size,{requirements: requirements as CommandsHandling.IParsedRequirements, variantData});
    }

    public findMatchingVariant(request: CommandsHandling.CommandsRequest): CommandsHandling.IVariantSearchResult {
        let variantIDs: Array<number> = [];

        for (const ID of Array.from(this._variants.keys())) {
            const variant = this._variants.get(ID);
            if(checkVariantRequirement(variant?.requirements,request)) 
                variantIDs.push(ID);
        }

        if(variantIDs.length>1) {
            let shadowVariantID = "";
            for (const ID of variantIDs) 
                shadowVariantID += shadowVariantID==""?`${ID}`:`&${ID}`;

            return {
                ID: shadowVariantID,
                variant: this._shadowVariants.get(shadowVariantID) ?? this._createShadowVariant(shadowVariantID, variantIDs),
                isShadow: true
            }
        }else return {
            ID: variantIDs[0]?.toString(),
            variant: this._variants.get(variantIDs[0])?.variantData,
            isShadow: false
        }
    }

    public hasSubCommand(name: string, inVariant?: number): boolean {
        if(inVariant) {
            const variant = this._variants.get(inVariant);
            if(variant) {
                return (this._subCommands.has(name)&&!variant.variantData._excludedSubCommands.has(name));
            }else {
                Output.category("debug").print("error", new Error(`[Command handling] Variant '${inVariant}' doesn' exist.`));
                return false;
            }
        }else return this._subCommands.has(name);
    }

    public async execute(request: CommandsHandling.CommandsRequest, colorsMode?: OutputColorsMode) {
        const matchingVariant = this.findMatchingVariant(request).variant;

        if(request.origin=="HTTP"&&!matchingVariant&&!this.HTTPRequestsAlowed) {
            request.respond(insertColor("fg_red",`HTTP requests are not supported by this command.`));
            return;
        }

        const subcommandExists = matchingVariant?matchingVariant?._subcommandsList.has(request.params[0]):this._subCommands.has(request.params[0]);
        const subcommandsList = matchingVariant?matchingVariant._subcommandsList:this._subCommands;
        const _colorsMode = (colorsMode ?? request.client?.datastore.get("colorsMode")) ?? "colorless";

        let executionHandler;
        let paramsScheme;
        let requestParams;

        if(subcommandExists) {
            const handler = matchingVariant?(matchingVariant._overWrittenSubCommands.get(request.params[0])?.handler || this._subCommands.get(request.params[0])?.handler):(this._subCommands.get(request.params[0])?.handler);
            const subcommandParamsScheme = matchingVariant?._overWrittenSubCommands.get(request.params[0])?.details?.params ?? this._subCommands.get(request.params[0])?.details.params;
            if(handler) {
                executionHandler = handler;
                requestParams = request.params.slice(1);
                paramsScheme = subcommandParamsScheme;
            }else {
                Output.category("debug").print("error",new Error(`[Command handling] Missing execution handler. Command: ${this.name}; Subcommand: ${request.params[0]}.`));
                return;
            }
        }else {
            const mainHandler = matchingVariant?(matchingVariant._overWrittenMainHandler || this._mainHandler):this._mainHandler;
            const mainHandlerUseCondition = matchingVariant?!matchingVariant._excludedMainHandler:true;
            if(mainHandler&&mainHandlerUseCondition) {
                executionHandler = mainHandler;
                requestParams = request.params;
                paramsScheme = matchingVariant?._params ?? this.params;
            }else if(subcommandsList.size>0){
                if(request.params.length>0) 
                    request.respond(insertColor("fg_red",`'${request.params[0]}' is not a valid subcommand of this command.`,_colorsMode),false);
                else request.respond(insertColor("fg_yellow",`This command has to be executed in the subcommand context.`,_colorsMode),false);
                request.respond(`\nAvailable subcommands:`,false);
                for (const subcommand of subcommandsList.keys()) {
                    request.respond(insertColor("fg_yellow",`• ${subcommand}`,_colorsMode),false);
                }
                request.respond(`\nFor more information execute '${this.name} --help'.`);
                return;
            }else {
                request.respond(insertColor("fg_red",`This command is not supported by your client.`,_colorsMode));
                return;
            }
        }

        const parameters : CommandsHandling.ParametersList = (subcommandExists?paramsScheme:undefined) ?? (matchingVariant?._params ?? this.params);

        const result = matchParamsWithScheme(requestParams,parameters);

        if(result.matchingResult.matches) {
            try {
                await executionHandler(request,{
                    colorsMode: _colorsMode,
                    parameters: result.matchingResult.processedParams,
                    rawParameters: result.matchingResult.params,
                    switches: result.namedPairs
                })
            } catch (error: any) {
                const newErr = new Error(`[CommandsHandling] Command execution failed with error '${error.message}'. Execution details: command - '${request.command}'; params - '${request.params}'`);
                newErr.stack = error.stack;
                Output.category("debug").print("error",newErr);
                throw error;
            }
            
        }else {
            if(request.origin=="SOCKET"&&request.client?.datastore.get("int_clientVersion")>=100020000) {
                request.respond({
                    __type: "CommandMatchingError",
                    matchingResult: result.matchingResult,
                    subcommand: subcommandExists?request.params[0]:null,
                    scheme: paramsScheme,
                    availableSubcommands: Array.from(subcommandsList.keys())
                });
            }else {
                request.respond(insertColor("fg_red",`Couldn't process that request with the provided parameters.`,_colorsMode),request.origin=="HTTP");
                if(request.origin=="SOCKET") {
                    request.respond(insertColor("fg_green",`\nThat message can look a lot better. Update client to the latest version to check it out.`,_colorsMode),false);
                    request.respond(`Get detailed information, which parameters are required or provided incorrectly and see visualization of the command's structure with the highlighted sections.`);
                }
            }
        }
        
    }

    public getHelpData(variant?: CommandsHandling.ICommandVariant): HelpData.ICommandHelpData | null {

        const result : HelpData.ICommandHelpData = {
            name: this.name,
            desc: variant?._desc ?? this.description,
            params: variant?._params ?? this.params,
            subcommandNames: variant?Array.from(variant?._subcommandsList):Array.from(this._subCommands.keys()),
            subcommands: []
        }

        for (const name of result.subcommandNames) {
            const data = variant?._overWrittenSubCommands.get(name);

            result.subcommands.push({
                name,
                desc: data?.details?.desc ?? ((this._subCommands.get(name) as CommandsHandling.ISubcommandData).details.desc),
                params: data?.details?.params ?? ((this._subCommands.get(name) as CommandsHandling.ISubcommandData).details.params)
            });
        }

        return result;
    }
}

/**
 * Loads all commands from the subdirectory and initializes them.
 */
export async function registerCommands() {
    const files = await global.app.fs.local().listDirectory("modules/commands");
    if(files) {
        for (const file of files) {
            try {
                const parts = file.split(".");
                const extension = parts[parts.length - 1];
                if(extension=="js") 
                    (await import(`./commands/${file}`)).default();
            }catch(error) {
                Output.category("debug").print("error",new Error(`[Commands handling] Couldn't load commands from '${file}' file. ${error}`));
            }
        }
    }
}