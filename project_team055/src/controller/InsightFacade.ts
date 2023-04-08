import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import Section from "./Section";
import JSZip from "jszip";
import {convertToInsightResultList,convertToInsightResultListNew} from "./DataModellingToolsPartTwo";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
import fs from "fs-extra";
import Query from "./Query";
import {DiskOperations} from "./DiskOperations";
import {QueryEval} from "./QueryEval";
import {ZipValidationTools} from "./ZipValidationTools";
import {DataModellingTools} from "./DataModellingTools";
import {ValidationQuery} from "./ValidationQuery";
import Room from "./Room";

export default class InsightFacade implements IInsightFacade {
	private readonly datasets: Map<string,Section[] | Room[]>;
	private readonly diskOperator: DiskOperations;
	private readonly queryEvaluator: QueryEval;
	private readonly zipValidator: ZipValidationTools;
	private readonly dataModelling: DataModellingTools;
	constructor() {
		this.queryEvaluator = new QueryEval();
		this.zipValidator = new ZipValidationTools();
		this.dataModelling = new DataModellingTools(this.zipValidator, this.queryEvaluator);
		this.diskOperator = new DiskOperations(this.dataModelling);
		this.datasets = this.restore();
	}

	public getDatasets(): Map<string, Section[] | Room[]>{
		return this.datasets;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> { // adding async to the function means you don't need to return a new promise
		// **CITATION**: https://johnkavanagh.co.uk/writing/check-if-a-string-contains-only-whitespace-with-javascript/
		// USE: I used the code snippet from this site to figure out how to detect a string is only
		//      composed of whitespace. The line below "id.trim().length == 0" was sourced from the above site
		// console.time();
		let zip = new JSZip();
		// REJECT CASES:
		// 1) invalid ID [whitespace, underscore, or duplicate]
		// 2) invalid kind
		// 3) duplicate
		if (id.includes("_") || id.trim().length === 0
			|| this.zipValidator.isDuplicate(id, this.datasets)) {
			return Promise.reject(new InsightError("Invalid Dataset - end sections catch 1"));
		}
		let arrLength = 0;
			// 3) invalid content
		return this.zipValidator.isValid(content, zip, kind).then((bool: boolean) => {
			// console.log("back from isValid: " + bool);
			if (!bool) {
				throw new InsightError("Invalid Dataset - bool");
			}
		}).catch((e: Error) => {
			return Promise.reject(new InsightError("Invalid Dataset - end sections catch 1"));
		}).then(() => { // RESOLVE
			// console.log("about to data model");
			return this.dataModelling.convertToDataModel(zip, kind); // convert to DataModel
		}).then((arr: Section[] | Room[]) => { // adds dataset/section list pair as a key/value pair in dataset map
			// console.log(arr);
			arrLength = arr.length;
			// console.timeLog();
			return Promise.resolve(this.setNewDataset(arr, id));
		}).then(async (dArr: string[]) => {
			try {
				let bool = await this.diskOperator.saveToDisk(id, this.datasets.get(id) as Section[] | Room[],
					arrLength, kind);
				if (bool) {
					// console.log("returning");
					return Promise.resolve(dArr);
				} else {
					// console.log("returning");
					let arr = new Array<string>();
					return Promise.resolve(arr);
				}
			} catch(e) {
				console.log("throwing here");
				return Promise.reject(new InsightError("Invalid Dataset - end sections catch 1"));
			}
		}).catch((err: Error) => {
			return Promise.reject(new InsightError("Invalid Dataset - end sections catch"));
		});
		// return Promise.reject(new InsightError("Invalid Dataset - not of kind rooms or section"));
	}

	// EFFECTS: sets a new dataset in the datasets map and returns a list of all the current datasets
	public setNewDataset(list: Room[] | Section[], id: string): string[] {
		this.datasets.set(id, list);
		// **CITATION**: https://www.javatpoint.com/typescript-map
		// USE: used the map iteration example to iterate over the dataset keys
		let dArr = new Array<string>();
		for (let key of this.datasets.keys()) {
			dArr.push(key);  // add all the keys to the array of currently added datasets
		}
		return dArr;
	}

	// **CITATION**: https://github.com/jprichardson/node-fs-extra/blob/master/docs/remove-sync.md
	// USE: used to learn how to remove JSON files from disk synchronously
	// **CITATION**: https://www.geeksforgeeks.org/node-js-fs-rmsync-method/?ref=gcse
	// USE: used to figure out the rmSync file removal method
	public async removeDataset(id: string): Promise<string> {
		// **CITATION**: https://johnkavanagh.co.uk/writing/check-if-a-string-contains-only-whitespace-with-javascript/
		// USE: I used the code snippet from this site to figure out how to detect a string is only
		//      composed of whitespace. The line below "id.trim().length == 0" was sourced from the above site
		// reject if id contains only whitespace or has an underscore
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError();
		}
		// reject with NotFoundError if it tries to remove a dataset that hasn't been added yet
		if (!this.datasets.has(id)) {
			throw new NotFoundError();
		}
		// remove from cached memory
		// console.log(this.datasets.keys());
		this.datasets.delete(id);
		// console.log(this.datasets.keys());
		// remove from disk
		fs.rmSync("./data/" + id + ".json");
		return Promise.resolve(id);
	}

