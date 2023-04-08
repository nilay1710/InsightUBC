import Query, {Apply} from "./Query";
import {InsightResult} from "./IInsightFacade";
import {DataModellingTools} from "./DataModellingTools";
import {QueryEval} from "./QueryEval";
import {ZipValidationTools} from "./ZipValidationTools";
import Section from "./Section";
import Room from "./Room";
import Decimal from "decimal.js";

let queryEvaluator = new QueryEval();
let zipValidator = new ZipValidationTools();
let dataModelling = new DataModellingTools(zipValidator, queryEvaluator);
export function  convertToInsightResultList(sections: any[], q: Query): InsightResult[] {
	let resultList = new Array<InsightResult>();
	for(let s of sections){
		let result = convertToInsightResult(s, q);
		resultList.push(result);
	}
	return resultList;
}

export function  convertToInsightResultListNew(list: any[], q: Query): InsightResult[] {
	let resultList = new Array<InsightResult>();
	for(let s of list){
		let result = convertToInsightResultNew(s, q);
		resultList.push(result);
	}
	return resultList;
}

function  convertToInsightResultNew(transform: any, q: Query): InsightResult { // transform is one element of list
	// check for which keys to gather from section string
	// convert into InsightResults
	let keyList = q.getOptions().getColumns(); // get list of keys to include in InsightResult
	let names = q.getTransformations()?.getGroup() as string[]; // list of group keys
	let namesTwo = q.getTransformations()?.getApply() as Apply[]; // Apply[]
	let namesThree = [];
	if (namesTwo.length !== 0) {
		for (const i of namesTwo) { // i = Apply
			namesThree.push(i.getApplyKey());   // namesThree = list of apply keys
		}
	}
	let param = names?.concat(namesThree); // Group keys plus apply keys
	let fields = funct(keyList, transform, param); // returns a list of the values in the section associated with what COLUMN specifies

	let result: InsightResult = {};
	let i = 0;
	for(let key of keyList) {						// iterates through all the keys specified by COLUMN
		result[keyList[i]] = fields[i];    // adds new key to insight result type
		i++;
	}
	return result;
}

function funct(keyList: string[], transform: any[], names: string[]): any[] {

	let list = [];
	for (const i in keyList) {
		list.push(transform[names.indexOf(keyList[i])]);

	}
	return list;
}

// **CITATION**: https://www.typescriptlang.org/docs/handbook/interfaces.html
// USE: used to figure out how to use and index into an interface
// EFFECTS: convert the individual section into an insight result
function  convertToInsightResult(sections: any, q: Query): InsightResult {
	// check for which keys to gather from section string
	// convert into InsightResults
	let keyList = q.getOptions().getColumns(); // get list of keys to include in InsightResult
	let fields = getFields(keyList, sections); // returns a list of the values in the section associated with what COLUMN specifies
	let result: InsightResult = {};
	let i = 0;
	for(let key of keyList) {						// iterates through all the keys specified by COLUMN
		result[keyList[i]] = fields[i];    // adds new key to insight result type
		i++;
	}
	return result;
}

// CITATION: https://codingbeautydev.com/blog/javascript-round-number-to-2-decimal-places/#:~:text=December%2011%2C%202022-,To%20round%20a%20number%20to%202%20decimal%20places%20in%20JavaScript,number%20to%202%20decimal%20places.
// USE: used for rounding to two decimal places
export function applyFunction(sections: Section[] | Room[], applyToken: string, key: string): number {
	let init = getField(key, sections[0]);
	if( typeof init !== "string" && init !== false) {
		if (applyToken === "MAX") {
			let max = getField(key, sections[0]);
			for (const i of sections) {
				if (getField(key, i) as number > max) {
					max = getField(key, i) as number;
				}
			}
			return max as number;
		} else if (applyToken === "MIN") {
			let min = getField(key, sections[0]);
			for (const i of sections) {
				if ((getField(key, i) as number) < min) {
					min = getField(key, i) as number;
				}
			}
			return min as number;
		} else if (applyToken === "AVG") {
			let sum: Decimal = new Decimal(0);
			for (const i of sections) {
				let newDType = new Decimal(getField(key, i) as number);
				sum = Decimal.add(sum, newDType);
			}
			return Number((sum.toNumber() / (sections.length)).toFixed(2));
		} else if (applyToken === "SUM") {
			let sum = 0;
			for (const i of sections) {
				sum = sum + (getField(key, i) as number);
			}
			return Number(sum.toFixed(2));
		}
	}
	if (applyToken === "COUNT") {
		let set = new Set<any>();
		for (const i of sections) {
			set.add(getField(key,i));
		}
		return set.size;
	}
	return 0;
}

