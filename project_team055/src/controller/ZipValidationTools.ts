import JSZip, {JSZipObject} from "jszip";
import Section from "./Section";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import Room from "./Room";
import {parse} from "parse5";
import {ChildNode, Document, Element} from "parse5/dist/tree-adapters/default";
import {HtmlTools} from "./HtmlTools";

export class ZipValidationTools {
	private readonly htmlTool: HtmlTools;

	constructor() {
		this.htmlTool = new HtmlTools();
	}

	// EFFECTS: returns true if id already exists as a dataset
	public isDuplicate(id: string, datasets: Map<string, Section[] | Room[]>): boolean {
		if (datasets.get(id) !== undefined ) {
			return true;
		}
		return false;
	}

	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (load async)
	// EFFECTS: checks for validity of given DataSet
	// A Valid dataset: is a zip, has a course folder, has at least one valid section in the course folder
	public async isValid(id: string, zip: JSZip, kind: InsightDatasetKind): Promise<boolean> {
		// Loads data in zip into a JSZipObject and then checks if the dataset is valid
		return zip.loadAsync(id, {base64: true}).then(async () => {
			try {
				let val = false;
				if (kind === InsightDatasetKind.Sections) {
					val = await this.isDataSetValidSections(zip);
				} else if (kind === InsightDatasetKind.Rooms) {
					val = await this.isDataSetValidRooms(zip);
				}
				return Promise.resolve(val);
			} catch (e) {
				return Promise.resolve(false);
			}
		}).catch((err: Error) => {
			// **CITATION**: https://piazza.com/class/lc6u8shhhn2dd/post/536
			// USE: used Professor's response from post @536 on piazza to figure out how to handle catching the
			//      error thrown in the case of a non-zip file
			return Promise.reject(new InsightError());	// catches the case when the content is not a zip
		});
	}

	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (used for the folder, forEach, and async methods)
	// **CITATION**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used the fs-extra documentation to Parse and access JSON components
	// EFFECTS: checks for validity of given section
	public async isDataSetValidSections(zip: JSZip): Promise<boolean> {
		try {
			let promiseList: Array<Promise<string>> = [];
			let folderList = zip.folder(/courses/);
			if (folderList.length === 1) {
				zip.folder("courses")?.forEach((relativePath: string, file: JSZipObject) => {
					// convert the JSZipObject to a text file, parse the file, check for section validity then convert JSON
					// form of the section to type Section
					if (file === null) {
						console.log("file was null");
						Promise.reject(new InsightError());
					}
					promiseList.push(file.async("string")); // push the promise to create a text file to a list of promises
				});
				let finishToString = await Promise.all(promiseList); // complete execution of all promises and return as list
				for (const textFile of finishToString) {
					// parse the file, check for section validity
					try {
						let obj = JSON.parse(textFile);
						if (this.isSectionValid(obj)) {
							return Promise.resolve(true);
						}
					} catch(e){
						console.log("caught in is datasetvalid sections ");
					}
				}
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		} catch (e) {
			return Promise.reject(false);
		}
	}

	// **CITATION**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used the fs-extra documentation to figure out how to Parse and access JSON components
	// EFFECTS: tries to find a valid section in course
	// - iterate through all the sections under the 'result' key
	// - if the required headings exist together in one section, return true, else keep iterating
	//   and ultimately return false
	public isSectionValid(obj: any): boolean {
		for (let i = 0; obj.result[i] !== undefined || null; i = i + 1) {
			if (this.sectionHasAllFields(obj, i)) {
				return true;
			}
		}
		return false;
	}

	// **CITATION**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used the fs-extra documentation to figure out how to Parse and access JSON components
	// EFFECTS: checks for validity of given section
	public sectionHasAllFields(obj: any, i: number): boolean {
		let validSection = [obj.result[i], obj.result[i].Audit, obj.result[i].Avg, obj.result[i].Pass,
			obj.result[i].Fail,obj.result[i].Year, obj.result[i].Subject, obj.result[i].id,
			obj.result[i].Professor, obj.result[i].Title, obj.result[i].Course];
		for (let validCheck of validSection) {
			if (validCheck === null) {
				return false;
			}
		}
		return true;
	}

	// *CITATION*: https://stuk.github.io/jszip/documentation/api_jszip/file_name.html
	// USE: used to figure out how to get a file from a JSZip and async method
	// *CITATION*: https://parse5.js.org/interfaces/parse5.ParserOptions.html
	// USE: used for parse implementation details
	private async isDataSetValidRooms(zip: JSZip): Promise<boolean> {
		try {
			// console.log("isValid rooms");
			let promiseList: Array<Promise<boolean>> = [];
			// first get the index.htm file (check if it exists)
			// console.log("zip files :" + zip.files);
			let index = zip.file("index.htm");
			if(index === null) {
				// console.log("index was null");
				return Promise.resolve(false);
			}
			let indexStr = await index.async("string"); // converts the index.htm to a html string
			let indexTree = parse(indexStr);			     // parse the html string to a tree-like structure of type document
			// console.log((indexTree.childNodes).find((elm) =>{
			// 	return elm.nodeName === "html";
			// }));
			// go through the table in the index.htm file and log the names of all the buildings mentioned
			// 1. check that there is a valid table within the html file
			// 2. recurse through the tree of the html until at least one valid room is found
			let indexTable = this.htmlTool.findTable(indexTree as unknown as Element, "b");
			// console.log(indexTable);
			if (!indexTable) {
				return Promise.resolve(false);
			} else {
				// search each row for the building name
				// at each row of the table call the building helper function to see if there is at least one valid row with
				for (const row of indexTable.childNodes) {
					// find the <td> element corresponding to views-field-title and get the building href
					// 'building' -> the child node of the row
					let buildingPath = this.htmlTool.getBuildingPath(zip, row as Element);
					if (buildingPath) {
						// if any of the room attributes we currently have access to don't exist, continue looping
						let address = this.htmlTool.getRoomTool().getBuildingAddress(row as Element);
						if (this.htmlTool.getRoomTool().getBuildingLongName(row as Element) &&
							this.htmlTool.getRoomTool().getBuildingShortName(row as Element) &&
							address) {
							let valid = this.htmlTool.checkBuilding(buildingPath, zip, address);
							promiseList.push(valid);
						}
					}
				}
				// Promise.any will resolve with the value of the first resolved promise in the list, in order words, if there
				// is at least one valid room in the any of the buildings, then it will resolve with true.
				// *CITATION*: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
				// USE: used approach to promise.any
				// TODO: I'm not too sure what the return value is of Promise.reject
				let val = (await Promise.all(promiseList)).find((p) => {
					return p === true;
				});
				// console.log(val);
				if (val === undefined) {
					val = false;
				}
				// console.log("about to return true");
				return Promise.resolve(val);
			}

		} catch(e) {
			throw new InsightError();
		}
	}
}
