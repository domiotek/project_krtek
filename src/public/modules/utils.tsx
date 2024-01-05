import { DateTime } from "luxon";
import { CustomFormTypes } from "../components/Forms/CustomForm/CustomForm";
import { API } from "../types/networkAPI";
import i18n from "./i18n";
import { ComponentType } from "react";

export function manageClassState(targetClassName: string, action: "active" | "inactive" | "toggle", shownStateClassName: string) {
	let target = document.querySelector(`.${targetClassName}`) as HTMLDivElement | null;

	if(target) {
		switch(action) {
			case "active":
				target.classList.add(shownStateClassName);
			break;
			case "inactive":
				target.classList.remove(shownStateClassName);
			break;
			case "toggle":
			default:
				target.classList.toggle(shownStateClassName);
		}
	}else throw Error(`Innacessible Target Element ${targetClassName}`);
}


export function parseFormData(form: HTMLFormElement, ignoreList?: string[], staticFields?: CustomFormTypes.IFieldDefs, dynamicFields?: CustomFormTypes.IFieldDefs) {
	const formData: {[key: string]: string} = {};

	function handleFields(list?: CustomFormTypes.IFieldDefs) {
		for (const name in list) {
			if(!ignoreList?.includes(name))
				formData[name] = list[name];
		}

	}

	for (const element of form.elements) {
		const name = element.getAttribute("name");
		if(name&&!ignoreList?.includes(name))
			formData[name] = (element as HTMLInputElement).value;
	}

	handleFields(staticFields);
	handleFields(dynamicFields);

	return formData;
}

/**
 * Returns string with the number representation as follows.
 * * if integer, then just the integer
 * * if decimal point position is 1, then appends 0
 * * if decimal point position is more than or equal to 2, then all digits to the right are cut.
 * 
 * Ideal for currency.
 * @param amount 
 */
export function render2FloatingPoint(amount: number) {
    return amount.toFixed(2).replace(".00", "")
}

export function renderDateTime(dateTime: DateTime | null | undefined, fallback: string = "") {
	return dateTime?.isValid?dateTime.toFormat("dd/LL/yyyy HH:mm"):fallback;
}

export function renderDate(dateTime: DateTime | null | undefined, fallback: string = "") {
	return dateTime?.isValid?dateTime.toFormat("dd/LL/yyyy"):fallback;
}

export function renderTime(dateTime: DateTime | null | undefined, fallback: string = "") {
	return dateTime?.isValid?dateTime.toFormat("HH:mm"):fallback;
}

/**
 * Returns relative text difference of given date in relation to relativePoint.
 * Outputs text in globally set language in form like "3 days ago" or "this month".
 */
export function renderDateRelDiff(date: DateTime, relativePoint: DateTime=DateTime.now()) {
	const unitTable: {[u: string]: [number, number]} = { //[divisor, cutoff]
		year  : [365, 90],
		month : [365/12, 21],
		week  : [7, 4],
		day: [1,1]
	}
	const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
	const diff = date.startOf("day").diff(relativePoint.startOf("day"),["days"]).days;

	if(!isNaN(diff)) {
		for (let u in unitTable) {
			if (Math.abs(diff) >= unitTable[u][1] || u == 'day') {
				return rtf.format(Math.floor(diff/unitTable[u][0]), u as Intl.RelativeTimeFormatUnit);
			}
		}
	}
}

export function callAPI<T extends API.IBaseAPIEndpoint>(method: T["method"], endpointURL: T["url"],values: T["urlParams"], onSuccess: (data: T["returnData"])=>void, onError?: (statusCode: number, errCode: T["errCodes"], errorType: "Server" | "Client")=>void, body?: URLSearchParams) {
	const aborter = new AbortController();

	new Promise<void>(async res=>{
		if(values) {
			for (const paramName in values) {
				const value = values[paramName];
				endpointURL = endpointURL.replace(":"+paramName,value);
			}
		}

		const response = await fetch(endpointURL,{signal: aborter.signal, method, body});
		const result = await response.json() as T["returnPacket"];

		if(response.ok&&result.status=="Success") {
			onSuccess(result.data);
		}else {
			if(onError) onError(response.status, (result as any).errCode, response.status >=400&&response.status <500?"Client":"Server");
		}

		res();
	});

	return ()=>aborter.abort();
}

/**
 * Gracefully handles lazy React component import by displaying fallbackForm component when importing fails.
 * Note, that there still needs to be Suspense wrapper used for the loading process. FallbackForm will be 
 * displayed only after import timeouted or client is offline.
 */
export function handleImport<P>(importPromise: Promise<{default: ComponentType<P>}>, fallbackForm: JSX.Element) {
    return new Promise<{default: ComponentType<P>}>(async res=>{
        try {
            const component = await importPromise;

            res(component);
        } catch (error) {
            res({default: ()=>fallbackForm});
        }
        
    });
}