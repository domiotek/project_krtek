import { dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Gets path to a provided file(module)
 * @param url Url to file. User import.meta.url to target current module file.
 * @returns Path to directory holding a file.
 */
export function __dirname(url: string) {
    return dirname(fileURLToPath(url));
}
/**
 * Fills text to desired length with specified char
 * @param text - String to fill 
 * @param length - Desired length
 * @param char - Char to fill with. If has more than one character, it will be truncated.
 * By default, white char.
 * @param mode - Whether to append or prepend the chars to given text. -1 for prepend, 1(default) for append.
 */
export function fillWith(text: string,length: number,char: string=" ", mode: 1 | -1 = 1) {
    char = char.length==1?char:char.substr(0,1);
    let i=text.length;
    while(i++<length)
        text = mode==1?text + char:char+text;
    return text;
}

/**
 * Converts semantic version into number for comparision.
 * Converting is based on just prepending version parts with zero and converting such string into number.
 * Please note, that only versions limited to 4 digits per part can be computed using this function.
 * Largest possible version would be 9999.9999.9999
 * @param version 
 * @example computeVersion("1.0.1") -> 100000001
 * @example computeVersion("2.15.3") -> 200150003
 */
export function computeVersion(version: string) : number {
    const parts = version.split(".");
    if(parts.length!=3) throw new Error("[ComputeVersion] Given invalid semantic version.");

    let result: string = "";
    for (const part of parts) {
        try {
            let number = parseInt(part);
            if(number>=10000) throw 1;
            else if(number<0) throw 2;
        } catch (error) {
            throw new Error(`[ComputeVersion] Invalid semantic version string. '${part}' in '${version}' ${error==1?"is larger than 9999":(error==2)?"is less than 0":"is not a number"}.`);
        }

        let final : string = part;

        for(let i=0; i< 4 - part.length; i++) {
            final = "0"+final;
        }
        result = result + final;
    }
    return parseInt(result);
}

/**
 * Formats given array into string with commas between items
 * @param {Array} target Array with numbers as indexes
 * @returns {string} Formatted string
 */
export function formatArray(target: Array<any>): string {
    let text = "";
    
    target.forEach((elem,index)=>{
        text += ` ${elem}${index+1!=target.length?",":""}`;
    });
    return text;
}

/**
 * Waits for the specified amount of seconds. Equivalent of sleep command.
 * @param ms How long to wait for.
 */
export async function waitFor(ms: number) {
    await new Promise<void>((resolve)=>setTimeout(()=>resolve(),ms));
}

/**
 * Prepends number with zero if it's smaller than 10
 */
export function prependZero(input: string | number) : string {
    const number = typeof input=="string"?parseInt(input):input;
    if(number<10&&number>=0) return `0${number}`;
    else return `${number}`;
}

/**
 * Formats error stack entry in one of the following ways based on the availability of properties:
 * * in [module].[method]() at [location]
 * * in [method]() at [location]
 * * at [location]
 */
export function formatErrorStackEntry(errStackEntry: IStackRecord) {
    return `${errStackEntry.method?`in ${errStackEntry.module?`${errStackEntry.module}.`:""}${errStackEntry.method}() `:""}at ${errStackEntry.location}`;
}

/**
 * Analyzes single stack entry and extracts module, method and location from it, if possible.
 */
function parseErrorStackEntry(errStackEntry: string) {
    const result: IStackRecord = {
        module: undefined,
        method: undefined,
        location: ""
    }

    const dotPos = errStackEntry.indexOf(".");
    const pPos = errStackEntry.indexOf(" (");
    const atPos = errStackEntry.indexOf("at ")+3;
    const envType = dotPos!=-1&&pPos!=-1?(dotPos<pPos?"method":"globalFunc"):"other";
    switch(envType) {
        case "method":
            result.module = errStackEntry.substring(atPos,dotPos);
            result.method = errStackEntry.substring(dotPos+1,pPos);
            result.location = errStackEntry.substring(pPos+2,errStackEntry.indexOf(")"));
        break;
        case "globalFunc":
            result.method = errStackEntry.substring(atPos,pPos);
            result.location = errStackEntry.substring(pPos+2,errStackEntry.indexOf(")"));
        break;
        case "other":
            result.location = errStackEntry.substring(atPos,errStackEntry.length-1);
        break;
    }

    return result;
}

/**
 * Goes up down the stack and returns first function call, that doesn't belong to the given module.
 * Usefull, when you want to find outside origin of the error in the complex internal module structure. 
 * If such can't be found, first entry will be returned.
 */
export function findFirstStackEntryNotFrom(stackEntries: IStackRecord[], module: string) {
    for (const entry of stackEntries) {
        if(entry.module!=module) {
            return entry;
        }
    }

    return stackEntries[0];
}


/**
 * Analyzes given error object and returns information like 
 * thrown error, faulting module and stack with shortened paths.
 */
export function parseErrorObject(err: IGenericError) {
    const result : IParsedErrorData = {
        message: "",
        faultingModule: undefined,
        faultingMethod: undefined,
        faultLocation: "",
        stack: "",
        stackParts: [],
        attachedData: undefined
    }
    const parts = (err.stack ?? "").split("\n");
    result.message = err.message;

    for (let i=1; i<parts.length;i++) {
        const startPos = parts[i].search("file://");
        const endPos = parts[i].indexOf("dist/",startPos);
        if(parts[i].search("internal")!=-1||parts[i].search("<anonymous>")!=-1) continue;

        parts[i] = parts[i].substring(0,startPos) + parts[i].substring(endPos+4) + "\n";
        parts[i] = "\t\t"+parts[i].trimStart();
        
        result.stackParts.push(parseErrorStackEntry(parts[i]));
        result.stack += parts[i];
    }
    result.stack = result.stack.substring(0,result.stack.length-1);

    const faultingEntry = parseErrorStackEntry(parts[1]);

    result.faultingModule = faultingEntry.module;
    result.faultingMethod = faultingEntry.method;
    result.faultLocation = faultingEntry.location;

    if(err.data!=undefined) result.attachedData = JSON.stringify(err.data);

    return result;
}

interface IColumnDetails {
    maxLength: number
    rows: string[]
}

/**
 * Generates well spaced data table with elevated header.
 * @param columns Table data. It's an array of columns, which consists of their own arrays of values.
 * First value of each column is treated as the header.
 * @param valuesOffset Array of offsets that will be applied to value cells in corresponding columns. 
 * Usefull, when cell's value consists of mostly invisible escaped chars. These charactes are counted
 * to the total length, but do not produce width. This can for example happen, when wrapping number with
 * color definitions. Also to keep offset equal in cases when data in columns have both uncolored and colored data
 * make sure to also wrap noncolored data in the neutral e.g. white color. Note that you need to provide zeros only
 * up to the column with offset, columns after that one can be left undefined.
 */
export function getPrintableDataTable(columns: string[][], valuesOffset?: number[]): string {
    const columnDetails: Array<IColumnDetails> = [];

    let resultStr = "";
    const spacing = "     ";
    let rowCount = 0;
    let totalRowLength = columns.length * spacing.length;

    if(columns.length==0) {
        return "No data to display.";
    }
    valuesOffset = valuesOffset ?? [];


    for (let i=0; i < columns.length; i++) {
        const column = columns[i];
        const details: IColumnDetails = {maxLength: 0,rows:column}

        if(column.length > rowCount)
            rowCount = column.length;

        for (const value of column) {
            if(value.length>details.maxLength)
                details.maxLength = value.length;
        }
        totalRowLength += details.maxLength;
        columnDetails.push(details);
    }

    let rowIndex = 0;
    while(rowIndex < rowCount) {
        for (let columnIndex = 0; columnIndex < columnDetails.length; columnIndex++) {
            const calculatedLength = columnDetails[columnIndex].maxLength;
            const length2 = (rowIndex!=0)?(calculatedLength+(valuesOffset[columnIndex] ?? 0)):calculatedLength;
            resultStr += fillWith(columnDetails[columnIndex].rows[rowIndex] ?? "",length2) + spacing;
        }
        resultStr +="\n";

        if(rowIndex==0) 
            resultStr += fillWith("",totalRowLength,"=") + "\n";
        rowIndex++;
    }

    if(rowCount==1) {
        const msg = "No data to display\n";
        resultStr += fillWith(msg,(totalRowLength - msg.length)/2+msg.length," ",-1);
    }

    return resultStr;
}

/**
 * Initializes array of arraries with specified amount of child arraries.
 * @param count Number of arraries.
 * @returns T[][]
 */
export function initArrayOfArrays<T>(count: number) {
    let result: T[][] = [];
    for (let i=0; i < count; i++) {
        let subArray: T[] = [];
        result.push(subArray);
    }

    return result;
}


export class APIError<T extends WebAPI.APITypes> extends Error implements WebAPI.APIError<T> {
    public module;
    public errCode;

    constructor(module: string, errCode: WebAPI.APIErrors<T>) {
        super(`[API][${module}] API call failed with code: ${errCode}.`);
        this.module = module;
        this.errCode = errCode;
    }
}

/**
 * Checks whether given object is an instance of the APIError class.
 * @param error Any variable
 */
export function isAPIError(error: any): error is WebAPI.APIError {
    return error instanceof APIError;
} 


export function describeAPIError(errorCode: WebAPI.APIErrors<WebAPI.APITypes> ) {
    let message;

    switch(errorCode) {
        case "DBError": message = "There was an issue with database."; break;
        case "NoConnection": message = "Server couldn't establish connection with the database.";break;
        case "UserExists": message = "Account with that email address already exists."; break;
        case "NoUser": message = "Couldn't find user matching given criteria."; break;
        case "InvalidEmail": message = "Given email address is invalid."; break;
        case "InvalidPassword": message = "Given password doesn't meet the requirements."; break;
        case "InvalidRank": message = "Specified rank isn't defined."; break;
        case "InvalidRole": message = "Specified role isn't defined."; break;
        case "RoleAlreadyAssigned": message = "Requested role is already assigned to the specified user."; break;
        case "NotAssigned": message = "Specified user doesn't have requested role assigned."; break;
        case "InviteExists": message = "There is already active invite for the specifed email address."; break;
        case "InvalidToken": message = "Given token doesn't exist."; break;
        case "InvalidSession": message="Given token doesn't represent any session."; break;
        case "InvalidAction": message = "Given action doesn't exist. Check available action names with account-actions list-types."; break;
        case "TooMuchTokens": message = "This user has reached maximum amount of action tokens of that count."; break;
        case "InvalidDate": message = "Given date input is invalid."; break;
        case "InvalidRange": message = "Given date range is invalid. Make sure dates are formed correctly and that the 'before' date is later than 'after' date.";break;
        case "InvalidSlot": message = "Shift slot with given ID doesn't exist."; break;
        case "MaxSlotCountReached": message = "You have reached maximum amount of slots per workDay."; break;
        case "NoteTooLong": message = "That note is too long. The limit is 255 characters."; break;
        case "UserWithoutRole": message = "Specified user doesn't have role required by the shift slot."; break;
        case "UserAlreadyAssigned": message = "Specified user is already assigned to the other shift slot on the requested work day."; break;
        case "InvalidTipOrDeduction": message = "Given tip and or deduction amount is invalid. Make sure to provide positive number."; break;
        case "MilestoneLimitReached": message = "You have reached maximum amount of goal milestones."; break;
        case "NotImplemented": message = "You shouldn't see this. This functionality isn't ready yet."; break;
        default: message = "No additional information.";
    } 

    return message;
}