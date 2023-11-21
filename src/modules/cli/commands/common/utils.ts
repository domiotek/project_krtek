import { insertColor } from "../../../output.js";
import { describeAPIError } from "../../../util.js";

export function getCommandErrorDisplayText(message: string, apiErrCode: WebAPI.APIErrors<WebAPI.APITypes>, colorsMode: OutputColorsMode) {
    const errDescription = describeAPIError(apiErrCode);
    return `${message} - ${insertColor('fg_red',apiErrCode,colorsMode)}\n${insertColor("fg_grey",errDescription,colorsMode)}`;
}