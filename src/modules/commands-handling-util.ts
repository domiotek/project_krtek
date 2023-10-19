import { DateTime } from "luxon";

/**
 * Checks whether given parameters item is an single parameter or a group of parameters.
 */
function isGroup(item: CommandsHandling.IParameter | CommandsHandling.IParameterGroup) : item is CommandsHandling.IParameterGroup {
    return (item as any).relation!=undefined;
}

///////////////////  Verifying  /////////////////////////////////////////////////////
// Static (without input params) check, if parameters and groups are used correctly.
// Throws errors - all errors will occurr during development.
// By default, not performed in production.
////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks parameters scheme for design errors.
 * Meant to be run during command development. It works similarly to the compiling process.
 * Once checked without error, result will not change until the scheme changes, so it shouldn't
 * be run in production to save cycles.
 * @param params Scheme to verify.
 * @throws Throws errors. If you see error thrown from that function in production, then verifying wasn't run in development.
 */
export function staticVerifyParameters(params: CommandsHandling.ParametersList) {
    for(const item of params) {
        if(isGroup(item)) verifyGroup(item);
        else verifyParameter(item);
    }
}

/**
 * Verifies group of parameters bound with the relation.
 * @param group group scheme object.
 * @param depth Measures, how deep given group is. Shouldn't be passed from the outside.
 * @throws
 */
function verifyGroup(group: CommandsHandling.IParameterGroup, depth: number=0) {
    if(group.parameters.length<2) throw new Error("[Command parameters verification] Unnecessary group use case - only one item in group.");

    const usedTypes = new Set<{type: CommandsHandling.IParameter["type"], enum?: CommandsHandling.IParameter["enum"], literal: CommandsHandling.IParameter["name"]}>();
    let prevOptionalState : boolean = false;
    let currentOptionalState: boolean = false;
    let isNamedPair = false;

    for(let i=0;i<group.parameters.length;i++) {
        const item = group.parameters[i];
        if(isGroup(item)) {
            if(group.relation==item.relation) throw new Error("[Command parameters verification] Unnecessary group use case - same type groups used in adjacent depths.");

            const subUsedTypes = verifyGroup(item,depth+1);
            if(group.relation=='oneOf') {
                for (const type of subUsedTypes) {
                    if(usedTypesHas(usedTypes, type.type)) throw new Error("[Command parameters verification] Nested group element's type collides with the upper level group element.");
                }
            }else {
                currentOptionalState = group.relation=="allIfFirst";
                usedTypes.add(Array.from(subUsedTypes.values())[0]);
            }
            
        }else {
            isNamedPair = item.isNamedPair ?? false;
            if(item.isNamedPair) {
                if(!item.optional) throw new Error("[Command parameters verification] NamedPair params must be optional.");
                if(group.relation!="many"||depth!=0) throw new Error("[Command parameters verification] NamedPair params can only be defined in top-level group.");   
            }
            if(group.relation=="oneOf"||i==0) {
                if(!item.isNamedPair&&usedTypesHas(usedTypes,item.type)) throw new Error("[Command parameters verification] Oneof group elements must have distinguishable types.");
                usedTypes.add({type: item.type, enum: item.enum, literal: item.name});  
            }
            currentOptionalState = item.optional ?? false;
        }
        if(!isNamedPair) {
            switch(group.relation) {
                case "allIfFirst":
                case "oneOf":
                    if(currentOptionalState) throw new Error(`[Command parameters verification] ${group.relation} group elements cannot be optional. Element at index ${i} is.`);
                break;
                case "many":
                    if(prevOptionalState&&!currentOptionalState) throw new Error(`[Command parameters verification] In 'many' type group, all consecutive elements after the optional one must be optional as well. Element at index ${i} isn't optional, while the previous one is.`);
                break;
            }
        }
        prevOptionalState = currentOptionalState;
    }
    return usedTypes;
}

