import { DateTime, Settings } from "luxon";

/**
 * Configures DateTime's zone
 */
export function init(timezone?: string) {
    if(timezone) Settings.defaultZone = timezone;
}

/**
 * Returns current time in DateTime object.
 */
export function now() {
    return DateTime.now();
}

/**
 * Formats time into localized string
 * @returns Formatted string
 */
export function formatDate(time: DateTime) {
    return time?.toLocaleString(DateTime.DATETIME_FULL);
}

/**
 * Formats date/time difference into user friendly string
 * @param start - Start DateTime object
 * @param end - When omitted, current time will be used. 
 * @returns Formatted string
 */
export function formatDiff(start: DateTime,end: DateTime=now(), options = {shortUnits: false}) {
    let diff = end.diff(start,["days","hours","minutes","seconds"]).toObject();
    return `${diff.days?diff.days+(options.shortUnits?"d":" day(s)"):""}${diff.days&&(diff.hours||diff.minutes||diff.seconds)?", ":""}${diff.hours?diff.hours+(options.shortUnits?"h ":" hour(s)"):""}${diff.hours&&diff.minutes&&!options.shortUnits?", ":""}${diff.minutes?diff.minutes+(options.shortUnits?"m ":" minute(s), "):""}${Math.round(diff.seconds?? 0)}${options.shortUnits?"s":" second(s)"}`;
}

/**
 * Returns difference between dates/times in requested units
 * @param start - Start DateTime object
 * @param end - End DateTime object
 * @param output Difference units
 * @returns Object with units as properties
 */
export function getDifference(start: DateTime,end: DateTime=now(), output: Array<"days" | "hours" | "minutes" | "seconds" | "milliseconds">){
    return end.diff(start,output).toObject();
}

/**
 * Parses valid string into luxon.DateTime object. If string isn't valid ISO format, null will be returned.
 * @param time 
 */
export function parseISO(time: string) : luxon.DateTime | null {
    const formatted = DateTime.fromISO(time);
    return formatted.isValid?formatted:null;
}

export {DateTime};