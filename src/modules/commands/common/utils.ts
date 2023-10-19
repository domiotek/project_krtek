import { insertColor } from "../../output.js";

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
        default: message = "No additional information.";
    } 

    return message;
}

export function getCommandErrorDisplayText(message: string, apiErrCode: WebAPI.APIErrors<WebAPI.APITypes>, colorsMode: OutputColorsMode) {
    const errDescription = describeAPIError(apiErrCode);
    return `${message} - ${insertColor('fg_red',apiErrCode,colorsMode)}\n${insertColor("fg_grey",errDescription,colorsMode)}`;
}