/**
 * Verifies parameter scheme.
 * @param param parameter scheme object.
 * @throws
 */
function verifyParameter(param: CommandsHandling.IParameter) {
    if(param.isNamedPair) {
        if(param.name.substring(0,2)!="--") throw new Error("[Command parameters verification] namedPair parameters must start with '--' chars.");
    }

    if(param.type=="enum") {
        if(param.enum==undefined) throw new Error("[Command parameters verification] No enum options defined when the parameter type is 'enum'.");
    }
}

/**
 * Checks whether parameter type was used before (exists in provided set).
 */
function usedTypesHas(set: Set<{type: CommandsHandling.IParameter["type"], enum?: CommandsHandling.IParameter["enum"], literal: CommandsHandling.IParameter["name"]}>, query: string) {
    for (const item of set) {
        switch(item.type) {
            case "boolean":
            case "number":
            case "date":
            case "time":
            case "string":
                return item.type==query;
            case "enum":
                const temp = Array.from(item.enum ?? []);
                temp.forEach((item,index)=>temp[index] = item.toLowerCase());
                return item.enum?.includes(query.toLowerCase());
            case "literal":
                return item.literal.toLowerCase()==query.toLowerCase()
        }
    }
    return false;
}


///////////////////  Runtime checking  //////////////////////////////////////////////
// Performed everytime commands is being executed on input parameters.
// Utilizes parameter schemes defined in commands.
// Cannot be disabled.
/////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if given input parameters match provided scheme.
 */
export function matchParamsWithScheme(inputParams: Array<string>, scheme: CommandsHandling.ParametersList) {

    const namedPairs = extractNamedPairs(inputParams);

    const group : CommandsHandling.IParameterGroup = {relation: "many", parameters: scheme};
    let matchingResult = matchGroup(inputParams,group);

    if(matchingResult.matches) {
        for (let i=0; i<scheme.length; i++) {
            const param = scheme[i] as CommandsHandling.IParameter;
            if(param.isNamedPair) {
                const name = param.name.toLowerCase();
                if(Object.keys(namedPairs).includes(name)){
                    const inputValue = namedPairs[name]==null?(param.type!="literal"?"":param.name):(namedPairs[name] as string);

                    const checkResult = matchParameter(inputValue,param);
                    if(!checkResult.matches) {
                        matchingResult.matches = false;
                        matchingResult.errMessage = checkResult.errMessage;
                        matchingResult.errItemPath = [i];
                        break;
                    }else namedPairs[name] = checkResult.parsedValue;
                }
            }
        }
    }

    return {
        matchingResult: matchingResult,
        inputParams,
        namedPairs,
        scheme
    }

}

/**
 * Matches input params with the group scheme.
 */
