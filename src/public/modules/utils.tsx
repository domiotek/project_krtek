import { CustomFormTypes } from "../components/Forms/CustomForm/CustomForm";

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