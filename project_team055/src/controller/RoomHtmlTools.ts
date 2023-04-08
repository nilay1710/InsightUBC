import {ChildNode, Element} from "parse5/dist/tree-adapters/default";
import JSZip from "jszip";
import {parse} from "parse5";
import * as http from "http";
import {IncomingMessage} from "http";
import {InsightError} from "./IInsightFacade";
import Room from "./Room";

export class RoomHtmlTools {

	constructor() {
		//
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: receives an element in the form of a parsed html row in an index table, returns the building's full name
	public getBuildingLongName(row: Element): string | false{
		// find the <td> component in the row whose class includes "views-field-title"
		let building = this.getRowElm(row, "views-field-title");
		// 'buildingA' -> the <a> child of the <td>
		if ((building as Element).childNodes === undefined) {
			return false;
		}
		let buildingA = (building as Element).childNodes.find((elm) => {
			return elm.nodeName === "a";
		});
		// KeyValPair in helper below will be of type [string, string] => [value, buildingName]
		return this.getTextField(buildingA as Element);
	}

	// EFFECTS: receives an element in the form of a parsed html row in an index table, returns the building's short name
	public getBuildingShortName(row: Element): string | false{
		// find the <td> component in the row whose class includes "views-field-title"
		let building = this.getRowElm(row, "views-field-field-building-code");
		// KeyValPair in helper below will be of type [string, string] => [value, buildingShortName]
		return this.getTextField(building as Element);
	}

	// EFFECTS: receives an element in the form of a parsed html row in an index table, returns the building's short name
	public getBuildingAddress(row: Element): string | false{
		// find the <td> component in the row whose class includes views-field-field-building-address
		let building = this.getRowElm(row, "views-field-field-building-address");
		// KeyValPair in helper below will be of type [string, string] => [value, Address]
		return this.getTextField(building as Element);
	}

	// public getLatandLon(address: string | false, name: string | false) {
	// 	let latAndLon = this.geolocation(address, name);
	// }

	// TODO
	// **CITATION**: https://www.educative.io/answers/what-is-the-httpsget-method-in-node
	// USE: used to inform http.get implementation
	// EFFECTS: if geolocation is successful, returns an array of strings with lat and lon
	public async geolocation(address: string | false): Promise<string[] | false>{
		let encodedAddr = encodeURIComponent(address);
		let goto = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team055/" + encodedAddr;
		// **CITATION**: https://nodejs.org/api/http.html#httpgeturl-options-callback
		// USE: based http.get code snippet below on the example from this site
		return new Promise <string[] | false> ((resolve, reject) =>  {
			http.get(goto, (response: IncomingMessage) => {
				let data = "";
				// ".on" adds a listener
				// 1. builds the data on "data" listening events
				// 2. retrieves the built data on the "end" listening event
				response.on("data", (c) => {
					data += c;
				});
				response.on("end", () => {
					try{ // parse the collected data and check if the error field exists, if it does then resolve with false else we can confirm that lat and lon exist (in which case we can return a string with lat and lon)
						// console.log("in latlon try-catch");
						let parsed = JSON.parse(data);
						if (parsed.error === undefined) {
							let arr = new Array<string>();
							arr.push(parsed.lat);
							arr.push(parsed.lon);
							// console.log(arr);
							resolve(arr);
						} else {
							// console.log("lat lon error");
							resolve(false);
						}
					} catch(e) {
						// console.log("lat lon error - 2");
						resolve(false);
					}
				});
			}).on("error", (e) => {
				// console.log(e + "-" + encodedAddr);
				resolve(false);
			});
		});
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: receives an element in the form of a parsed html row in a building room table, returns the room's number
	public getRoomNumber(row: Element): string | false{
		let buildingNum = this.getRowElm(row, "views-field-field-room-number"); // find the <td> component in the row whose class includes views-field-field-building-room-number
		if ((buildingNum as Element).childNodes === undefined) {
			return false;
		}
		let buildingA = (buildingNum as Element).childNodes.find((elm) => { // 'buildingA' -> the <a> child of the <td>
			return elm.nodeName === "a";
		});
		return this.getTextField(buildingA as Element); // KeyValPair in helper below will be of type [string, string] => [value, buildingNumber]
	}

	// **CITATION**: https://www.geeksforgeeks.org/how-to-convert-string-to-number-in-typescript/
	// USE: used for parsing a string into an int
	// EFFECTS: receives an element in the form of a parsed html row in a building room table, returns the room's number
	public getRoomSeats(row: Element): number | false{ // find the <td> component in the row whose class includes views-field-field-building-address
		let building = this.getRowElm(row, "views-field-field-room-capacity");
		let seats = this.getTextField(building as Element);
		if (seats !== false) { // KeyValPair in helper below will be of type [string, string] => [value, Address]
			let parsed =  parseInt(seats, 10); // radix indicates the number system base
			if (!isNaN(parsed)) {
				return parsed;
			} else{
				return false;
			}
		} else {
			return seats;
		}
	}

	// EFFECTS: receives an element in the form of a parsed html row in a building room table, returns the room's furniture details
	public getRoomFurniture(row: Element): string | false{ // find the <td> component in the row whose class includes views-field-field-building-room-furniture
		let building = this.getRowElm(row, "views-field-field-room-furniture"); // KeyValPair in helper below will be of type [string, string] => [value, Address]
		return this.getTextField(building as Element);
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	// EFFECTS: receives an element in the form of a parsed html row in a building room table, returns the room's href for more info
	public getRoomHref(row: Element): string | false{ // find the <td> component in the row whose class includes views-field-field-building-room-furniture
		let buildingNum = this.getRowElm(row, "views-field-field-room-number");
		// check for childNodes
		if ((buildingNum as Element).childNodes === undefined) {
			return false;
		}
		let buildingA = (buildingNum as Element).childNodes.find((elm) => { // KeyValPair in helper below will be of type [string, string] => [value, href]
			return elm.nodeName === "a";
		});
		// check for buildingNum
		if ((buildingNum as Element).attrs === undefined) {
			return false;
		}
		let href = (buildingA as Element).attrs.find((att) => {
			return att.name === "href";
		})?.value;
		if (href === undefined) {
			return false;
		} else {
			return href;
		}
	}

	// EFFECTS: receives an element in the form of a parsed html row in a building room table, returns the room's type
	public getRoomType(row: Element): string | false{ // find the <td> component in the row whose class includes views-field-field-building-room-furniture
		let buildingType = this.getRowElm(row, "views-field-field-room-type");
		return this.getTextField(buildingType as Element); // KeyValPair in helper below will be of type [string, string] => [value, Address]
	}

	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	public getRowElm(row: Element, str: string): ChildNode | false { // find the <td> component in the row whose class includes views-field-field-building-address
		if ((row as Element).childNodes === undefined) {
			return false;
		}
		let building = row.childNodes.find((elm) => {
			elm = elm as Element;
			if (elm.attrs === undefined) {
				return false;
			}
			return elm.attrs.find((att)=> {
				return att.name === "class";
			})?.value.includes(str);
		});
		if (!building) {
			return false;
		}
		return building;
	}

	// **CITATION**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
	// USE: used to figure Object attributes and how to use them
	// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties
	// USE: used for Find implementation details
	public getTextField(htmlElm: Element): string | false {
		if ((htmlElm as Element).childNodes === undefined) {
			return false;
		}
		if ((htmlElm as Element).childNodes.length === 0) {
			return " ";
		}
		let buildingKeyValPair = Object.entries((htmlElm as Element).childNodes[0])
			.find((valuePair: [string, string]) => {
				return valuePair[0] === "value";
			}); // get the second item in the list and that will be the attr of the room we are looking for
		let addr: string | false;
		if (buildingKeyValPair) {
			addr = buildingKeyValPair[1];
			addr = this.removeExtraneousString(addr as string);
		} else {
			addr = " ";
		}
		return addr;
	}

	// CITATION: https://www.tutorialspoint.com/typescript/typescript_strings.htm
	// USE: used for string operations (concat, split)
	// **CITATION**: https://johnkavanagh.co.uk/writing/check-if-a-string-contains-only-whitespace-with-javascript/
	// USE: used for string trim() method
	// EFFECTS: removes extraneous spaces and \n in a string
	public removeExtraneousString(str: string): string {
		if (str.includes("\n")) {
			let sArr = str.split("\n,"); // splits the string into an array of strings "\n" as the separator
			// console.log("sArr:" + sArr);
			let newStr = sArr[0]; // first in list of substrings
			for (let i = 1; i < (sArr.length - 1) ; i++) { // concatenate all the substrings together
				newStr = newStr.concat(sArr[i]);
			}
			str = newStr.trim();
			if(str.length === 0) {
				str = " "; // return an empty string so that this doesn't trigger any false biconditionals when checking if the room has all fields
			}
			// console.log("address:" + str);
			return str;
		} else {
			str.trim();
			if(str.length === 0) {
				str = " ";
			}
			return str;
		}
	}
}