function matchGroup(params: Array<string>, group: CommandsHandling.IParameterGroup) {
    let finalResult : {
        /**
         * Whether params match scheme.
         */
        matches: boolean
        /**
         * Parameters that were matched with scheme.
         */
        matchedParams: Array<string>
        /**
         * Parameters that weren't matched with scheme.
         */
        unmatchedParams: Array<string>
        /**
         * Object with parameter names (taken from scheme) as keys and unprocessed values as properties values.
         */
        params: CommandsHandling.IRawParamsCollection
        /**
         * Object with parameter names (taken from scheme) as keys and parsed values as properties values.
         */
        processedParams: CommandsHandling.IParsedParamsCollection
        /**
         * Potential matching error message.
         */
        errMessage?: string
        /**
         * Array with the indexes of items that couldn't be matched on each depth level.
         */
        errItemPath: Array<number>
    } = {matches: true, matchedParams: [], unmatchedParams: Array.from(params), params: {}, processedParams: {},errItemPath: []};

    switch(group.relation) {
        case "allIfFirst": {
            for (let i=0; i<group.parameters.length; i++) {
                const item = group.parameters[i];
                let matches;
                let errMessage;
                let isItemGroup = false;
                if(isGroup(item)) {
                    isItemGroup = true;
                    const checkResult = matchGroup(finalResult.unmatchedParams,item);
                    matches = checkResult.matches;
                    errMessage = checkResult.errMessage;
                    finalResult.matchedParams = finalResult.matchedParams.concat(checkResult.matchedParams);
                    finalResult.unmatchedParams = checkResult.unmatchedParams;
                    finalResult.params = Object.assign(finalResult.params,checkResult.params);
                    finalResult.processedParams = Object.assign(finalResult.processedParams,checkResult.processedParams);
                    finalResult.errItemPath = checkResult.errItemPath;
                }else {
                    if(item.isNamedPair) continue;
                    const checkResult = matchParameter(finalResult.unmatchedParams[0],item);
                    matches = checkResult.matches;
                    errMessage = checkResult.errMessage;
                    if(matches) {
                        finalResult.params[item.name] = finalResult.unmatchedParams[0];
                        finalResult.processedParams[item.name] = checkResult.parsedValue;
                        finalResult.matchedParams.push(params[i]);
                        finalResult.unmatchedParams.splice(0,1);
                    }
                }

                if(!matches) {
                    if(i==0) {
                        finalResult.errItemPath = [0];
                        break;
                    }
                    finalResult.matches = false;
                    finalResult.errMessage = isItemGroup?errMessage:`Expected '${finalResult.unmatchedParams[0]}' to match definition of '${(item as CommandsHandling.IParameter).name}' parameter. ${errMessage}`;
                    finalResult.errItemPath?.unshift(i);
                    break;
                }
            }

        }break;
        case "many": {
            for (let i=0; i<group.parameters.length; i++) {
                const item = group.parameters[i];
                if(isGroup(item)) {
                    const checkResult = matchGroup(finalResult.unmatchedParams,item);
                    
                    if(checkResult.matches) {
                        finalResult.matchedParams = finalResult.matchedParams.concat(checkResult.matchedParams);
                        finalResult.unmatchedParams = checkResult.unmatchedParams;
                        finalResult.params = Object.assign(finalResult.params, checkResult.params);
                        finalResult.processedParams = Object.assign(finalResult.processedParams, checkResult.processedParams);
                    }else if(finalResult.unmatchedParams.length==0&&(item.relation=="allIfFirst"||(item.relation=="oneOf"&&item.required===false))) break;
                    else {
                        finalResult.matches = false;
                        finalResult.errMessage = checkResult.errMessage;
                        finalResult.errItemPath = checkResult.errItemPath;
                        finalResult.matchedParams = finalResult.matchedParams.concat(checkResult.matchedParams);
                        finalResult.unmatchedParams.splice(0, checkResult.matchedParams.length);
                    }
                }else {
                    if(item.isNamedPair) continue;
                    const checkResult = matchParameter(finalResult.unmatchedParams[0],item);
                    if(checkResult.matches) {
                        finalResult.params[item.name] = finalResult.unmatchedParams[0];
                        finalResult.processedParams[item.name] = checkResult.parsedValue;
                        finalResult.matchedParams.push(params[i]);
                        finalResult.unmatchedParams.splice(0,1);
                    }else if(finalResult.unmatchedParams[0]==undefined&&item.optional) break;
                    else {
                        finalResult.matches = false;
                        finalResult.errMessage = checkResult.errMessage;
                    }
                }
                if(!finalResult.matches) {
                    finalResult.errItemPath?.unshift(i);
                    break;
                }
            }
        }break;
        case "oneOf": {
            let matched = false;
            for (let i=0; i<group.parameters.length; i++) {
                const item = group.parameters[i];
                if(isGroup(item)) {
                    const checkResult = matchGroup(finalResult.unmatchedParams,item);
                    if(checkResult.matches) {
                        matched = true;
                        finalResult.matchedParams = finalResult.matchedParams.concat(checkResult.matchedParams);
                        finalResult.unmatchedParams = checkResult.unmatchedParams;
                        finalResult.params = checkResult.params;
                        finalResult.processedParams = checkResult.processedParams;
                        break;
                    }else {
                        if(checkResult.errItemPath[0]!=0) {
                            finalResult.errItemPath = checkResult.errItemPath;
                            finalResult.errItemPath.unshift(i);
                            finalResult.errMessage = checkResult.errMessage;
                            finalResult.matchedParams = checkResult.matchedParams;
                            finalResult.unmatchedParams = checkResult.unmatchedParams;
                        }
                    }
                }else {
                    if(item.isNamedPair) continue;
                    const checkResult = matchParameter(finalResult.unmatchedParams[0],item);
                    if(checkResult.matches) {
                        matched = true;
                        finalResult.params[item.name] = finalResult.unmatchedParams[0];
                        finalResult.processedParams[item.name] = checkResult.parsedValue;
                        finalResult.matchedParams.push(params[i]);
                        finalResult.unmatchedParams.splice(0,1);
                        break;
                    }
                }
            }

            if(!matched) {
                finalResult.matches = false;
                finalResult.errMessage = finalResult.errMessage ?? (params[0]!=undefined?`Expected '${params[0]}' to match at least one of the following parameter definitions.`:`Expected a parameter what would match one of the following definitions.`);
            }
        }break;
    }

    if(!finalResult.matches) {
        finalResult.params = {};
        finalResult.processedParams = {};
    }

    return finalResult;
}

