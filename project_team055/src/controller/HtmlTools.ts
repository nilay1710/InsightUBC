import {ChildNode, Element} from "parse5/dist/tree-adapters/default";
import JSZip from "jszip";
import {parse} from "parse5";
import * as http from "http";
import {IncomingMessage} from "http";
import {InsightError} from "./IInsightFacade";
import Room from "./Room";
import {RoomHtmlTools} from "./RoomHtmlTools";

export class HtmlTools {
	private readonly roomTool: RoomHtmlTools;

	constructor() {
		this.roomTool = new RoomHtmlTools();
	}

	public getRoomTool() {
		return this.roomTool;
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: uses recursion to explore a tree to find the index table body
	public findTable(index: Element, buildingOrRoom: string): Element | false {
		let table: Element | false = false; // the table that will be returned if it is valid, if there is no valid table found, returns false recurse over the children of the current root element
		if (index.nodeName === "table") {
			let checked = this.checkTable(index, buildingOrRoom, table);
			if (checked !== false){
				return checked;
			}
		}
		// console.log(index);
		if (this.checkParentNodeAttributes(index, "cn")) {
			for (let child of index.childNodes) {
				// console.log(child);
				if (this.checkParentNodeAttributes(child as Element, "na") && child.nodeName === "table") { // if we reach a table, look through if to see if it is the correct building table
					// this.checkTable(child as Element, buildingOrRoom, table); // checks if the table that c
					if (this.checkParentNodeAttributes(child, "cn")) {
						let body = child.childNodes.find((node) => {
							return node.nodeName === "tbody";
						}) as Element;
						if (body !== undefined) { // check the class of the first element of the first row to see if it has the "views-field" class
							if (this.checkParentNodeAttributes(body, "cn")) {
								let row = body.childNodes[1] as Element; // gets the first row
								// if the amount of columns in the table is less than 5, return false
								if (row.childNodes.length < 5 && (buildingOrRoom === "r")) {
									return table;
								}
								if (this.checkAllColumns(row, buildingOrRoom)) {
									if (!table) {
										table = body as Element;
										return table;
									}
								}
							}
						}
					}
				} // TODO: console.time()
				if ((child as Element).childNodes !== undefined) {
					for (const newChild of (child as Element).childNodes) {
						if (newChild !== null) {
							let recursionResult = this.findTable(newChild as Element, buildingOrRoom);
							if (!table) {
								table = recursionResult;
							}
						}
					}
				}
			}
		}
		return table;
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: recieves a table element and searches within the body of the table to see if it is a valid table,
	// returns the table if it is valid
	public checkTable(child: Element, buildingOrRoom: string, table: false | Element): false | Element {
		if (this.checkParentNodeAttributes(child, "cn")) {
			let body = child.childNodes.find((node) => {
				return node.nodeName === "tbody";
			}) as Element;
			if (body !== undefined) { // check the class of the first element of the first row to see if it has the "views-field" class
				if (this.checkParentNodeAttributes(body, "cn")) {
					let row = body.childNodes[1] as Element; // gets the first row
					// if the amount of columns in the table is less than 5, return false
					if (row.childNodes.length < 5 && (buildingOrRoom === "r")) {
						return table;
					}
					if (this.checkAllColumns(row, buildingOrRoom)) {
						if (!table) {
							table = body as Element;
							return table;
						}
					}
				}
			}
		}
		return table;
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: returns true if all the columns for a building table are in the table
	public checkAllColumns(row: Element, buildingOrRoom: string): boolean {
		let columns = new Array<string>();
		for (const col of row.childNodes) {
			let elm = col as Element; // gets the first element in the first row // TODO: CHECK ATTRIBUTES before casting as an element
			// if the elm has attrs, find its class and push the class string to columns list
			if (this.checkParentNodeAttributes(elm, "attr")) {
				let elmClass = elm.attrs.find((attr) => {
					return attr.name === "class";
				});
				if (elmClass !== undefined) {
					columns.push(elmClass.value);
				}
			}
		}
		// checking if we should check for the index.htm building table columns of or the building's room table columns
		if (buildingOrRoom === "b") {
			if (this.validClassForBuildingTable(columns)) {
				return true;
			}
		} else if (buildingOrRoom === "r") {
			if (this.validClassForRoomTable(columns)) {
				return true;
			}
		}
		return false;
	}

	public validClassForBuildingTable(str: string[]): boolean {
		if (str.includes("views-field views-field-field-building-image") &&
			str.includes("views-field views-field-field-building-code") &&
			str.includes("views-field views-field-title") &&
			str.includes("views-field views-field-field-building-address") &&
			str.includes("views-field views-field-nothing")) {
			return true;
		} else {
			return false;
		}
	}

	public validClassForRoomTable(str: string[]): boolean {
		if (str.includes("views-field views-field-field-room-number") &&
			str.includes("views-field views-field-field-room-capacity") &&
			str.includes("views-field views-field-field-room-furniture") &&
			str.includes("views-field views-field-field-room-type") &&
			str.includes("views-field views-field-nothing")) {
			return true;
		} else {
			return false;
		}
	}

	// EFFECTS: checks that the parent nodes has the specified attribute.
	// toCheck 	= "cn" -> check if it has childNodes
	//			= "na" -> check for name
	// 			= "att"	-> check for attributes
	public checkParentNodeAttributes(elm: Element, toCheck: string) {
		let child = "cn";
		let name = "na";
		let attr = "attr";
		switch (toCheck) {
			case child:
				return elm.childNodes !== undefined;
			case name:
				return elm.nodeName !== undefined;
			case attr:
				return elm.attrs !== undefined;
			default:
				return false;
		}
	}

	// *CITATION*: https://stuk.github.io/jszip/documentation/api_jszip/file_name.html
	// USE: used to figure out how to get a file from a JSZip and async method
	// *CITATION*: https://parse5.js.org/interfaces/parse5.ParserOptions.html
	// USE: used for parse implementation details
	// Effects: returns the building table
	public async getBuildingTable(zip: JSZip, filePath: string): Promise<Element | false> { // console.log(filePath.substring(2,filePath.length));
		let building = zip.file(filePath.substring(2, filePath.length)); // console.log(building);
		if (building === null) {
			return false;
		}
		try {
			let buildingStr = await building.async("string"); // converts the <building name>.htm to a html string
			let buildingTree = parse(buildingStr);			     // parse the html string to a tree-like structure of type document
			return this.findTable(buildingTree as unknown as Element, "r");
		} catch (e) {
			return false;
		}
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	public getBuildingPath(zip: JSZip, row: Element): string | false {
		if (row.childNodes === undefined) {
			return false;
		}
		let building = (row as Element).childNodes.find((elm) => {
			elm = elm as Element;
			if (elm.attrs === undefined) {
				return false;
			}
			return elm.attrs.find((att) => {
				return att.name === "class";
			})?.value.includes("views-field-title");
		}); // 'buildingA' -> the <a> child of the <td>
		let buildingA = (building as Element).childNodes.find((elm) => {
			return elm.nodeName === "a";
		}); // 'buildingPath' -> the href attribute of the given building through using the views-field-title cell of the table
		let buildingPath = (buildingA as Element).attrs.find((elm) => {
			return elm.name === "href";
		})?.value;
		if (buildingPath === undefined) {
			return false;
		} else { // console.log(buildingPath);
			return buildingPath;
		}
	}

	// *CITATION*: https://parse5.js.org/interfaces/parse5.ParserOptions.html
	// USE: used for parse implementation details
	// EFFECTS: follows the filePath to the building html file, parses it and then gets all the valid rooms in a building
	public async checkBuilding(filePath: string, zip: JSZip,
							   address: string): Promise<boolean> {
		try {
			let latAndLon = await this.roomTool.geolocation(address);
			let lat: number | false = false;
			let lon: number | false = false;
			if (latAndLon !== false) {
				lat = parseFloat(latAndLon[0]);
				lon = parseFloat(latAndLon[1]); // parseInt returns NaN when it can't successfully parse the number;
			}
			if ((lat && lon) !== false) {
				let promiseList: Array<Promise<boolean | Room>> = [];
				let buildingTable = await this.getBuildingTable(zip, filePath);
				if (!buildingTable) {
					return false;
				} else { // for each row of the building, assess one room to see if it is valid, if it is, return true immediately
					if (!this.checkParentNodeAttributes(buildingTable, "cn")) {
						return false;
					}
					for (const row of buildingTable.childNodes) {
						if (this.checkRoom(row as Element)) {
							return true;
						}
					}
					// // Promise.any will resolve with the value of the first resolved promise in the list, in order words, if there is at least one valid room in any of the buildings, then it will resolve with true.
					// // *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
					// // USE: used approach to promise.any
					// let pList = await Promise.all(promiseList); // return await Promise.any(promiseList) as boolean;
					// for (const p of pList) {
					// 	if (p === true) {// console.log("returning true from building check" + address);
					// 		return true;
					// 	}
					// }// console.log("returning false from building check" + address);
					// return false;
				}
			}
			return false;
		} catch (e) {
			throw new InsightError();
		}
	}

	// EFFECTS: receives a row of the building row table checks if all the relevant room query fields exist, if they do, returns a filled in room object
	public checkRoom(elm: Element, room?: Room): boolean | Room {
		try { // Note: we don't need to check room name because it is a combo of shortname and room number, so if those two exist, the room name exists by default
			let number = this.roomTool.getRoomNumber(elm);
			let seats = this.roomTool.getRoomSeats(elm);
			let type = this.roomTool.getRoomType(elm);
			let furniture = this.roomTool.getRoomFurniture(elm);
			let href = this.roomTool.getRoomHref(elm);
			try {
				if ((number && seats && type
					&& furniture && href) !== false) { // if the room variable exists, that means we should return a room, other return a boolean the boolean return value is for when we need to validate the dataset and the room return value is for when we are data modelling
					if (room !== undefined){
						room.setRoomWithoutLatandLon
						(number as string,seats as number,type as string,furniture as string,href as string);
						return room;
					} else {
						return true;
					}
				}
			} catch (e) {
				return false;
			}
			return false;
		} catch (e) {
			throw new InsightError();
		}
	}
}