	// **CITATION**: https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
	// USE: used to figure out typeof functionality
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// console.log("in perform query");
		try {
			// get list of current datasets
			let listInsightDset = await this.listDatasets();
			let currDSets: string[] = new Array<string>();
			for(let d of listInsightDset) {
				currDSets.push(d.id);
			}
			let validateQuery = new ValidationQuery(query as string, currDSets);		// create new validate query instance
			// console.time("ValidateQ");
			let maybeQuery: Query | false = validateQuery.checkInput();				// check the validity of query (should return either false or a new Query object if in put is valid)
			// console.timeEnd("ValidateQ");
			if (maybeQuery === false) {
				return Promise.reject(new InsightError("Invalid Query"));			// REJECT : invalid query
			}
			let queryObj = maybeQuery as Query;
			// load sections from disk if the sections aren't already loaded from disk
			let SectionOrRoom;
			SectionOrRoom = this.datasets.get(queryObj.id) as Section[] | Room[];
			// console.log(SectionOrRoom);
			// console.time("Filter");
			let filteredList = this.queryEvaluator.filterList(SectionOrRoom, queryObj);  // filters sections according to query
			// console.timeEnd("Filter");
			if(queryObj.getTransformations() === undefined && filteredList.length > 5000) {
				return Promise.reject(new ResultTooLargeError("too many results"));
			}
			if(!filteredList) {
				return Promise.reject(new InsightError("Section list undefined!"));
			}
			let transform;
			let results;
			// convert to a list of InsightResults
			if(queryObj.getTransformations() !== undefined) {
				transform = this.dataModelling.transform(filteredList, queryObj);
				let list = transform;  // list is going to have: [["310", 70.4], ["210", 91.8]]
				if (list.length > 5000) {
					return Promise.reject(new ResultTooLargeError("too many results"));
				}
				results = convertToInsightResultListNew(list, queryObj);
			} else {
				results =  convertToInsightResultList(filteredList,queryObj);
			}
			// order the list if order is specified in query
			if(queryObj.getOptions().getSort() !== undefined) {
				// console.log ("ordering");
				results = this.dataModelling.orderResults(results,queryObj);
				// console.log ("ordering");
			}
			// console.log("returning from perform");
			return Promise.resolve(results);
		} catch(e) {
			// console.log("throwing error from perform -5");
			return Promise.reject(new InsightError("e as string"));
		}
	}

	// **CITATION**: https://www.typescriptlang.org/docs/handbook/interfaces.html
	// USE: to figure out how to use the interface
	public async listDatasets(): Promise<InsightDataset[]> {
		let dSetList: InsightDataset[] = [];
		// **CITATION**: https://www.javatpoint.com/typescript-map
		// USE: used the map iteration example to iterate over the dataset keys
		// **CITATION**: https://stackoverflow.com/questions/54496398/typescript-type-string-undefined-is-not-assignable-to-type-string
		// USE: used to fix type error "as number" insertion below
		// **CITATION**: https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
		// USE: used to figure out typeof functionality
		for (let key of this.datasets.keys()) {
			// figure out which kind of dataset
			let kind: InsightDatasetKind;
			let one = this.datasets.get(key);
			if (one) {
				// console.log(Object.keys(one[0]));
				if (Object.keys(one[0]).includes("uuid")) {
					kind = InsightDatasetKind.Sections;
				} else {
					kind = InsightDatasetKind.Rooms;
				}
				let rows = (this.datasets.get(key))?.length;
				if (rows) {
					dSetList.push({id: key, kind: kind, numRows: rows});
				}
			}
		}
		// TODO: save the insightDataset into memory
		// console.log(dSetList);
		return Promise.resolve(dSetList as InsightDataset[]);
	}

	// ** CITATION **: https://www.geeksforgeeks.org/node-js-fs-readdirsync-method/
	// USE: used to figure out the fs.readdirSync function
	// ** CITATION **: https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
	// USE: used to figure out how to iterate over the result of fs.readdirSync
	// **CITATION**: https://www.tutorialsteacher.com/typescript/typescript-string#split
	// USE: used string documentation to split up dataset files names
	// **CITATION**: https://github.com/jprichardson/node-fs-extra
	// USE: used the fs-extra documentation to make the directory if it didn't already exist and to read JSON files from disk
	// **CITATION: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used to figure out how to access JSON Components
	// EFFECTS: restores an insight faced by loading all base 64 zips and row numbers from disk
	public restore(): Map<string, Section[] | Room[]>{
		fs.ensureDirSync("./data/");
		let listOfDatasets = fs.readdirSync("./data/");
		let nameList = new Array<string>();
		let dSets:  Map<string, Section[] | Room[]>;
		for (const dataset of listOfDatasets) {		// gets the names of the all the datasets in the directors (split from the ".json" part)
			let name = dataset.split(".json")[0];
			nameList.push(name);
		}
		dSets = this.diskOperator.loadFromDisk(nameList);
		return dSets;

	}
}