/**
 * Checks if input paramer matches the scheme.
 */
function matchParameter(param: string | undefined, scheme: CommandsHandling.IParameter) {
    let result : {
        matches: boolean
        parsedValue: any
        errMessage?: string,
        optional: boolean
    } = {matches: true, parsedValue: undefined, optional: scheme.optional ?? false}

    switch(scheme.type) {
        case "boolean":
            if(param?.toLowerCase()=="true"||param=="1") result.parsedValue = true;
            else if(param?.toLowerCase()=="false"||param=="0") result.parsedValue = false;
            else result.matches = false;
        break;
        case "date":
            let matches = true;
            if(param&&param.search(/\d{1,2}\/\d{1,2}\/\d{4}/)!=-1) {
                let date = param.split("/");
                const dateObj = DateTime.fromObject({
                    day: parseInt(date[0]),
                    month: parseInt(date[1]),
                    year: parseInt(date[2])
                });

                if(dateObj.isValid) result.parsedValue = dateObj;
                else matches = false;
            }else matches = false;
            
            if(!matches) {
                result.matches = false;
                result.errMessage = param!=undefined?`Expected '${param}' to be a valid date string in 'DD/MM/YYYY' format.`:`Expected valid date in 'DD/MM/YYYY' format as '${scheme.name}' parameter.`;
            }
        break;
        case "time":{
            let matches = true;
            if(param&&param.search(/\d{1,2}\:\d{1,2}/)!=-1) {
                let time = param.split(":");
                const timeObj = DateTime.fromObject({
                    hour: parseInt(time[0]),
                    minute: parseInt(time[1])
                });
                
                if(timeObj.isValid) result.parsedValue = timeObj;
                else matches = false;
            }else matches = false;

            if(!matches) {
                result.matches = false;
                result.errMessage = param!=undefined?`Expected '${param}' to be a valid time string in 24-hour 'HH:MM' format.`:`Expected valid time in 24-hour 'HH:MM' format as '${scheme.name}' parameter.`;
            }
        }break;
        case "number":
            if(!isNaN(param as any)) {
                result.parsedValue = parseInt(param as string);
                if(isNaN(result.parsedValue)) {
                    result.matches = false;
                    result.parsedValue = null;
                }
            }else result.matches = false;
        break;
        case "string": 
            if(typeof param == "string"&&param!="") result.parsedValue = param;
            else {
                result.matches = false;
                result.errMessage = `Expected '${scheme.name}' parameter to be not empty string.`;
            }
        break;
        case "literal":{
            const testValue = scheme.caseSensitive?param:param?.toLowerCase();
            const desiredValue = scheme.caseSensitive?scheme.name:scheme.name.toLowerCase();
            if(testValue==desiredValue) result.parsedValue = param;
            else {
                result.matches = false;
                if(scheme.isNamedPair) result.errMessage = `Expected '${scheme.name}' parameter to have no value.`;
                else result.errMessage = param!=undefined?`Expected '${param}' to equal '${scheme.name}'.`:`Expected '${scheme.name}' parameter.`;
            }
        }break;
        case "enum":{
            const testValue = scheme.caseSensitive?param:param?.toLowerCase();
            const possibilities = Array.from(scheme.enum ?? []);
            if(!scheme.caseSensitive) {
                possibilities.forEach((val,index)=>{
                    possibilities[index] = val.toLowerCase();
                });
            }
            if(possibilities.includes(testValue ?? "")) result.parsedValue = testValue;
            else {
                result.matches = false;
                result.errMessage = param!=undefined?`Expected '${param}' to be one of the following string constants: ${possibilities}.`:`Expected a '${scheme.name}' parameter.`;
            }
        }break;
    }
    if(!result.matches&&!result.errMessage) {
        result.errMessage = param!=undefined?`Expected '${scheme.name}' parameter to be of type '${scheme.type}', '${param}' cannot be parsed as such.`:`Expected '${scheme.name}' parameter to be provided and be of type '${scheme.type}'.`;
    }
    return result;
}