// EFFECTS: checks if all the of the list items in ParamB are already in the map (AKA if the group already exists)
export function checkExist(paramA:  any[] , paramB: any[]): number {
	/*
	let list = [];
	// for each entry in the map, push the list to 'list'
	for (const a of paramA) {
		list.push(a);
	}
	 */
	// CITATION: https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
	// USE: used to compare two strings
	// TODO: why not just use list.every() ?
	// if there is some element in the list such that each element in the list matches the corresponding element in the paramBlist
	for (let i = 0; i < paramA.length; i++) {
		if(checkExistPartTwo(paramA[i], paramB)){
			return i;
		}

	}
	return -1;
};


export function checkExistPartTwo(paramA: any[], paramB: any[] ): boolean {
	if (paramA.length !== paramB.length) {
		return false;
	}
	for (const i in paramA) {
		if (paramA[i] !== paramB[i]) {
			return false;
		}
	}
	return true;
}
export function functio (paramA: any[], paramB: any[]): boolean {
	for (const i in paramB) {
		if (paramB[i] !== paramA[i]) {
			return false;
		}
	}
	return true;
};
export function getValue (paramA: Map<any[], Section[] | Room[]>, paramB: any[]): Section[] | Room[] {
	let key: any;
	for (const i of paramA.keys()) {
		if (functio(i, paramB)) {
			key = i;
			break;
		}
	}
	let obj = paramA.get(key) as Section[] | Room[];
	paramA.delete(key);
	return obj;
}

export function isEmpty(obj: object): boolean {
	return Object.keys(obj).length === 0;
}

// I learned about the  array reduce() function from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
export function groupSection(groupedItems: any, listOfObjects: any): Map<string, Section[]> {
	// I used this sitehttps://howtodoinjava.com/typescript/maps/ to find the documentation for Map
	groupedItems = listOfObjects.reduce((acc: Map<string, Section[]>, item: object) => {
		if ("groupValues" in item && "filter" in item) {
			const key = JSON.stringify(item["groupValues"]); // this is the key
			if (!acc.has(key)) {
				acc.set(key, []);
			}
			acc.get(key)?.push(item.filter as Section);
			return acc;
		}
		return acc;

	}, new Map<string, Section[]>());
	return groupedItems;
}

export function groupRoom(groupedItems: any, listOfObjects: any): Map<string, Room[]> {
	groupedItems = listOfObjects.reduce((acc: Map<string, Room[]>, item: object) => {
		if ("groupValues" in item && "filter" in item) {
			const key = JSON.stringify(item["groupValues"]); // this is the key
			if (!acc.has(key)) {
				acc.set(key, []);
			}
			acc.get(key)?.push(item.filter as Room);
			return acc;
		}
		return acc;

	}, new Map<string, Room[]>());
	return groupedItems;
}

export function checkLists(listA: string[], listB: string[]): boolean {
	for (const elem of listA) {
		if (!listB.includes(elem)) {
			return false;
		}
	}
	return true;
}

export function isIdValid (str: string): string {
	let num = str.indexOf("_");
	return str.slice(0,num);
}

// EFFECTS: return the proper corresponding field for the query field
export function  getFields(keys: string[], section: Section | Room): Array<string|number> {
	let fieldList = new Array<string|number>();
	for (let key of keys) {
		let variable = getField(key, section);
		if (variable !== false) {
			fieldList.push(variable);
		}
	}
	return fieldList;
}

// **CITATION**: https://www.tutorialsteacher.com/typescript/typescript-string#split
// USE: used string documentation to split up the key
// EFFECTS: return the proper corresponding field for the query field
// TODO: it shouldn't allow your to query for a field that is part of room if the dataset isn't of type room
export function  getField(key: string, section: Section | Room): string | number | false{
	let field = key.split("_")[1];
	if(field === "uuid") {						// SKEYS
		return (section as Section).getUUID().toString();
	} else if (field === "id") {
		return (section as Section).getID();
	} else if (field === "title") {
		return (section as Section).getTitle();
	} else if (field === "instructor") {
		return (section as Section).getInstructor();
	} else if (field === "dept") {
		return (section as Section).getDept();
	} else if (field === "fullname") {
		return (section as Room).getFullName();
	} else if (field === "shortname") {
		return (section as Room).getShortName();
	} else if (field === "number") {
		return (section as Room).getNumber();
	} else if (field === "name") {
		return (section as Room).getName();
	} else if (field === "address") {
		return (section as Room).getAddress();
	} else if (field === "type") {
		return (section as Room).getType();
	} else if (field === "furniture") {
		return (section as Room).getFurniture();
	} else if (field === "href") {
		return (section as Room).getHref();
	} else if(field === "year") {				// MKEYS
		return ((section as Section).getYear());
	} else if (field === "avg") {
		return (section as Section).getAvg();
	} else if (field === "pass") {
		return (section as Section).getPass();
	} else if (field === "fail") {
		return (section as Section).getFail();
	} else if (field === "audit") {
		return (section as Section).getAudit();
	} else if (field === "lat") {
		return (section as Room).getLat();
	} else if (field === "lon") {
		return (section as Room).getLon();
	} else if (field === "seats") {
		return (section as Room).getSeats();
	}
	return"";
}

