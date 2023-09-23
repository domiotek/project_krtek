type OutputColorsMode = "node" | "colorless";
type ForegroundOutputColor = "white" | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "grey";
type BackgroundOutputColor = "white" | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "transparent";
type OutputCategory = "debug" | "general"
type OutputImportance = "notice" | "warning" | "error";

type ForegroundColorName = `fg_${ForegroundOutputColor}`;
type BackgroundColorName = `bg_${BackgroundOutputColor}`;
type ColorName = ForegroundColorName | BackgroundColorName;

type ClearingMode = -1 | 0 | 1;

interface IDebugOutputController {
    /**
     * Prints text to the console and forwards it to the clients that are registered for subscription, if available.
     * @param text Text to print.
     * @param noticeChannel Channel of debug message. Individual channels can be blocked from within environment config. 
     */
    print(importance: "notice", text: string, noticeChannel?: DebugOutputChannel) : IDebugOutputController;

    /**
     * Prints text to the console and forwards it to the clients that are registered for subscription, if available.
     * @param text Text to print.
     */
    print(importance: "warning", text: string) : IDebugOutputController;

    /**
     * Prints error message to the console and forwards it to the clients that are registered for subscription, if available.
     * @param error Error to report.
     */
    print(importance: "error", error: IGenericError): IDebugOutputController;

    /**
     * Transforms provided object into its string JSON representation and prints it to the console. Object is also being
     * transfered to clients that are registered for subscription, if such is available
     * @param object Object to dump.
     */
    dumpObject(object: object) : IDebugOutputController;
}
interface IOutputController extends IDebugOutputController {
    /**
     * Color of the font foreground.
     */
    fgColor: ForegroundOutputColor;

    /**
     * Color of the font background.
     */
    bgColor: BackgroundOutputColor;

    /**
     * Overwrites global settings.
     */
    colorsMode: OutputColorsMode | null;

    /**
     * Sets font's foreground color.
     * @param color Color name
     * @returns this
     */
    color(color: ForegroundOutputColor) : IOutputController

    /**
     * Sets font's foreground color. Alias for color.
     * @param color Color name
     * @returns this
     */
    fg(color: ForegroundOutputColor) : IOutputController

    /**
     * Sets font's background color.
     * @param color Color name
     * @returns this
     */
    background(color: BackgroundOutputColor): IOutputController

    /**
     * Sets font's background color. Alias for background.
     * @param color Color name
     * @returns this
     */
    bg(color: BackgroundOutputColor) : IOutputController

    /**
     * Overwrites global colorsMode settings. Can be used to one-time format text in different colorsMode.
     * @param mode ColorsMode
     */
    mode(mode: OutputColorsMode) : IOutputController

    /**
     * Changes method which is used to write output into the console.
     * 'console' method utilizes 'console.log' function and inserts endline characters after each print call.
     * 'stdout' method uses 'process.stdout.write' function which doesn't do that therefore giving more control over
     * output formatting to programmer.
     */
    outputMethod(method: "console" | "stdout") : IOutputController

    /**
     * Allows for buffering output fragments before forwarding them.
     * This is usefull for 'stdout' output method, because it allows to send whole line as one packet.
     * Without it, each print will be treated as separate line on the client side.
     */
    bufferOutput(): IOutputController;

    /**
     * Forwads currently buffered output fragments as one line.
     */
    sendBuffer(): IOutputController;

    /**
     * Clears text in most recent line.
     * @param mode What to clear.
     * * -1 - to the left of the cursor.
     * *  0 - whole line.
     * *  1 - to the right of the cursor.
     */
    clearLine(mode: ClearingMode=0): IOutputController;
    
    /**
     * Moves cursor to the given x coordinate.
     */
    cursorTo(x: number): IOutputController;

    /**
     * Prints text to the console and forwards it to the clients that are registered for subscription, if available.
     * @param text Text to print.
     * @param importance Importance of an internal message.
     * @param debugChannel Channel of debug message. Individual channels can be blocked from within environment config. 
     */
    print(text: string) : IOutputController
}