import Query, {Apply, Filter} from "./Query";
import JSZip, {JSZipObject} from "jszip";
import Section from "./Section";
import {InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import {ZipValidationTools} from "./ZipValidationTools";
import {QueryEval} from "./QueryEval";
import Room from "./Room";
import {HtmlTools} from "./HtmlTools";
import {parse} from "parse5";
import {Element} from "parse5/dist/tree-adapters/default";
import {applyFunction, checkExist, getField, getValue, groupRoom, groupSection} from "./DataModellingToolsPartTwo";

export class DataModellingTools {
	private readonly zipValidator: ZipValidationTools;
	private readonly queryEvaluator: QueryEval;
	private readonly htmlHelper: HtmlTools;

	constructor(zipValidator: ZipValidationTools, queryEval: QueryEval) {
		this.zipValidator = zipValidator;
		this.queryEvaluator = queryEval;
		this.htmlHelper = new HtmlTools();
	}

	public async convertToDataModel(zip: JSZip, kind: InsightDatasetKind): Promise<Section[]|Room[]> {
		if (kind === InsightDatasetKind.Sections) {
			return this.convertToDataModelSections(zip);
		} else {
			return this.convertToDataModelRooms(zip);
		}
	}

	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (used for the folder, forEach & async)
	// **CITATION: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used for JSON Parse method and to figure out how to access JSON Components
	// EFFECTS: converts all VALID sections within a courses file to a list of sections by parsing the data
	public async convertToDataModelSections(zip: JSZip): Promise<Section[]> {
		try {
			// console.time("modelSections");
			let sectionList: Section[];
			sectionList = new Array<Section>();
			let promiseList: Array<Promise<string>> = [];
			zip.folder("courses")?.forEach((relativePath: string, file: JSZipObject) => { // convert the JSZipObject to a text file, parse the file, check for section validity then convert JSON form of the section to type Section
				if (file === null) {
					return Promise.reject(new InsightError());
				}
				promiseList.push(file.async("string")); // push the promise to create a text file to a list of promises
			});
			let finishToString = await Promise.all(promiseList); // complete execution of all promises and return as list
			for (const textFile of finishToString) { // parse the file, check for section validity then convert JSON form of the section to type Section
				// try-catch was put in-case one of the files can't be parsed as at all (there may still be other valid sections that need to be converted)
				try {
					let obj = JSON.parse(textFile);
					for (let i = 0; obj.result[i] !== undefined; i++) {
						if (this.zipValidator.sectionHasAllFields(obj, i)) {
							if(obj.result[i].Section === "overall") {
								let s = new Section(obj.result[i].Subject, obj.result[i].Professor, obj.result[i].Title,
									obj.result[i].Course, obj.result[i].id, 1900 , obj.result[i].Avg,
									obj.result[i].Pass, obj.result[i].Fail, obj.result[i].Audit);
								sectionList.push(s);
							} else {
								let s = new Section(obj.result[i].Subject.toString(),
									obj.result[i].Professor.toString(), obj.result[i].Title.toString(),
									obj.result[i].Course.toString(), obj.result[i].id.toString(),
									parseInt(obj.result[i].Year, 10), obj.result[i].Avg,
									obj.result[i].Pass, obj.result[i].Fail,
									obj.result[i].Audit);
								sectionList.push(s);
							}
						}
					}
				} catch(e) {
					// console.log("empty");
				}
			}
			// console.timeEnd("modelSections");
			return (sectionList);
		} catch (e) {
			throw new InsightError();
		}
	}

	// *CITATION*: https://stuk.github.io/jszip/documentation/api_jszip/file_name.html
	// USE: used to figure out how to get a file from a JSZip and async method
	// *CITATION*: https://parse5.js.org/interfaces/parse5.ParserOptions.html
	// USE: used for parse implementation details
	public async convertToDataModelRooms(zip: JSZip): Promise<Room[]> {
		try {
			// console.time("modelRoomMain");
			let rooms = new Array<Room>();
			let promiseList: Array<Promise<Room[] | boolean>> = [];
			// first get the index.htm file (check if it exists)
			let index = zip.file("index.htm");
			if(index === null) {
				// console.log("index was null in data modelling");
				return Promise.reject();
			}
			let indexStr = await index.async("string"); // converts the index.htm to a html string
			let indexTree = parse(indexStr);			     // parse the html string to a tree-like structure of type document
			// go through the table in the index.htm file and log the names of all the buildings mentioned
			// 1. check that there is a valid table within the html file
			// 2. recurse through the tree of the html until at least one valid room is found
			// console.time("findTable");
			let indexTable = this.htmlHelper.findTable(indexTree as unknown as Element, "b");
			// console.timeEnd("findTable");
			if (!indexTable) {
				return Promise.reject();
			} else {
				// search each row for the building name
				// at each row of the table call the building helper function to see if there is at least one valid room
				for (const row of indexTable.childNodes) {
					// console.log("data modelling - in indexTable");
					let buildingPath = this.htmlHelper.getBuildingPath(zip, row as Element);
					if (buildingPath) {
						let promise = this.lookIntoBuilding(buildingPath, row as Element, zip).then((buildingRooms) => {
							// console.log(buildingRooms);
							if (buildingRooms.length !== 0 ) {
								return buildingRooms; // add all the rooms from of the building to the large list of rooms;
							} else {
								return false;
							}
						}).catch((err) => {
							return false;
						});
						promiseList.push(promise);
					}
				}
				let unfilteredList = await Promise.all(promiseList);
				// console.log(unfilteredList);
				// for all the non-false list in the unfilteredList, concatenate it to the current list of rooms
				for (const roomList of unfilteredList) {
					if (roomList !== false) {
						for(const room of (roomList as Room[])) {
							rooms.push(room);
						}
					}
				}
				// console.timeEnd("modelRoomMain");
				return rooms;
			}
		} catch(e) {
			throw new InsightError();
		}
	}

	public async lookIntoBuilding(path: string, bldg: Element, zip: JSZip): Promise<Room[]> {
		// console.time("modelRoom");
		let promiseList: Array<Promise<Room | boolean>> = [];
		let rooms = new Array<Room>();
		try {
			let longName = this.htmlHelper.getRoomTool().getBuildingLongName(bldg as Element);
			let shortName = this.htmlHelper.getRoomTool().getBuildingShortName(bldg as Element);
			let address = this.htmlHelper.getRoomTool().getBuildingAddress(bldg as Element);
			let latAndLon = await this.htmlHelper.getRoomTool().geolocation(address);
			let lat: number | false = false;
			let lon: number | false = false;
			if (latAndLon !== false) {
				lat = parseFloat(latAndLon[0]);
				lon = parseFloat(latAndLon[1]); // parseInt returns NaN when it can't successfully parse the number;
			}
			// if any of the room attributes we currently have access to don't exist, return an empty list;
			if ((longName && shortName && address && lat && lon) !== false) {
				let buildingTable = await this.htmlHelper.getBuildingTable(zip, path);
				if (!buildingTable) {
					return Promise.reject();
				} else {// for each row of the building, assess one room to see if it is valid, if it is, return true immediately
					for (const row of buildingTable.childNodes) { // console.log("data-modelling in building table"); // for each potential room instantiate a new room
						let room = new Room();
						room.setBuilding(longName as string, shortName as string,
							address as string, lat as number, lon as number);
						let potentialRoom = this.htmlHelper.checkRoom(row as Element, room);
						if (potentialRoom !== false) {
							room.removeSpace();
							rooms.push(potentialRoom as Room);
						}
					}
					return rooms;
				}
			}
			return rooms;
		} catch(e) { // console.log("error caught in datamodelling");
		}
		// console.timeEnd("modelRoom");
		return rooms;
	}

	// EFFECTS: convert the list of sections to InsightResults
	public transform (filterList: any, queryObj: Query) {
		let group = queryObj.getTransformations()?.getGroup() as string[];
		let apply = queryObj.getTransformations()?.getApply();
		if (filterList[0] instanceof Section) {
			filterList = filterList as Section[];
		} else {
			filterList = filterList as Room[];
		}
		let listOfObjects = [];  // new list of objects same size as filter list
		for (const i in filterList) {
			let groupValues: {[key: string]: any} = {};   // groupValues object
			for (const j of group) {
				groupValues[j] = (getField(j, filterList[i] as Section | Room));
			}
			let newObject: {[key: string]: any} = {};
			newObject["filter"] = filterList[i];
			newObject["groupValues"] = groupValues;
			listOfObjects.push(newObject);
		}
		let groupedItems;
		if (filterList[0] instanceof Section) {
			groupedItems = groupSection(groupedItems, listOfObjects);
		} else {
			groupedItems = groupRoom(groupedItems, listOfObjects);
		}
		let listResultKey = [];
		let listValues = [];
		for (const i of groupedItems.keys()) {
			let smallList = [];
			let obj = JSON.parse(i);
			for (let key in obj) {
				smallList.push(obj[key]);
			}
			listResultKey.push(smallList);
			listValues.push(groupedItems.get(i));
		}
		if (apply === undefined || apply.length === 0) {
			return listResultKey;
		} else {
			for (const i in apply) {
				let applyToken = apply[i].getApplyToken();  // MAX, MIN, AVG...
				let key = apply[i].getKey();  // the thing that you want max or min of
				for (const j in listResultKey) {
					let result = applyFunction(listValues[j] as Section[] | Room[], applyToken, key);
					listResultKey[j].push(result);
				}
			}
			return listResultKey;
		}
	}
	// **CITATION**: https://www.typescriptlang.org/docs/handbook/interfaces.html
	// **CITATION**: - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
	//				 - https://www.tutorialspoint.com/typescript/typescript_array_sort.htm
	// USE: used to figure out the format of the sort "compare" function below
	// EFFECTS: order the insight results in ascending order according to the key

	public  orderResults(results: InsightResult[], q: Query): InsightResult[] {
		let orderKey: string;
		let dir: string;
		let keys: string[];
		if (q.getOptions().getSort()?.getOrder() !== undefined) {
			orderKey = q.getOptions().getSort()?.getOrder() as string; // ex. ubc_avg
			if (orderKey === undefined) {
				return results;
			} // let orderField = this.getField(orderKey as string);
			results.sort((firstElm: InsightResult, secondElm: InsightResult) => { // [firstElm[orderKey as string] and secondElm[orderKey as string] should both return a number or both return a string
				let temp = [firstElm[orderKey as string] , secondElm[orderKey as string]]; // instantiate a sublist with two items to compare based on order field
				temp.sort();
				if(temp[0] !== firstElm[orderKey as string]) { 		// this means the order was changed by calling sort before this
					return 1;								// returning a positive indicates to sort 'a' after 'b'
				} else {
					return -1;								// returning a negative indicates to sort 'a' before 'b'
				}
			});
		} else if (q.getOptions().getSort()?.getDirection() !== undefined &&
			q.getOptions().getSort()?.getKeys() !== undefined) {
			// console.time("sort");
			dir = q.getOptions().getSort()?.getDirection() as string;
			keys = q.getOptions().getSort()?.getKeys() as string[];
			let a = 1;
			if (dir === "DOWN") {
				a = -1;
			}
			results.sort((firstElm: InsightResult, secondElm: InsightResult) => {
				let n = 0;
				while (n < keys.length) {
					let temp = [firstElm[keys[n] as string] , secondElm[keys[n] as string]]; // [108,56] // let tempNew = temp;
					temp.sort();  // [56, 108]
					if (temp[0] !== temp[1] && temp[0] !== firstElm[keys[n] as string]) {
						return a;
					} else if (temp[0] !== temp[1] && temp[0] === firstElm[keys[n] as string]) {
						return -a;
					} else if (temp[0] === temp[1]) {
						n = n + 1;
					} else {
						break;
					}
				}
				return 0;
			});
		}
		// console.timeEnd("sort");
		return results;
	}
}
