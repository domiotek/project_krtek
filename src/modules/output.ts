import { parseErrorObject } from "./util.js";

const colors = {
    "fg_white": 37,
    "fg_black": 30,
    "fg_red": 31,
    "fg_green": 32,
    "fg_yellow": 33,
    "fg_blue": 34,
    "fg_magenta": 35,
    "fg_cyan": 36,
    "fg_grey": 90,
    "bg_white": 47,
    "bg_black": 40,
    "bg_red": 41,
    "bg_green": 42,
    "bg_yellow": 43,
    "bg_blue": 44,
    "bg_magenta": 45,
    "bg_cyan": 46,
    "bg_transparent": -1,
}

/**
 * Translates colors name into ASCII code number associated with it.
 * @param color Color name
 */
function translateColor(color: ColorName) : number {
    return colors[color] ?? 0;
}


export default class OutputController implements IOutputController {

    public fgColor : ForegroundOutputColor = "white";
    
    public bgColor : BackgroundOutputColor = "transparent";

    private _category: OutputCategory;
    private _colorsMode: OutputColorsMode | null = null;
    private _buffer: {[colorsMode: string]: string} = {};
    private _bufferingEnabled: boolean = false;

    public get colorsMode() {
        return this._colorsMode;
    }

    private constructor(category: OutputCategory){
        this._category = category;
    }

    private _outputMethod: (text: string)=>void = console.log;

    static category<T extends OutputCategory>(output_category: T) : T extends "debug"?IDebugOutputController:IOutputController {
        return new OutputController(output_category);
    }

    public mode(mode: OutputColorsMode) {
        this._colorsMode = mode;
        return this;
    }

    public color(color: ForegroundOutputColor) {
        this.fgColor = color;
        return this;
    }

    public fg(color: ForegroundOutputColor) {
        return this.color(color);
    }

    public background(color: BackgroundOutputColor) {
        this.bgColor = color;
        return this;
    }

    public bg(color: BackgroundOutputColor) {
        return this.background(color);
    }

    public outputMethod(method: "console" | "stdout") {
        switch(method) {
            case "console": this._outputMethod = console.log; break;
            case "stdout": this._outputMethod = text=>process.stdout.write.call(process.stdout, text); break;
            default: throw new Error("Invalid output method.");
        }
        return this;
    }

    public bufferOutput() {
        this._bufferingEnabled = true;
        this._buffer = {};
        return this;
    }

    public sendBuffer() {
        if(this._bufferingEnabled) {
            // forwardText(this._category,this._buffer); [TO REVIEW IN FUTURE]
            this._buffer = {};
            this._bufferingEnabled = false;
        }
        return this;
    }

    public clearLine(mode : ClearingMode=0) {
        process.stdout.clearLine(mode);
        return this;
    }

    public cursorTo(x: number) {
        process.stdout.cursorTo(x);
        return this;
    }

    public print(param0: OutputImportance | string, param1?: OutputImportance | string | IGenericError, debugChannel?: DebugOutputChannel) {

        let text: string, importance: OutputImportance | undefined;

        if(["notice","warning","error"].includes(param0)) {
            importance = param0 as OutputImportance;
            text = param1 as string;
        }else {
            text = param0;
        }

        let isEnvironmentReady : boolean = global.app!==undefined;
        if(isEnvironmentReady) {
            const serverColorsMode = global.app.env.supportsColors?"node":"colorless";
            let formattedText: string | null= null;

            if(this._category=="debug") {
                if(global.app.env.debuggingEnabled) {
                    switch(importance) {
                        case "warning": 
                            formattedText = formatText(serverColorsMode,text,"fg_black","bg_yellow");
                            global.logs.access("alerts")?.write(`[WARNING] ${text}`);
                        break;
                        case "error": 
                            const err = parseErrorObject(param1 as Error);
                            const message = `"${err.message}" error raised ${err.faultingMethod?`in ${err.faultingModule?`${err.faultingModule}.`:""}${err.faultingMethod}() `:""}at ${err.faultLocation}`;
    
                            formattedText = formatText(serverColorsMode,message,"fg_white","bg_red");
                            text = message;
                            global.logs.access("alerts")?.write(`[ERROR] ${err.message}\n ${err.stack}\nAdditional data: ${err.attachedData ?? "unavailable"}`,true);
                        break;
                        case "notice":
                            if(global.app.env.outputChannels[debugChannel as DebugOutputChannel]||debugChannel==undefined) {
                                formattedText = formatText(serverColorsMode,text,"fg_white","bg_magenta");
                                global.logs.access("debug")?.write(`[DEBUG] ${text}`);
                            }
                        break;
                    }
                    if(formattedText!==null) this._outputMethod(formattedText);
                }
            }else {
                formattedText = formatText("node", text, `fg_${this.fgColor}`, `bg_${this.bgColor}`)
                this._outputMethod(serverColorsMode=="node"?formattedText:text);
            }

            const forwardEventData : {[name: string]: string} = {
                node: formattedText ?? text,
                colorless: text
            };

            if(this._bufferingEnabled) {
                for (const mode in forwardEventData) {
                    this._buffer[mode] = (this._buffer[mode] ?? "") + forwardEventData[mode];
                }
            }// }else forwardText(this._category,forwardEventData); [TO REVIEW IN FUTURE]
                
        }else if(importance=="error") {
            const err = parseErrorObject(param1 as Error);
            const message = `"${err.message}" error raised ${err.faultingMethod?`in ${err.faultingModule?`${err.faultingModule}.`:""}${err.faultingMethod}() `:""}at ${err.faultLocation}`;
            this._outputMethod(`[LOADER] Error: ${message}`);
        }else if(process.env.PRINT_WHOLE_LOADER) this._outputMethod(`[LOADER] ${text}`);

        return this;
    }

    public dumpObject(object: object) {
        console.dir(object,{depth: 3});
        // forwardObject(this._category,object); [TO REVIEW IN FUTURE]
        return this;
    }
}

/**
 * Manages inserting colors into output strings.
 * @param color - Color code. Both foreground and background colors are supported.
 * @param text - Text which should be in specified color.
 * @param mode - Colors mode. Can be either 'colorless', 'node'. If no provided, it will be adjusted in server's context.
 */
export function insertColor(color: ColorName,text: string,mode: OutputColorsMode | "auto"="auto") : string {
    switch(mode) {
        case "colorless":
        default:
            return text;
        case "node":
            return `\x1b[${translateColor(color)}m${text}\x1b[0m`;
        case "auto":
            return insertColor(color,text,global.app.env.supportsColors?"node":"colorless");
    }
}

/**
 * Formats provided text with given colors in specified colors mode
 * @param mode Colors mode.
 * @param text Text to format.
 * @param foreground Color of font.
 * @param background Color of background.
 */
export function formatText(mode: OutputColorsMode | "auto",text: string,foreground: ForegroundColorName = "fg_white",background: BackgroundColorName="bg_black") {
    return insertColor(foreground,background?insertColor(background,text,mode):text,mode); 
}