import {DateTime} from "luxon";
import {writeFileSync} from "fs";

const stamp = DateTime.now().toISO();
writeFileSync('./src/build-date.ts', `export class BuildDate { public static readonly buildDate = '${stamp}'; }`);