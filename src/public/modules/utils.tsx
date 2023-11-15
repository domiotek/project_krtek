import { DateTime } from "luxon";
import { CustomFormTypes } from "../components/Forms/CustomForm/CustomForm";
import { API } from "../types/networkAPI";

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


export function parseFormData(form: HTMLFormElement, ignoreList?: string[], staticFields?: CustomFormTypes.IFieldDefs) {
	const formData: {[key: string]: string} = {};

	for (const element of form.elements) {
		const name = element.getAttribute("name");
		if(name&&!ignoreList?.includes(name))
			formData[name] = (element as HTMLInputElement).value;
	}

	for (const name in staticFields) {
		if(!ignoreList?.includes(name))
			formData[name] = staticFields[name];
	}

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

export function renderDate(dateTime: DateTime | undefined, fallback: string) {
	return dateTime?.isValid?dateTime.toFormat("dd/LL/yyyy"):fallback;
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