/**
 * Extracts namedPairs parameters from input parameters.
 * Modifies input array by removing namedPairs and their values.
 * @returns Object with namedPairs names as keys and unprocessed values as properties values.
 */
function extractNamedPairs(params: Array<string>) {
    let result : {[name: string]: string | null} = {};
    let nextParamValue = null;
    for (let i=0;i<params.length;i++) {
        const param = params[i];

        if(param.search(/--/)!=-1) {
            if(nextParamValue) result[nextParamValue] = null;
            nextParamValue = param;
            if(i+1==params.length) result [nextParamValue] = null;
        }else if(nextParamValue) {
            result[nextParamValue] = param;
            params.splice(i-1,2);
            i-=2;
            nextParamValue = null;
        }
    }
    if(nextParamValue) params.splice(params.length-1,1);
    
    return result;
}

export function checkVariantRequirement(requirements: CommandsHandling.IParsedRequirements | undefined, request: CommandsHandling.CommandsRequest): boolean {
    switch(requirements?.type) {
        case "minVersion": 
            if((request.client?.datastore.get("int_clientVersion")??0)>=(requirements.version ?? 0)) return true;
        break;
        case "maxVersion":
            if((request.client?.datastore.get("int_clientVersion")??0)<=(requirements.version ?? 0)) return true;
        break;
        case "exactVersion":
            if((request.client?.datastore.get("int_clientVersion")??0)==(requirements.version ?? 0)) return true;
        break;
        case "allowedAction":
            if(global.app.userAuth.isActionAllowedFor(request.client?.datastore.get("authToken"),requirements.action as CLIUserAuthentication.ActionNames)) return true;
        break;
        case "customTest":
            if(requirements.testHandler&&requirements.testHandler(request.params,request.client, (type, details)=>{
                let requirementsObj : any = {type};
                switch(type) {
                    case "minVersion":
                    case "maxVersion":
                    case "exactVersion":
                        requirementsObj.version = details;
                    break;
                    case "allowedAction":
                        requirementsObj.action = details;
                    break;
                }
                return checkVariantRequirement(requirementsObj,request);
            })) return true;
        break;
        case "HTTPOrigin":
            if(request.origin=="HTTP") return true;
    }
    return false;
}