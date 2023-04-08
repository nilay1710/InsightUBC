import Query, {
	MComparison, Negation, SComparison, Filter, LogicComparison, Body, Options, Transformations, Sort, Apply
} from "./Query";
import {checkLists, isEmpty, isIdValid} from "./DataModellingToolsPartTwo";

let mfield = new Set<string>(["avg" , "pass" , "fail" , "audit" , "year", "lat","lon","seats"]);
let sfield = new Set<string>(["dept" , "id" , "instructor" , "title" , "uuid",
	"fullname","shortname","number","name","address","type","furniture","href"]);
let appyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
export class ValidationQuery{
	private keyList: string[] = []; // list of keys in the form this.id_(mfield | sfield)
	private columnList: string[] = [];
	private readonly userInput: unknown;
	private curr_dSets: string[];
	private id: string;
	private applyKeys: string[] = []; // to ensure that each apply object has different applyKeys.
	constructor(i: unknown, curr_dSets: string[]) {
		this.userInput = i;
		this.curr_dSets = curr_dSets;
		this.id = "";
	}

	public checkInput(): false | Query { // **CITATION**: https://medium.com/@vinhle95/the-unknown-type-in-typescript-939ec261294b // USE: I used an example code from this page to validate the input to perform query which is of type unknown.
		if (typeof this.userInput === "object" && this.userInput != null && "WHERE" in this.userInput &&
			"OPTIONS" in this.userInput) {
			let filterCheck = this.checkFilter(this.userInput.WHERE as object);  // check filter
			let optionsCheck: Options |false;
			if (filterCheck !== false && this.id !== undefined) {
				if ("TRANSFORMATIONS" in this.userInput) {
					optionsCheck = this.checkOptions(this.userInput.OPTIONS as object, true,
						this.userInput.TRANSFORMATIONS as unknown as object);
				} else {
					optionsCheck = this.checkOptions(this.userInput.OPTIONS as object, false);
				}
			} else {
				return false;
			}
			if (optionsCheck !== false) {
				let columns: string[] = optionsCheck.getColumns();
				let newBody = new Body(filterCheck as Filter);
				if ("TRANSFORMATIONS" in this.userInput) {
					let transformationCheck = this.checkTransformations(this.userInput.TRANSFORMATIONS as object,
						columns);
					if (transformationCheck === false) {
						return false;
					} else {
						let newQuery = new Query(this.id, newBody, optionsCheck as Options, transformationCheck);
						return newQuery;
					}
				} else {
					return new Query(this.id, newBody, optionsCheck as Options);
				}
			} else {
				return false;
			}
		}
		return false;
	}

	private checkFilter(filter: object): Filter | false {
		if (isEmpty(filter)) {
			return new Filter("", null);
		} else {
			let type = Object.keys(filter)[0];
			if(type === "AND" || type === "OR") {
				return this.checkLOGICCOMPARISON(filter);
			} else if (type === "GT" || type === "LT" || type === "EQ") {
				return this.checkMCOMPARISON(filter);
			} else if (type === "IS") {
				return this.checkSCOMPARISON(filter);
			} else if (type === "NOT") {
				return this.checkNEGATION(filter);
			}
			return false;
		}
	}

	private addToKeyList(): void {
		for(const item of mfield.values()) {
			this.keyList.push(this.id + "_" + item);
		}
		for(const item of sfield.values()) {
			this.keyList.push(this.id + "_" + item);
		}
	}

	private checkLOGICCOMPARISON(logicComparison: object): Filter | false {
		let logic: string = Object.keys(logicComparison)[0];
		let filterList: object[] = Object.values(logicComparison)[0];
		let list: Filter[] = [];
		const checkEach = (newFilter: object[]) => {
			for (const n of filterList) {
				let checkFilterResult = this.checkFilter(n);
				if (checkFilterResult === false ) {
					return false;
				} else if (typeof checkFilterResult === "object" && (checkFilterResult as Filter).getValue() === null) {
					return false;
				}
				list.push(checkFilterResult as Filter);
			}
			return list;
		};
		// EFFECTS: checks whether all the filters in the filter list are non-null
		const checkValidFilterList = (fl: object[]): boolean => {
			for (const filter of fl) {
				if (filter == null || undefined) {
					return false;
				}
			}
			return true;
		};
		if ((logic !== "AND" && logic !== "OR") || (filterList.length < 1) || (!checkValidFilterList(filterList))) {
			return false;
		} else if (checkEach(filterList) === false) {
			return false;
		} else {
			return new LogicComparison(logic, list as Filter[]); // if it gets to this part in the evaluation, the 'list' variable has already been filled
		}
	}

	private checkMCOMPARISON(mcomparison: object): Filter | false{
		let mcomparator: string = Object.keys(mcomparison)[0];
		let mkey: string = Object.keys(Object.values(mcomparison)[0])[0];
		let number = Object.values(Object.values(mcomparison)[0])[0];
		if (this.id === "") {
			this.id = isIdValid(mkey);
			this.addToKeyList();
			if (!this.curr_dSets.includes(this.id)){
				return false;
			}
		}
		if (mcomparator !== "LT" && mcomparator !== "GT" && mcomparator !== "EQ") {
			return false;
		} else if ((!checkLists([mkey], this.keyList.slice(0, mfield.size))) || (typeof number !== "number")) {
			return false;
		}
		return new MComparison(mcomparator, mkey, number, this.id);
	}

	private checkSCOMPARISON(sComparison: object): Filter | false {
		let scomparison: string = Object.keys(sComparison)[0];
		let skey: string = Object.keys(Object.values(sComparison)[0])[0];
		let inputstring = Object.values(Object.values(sComparison)[0])[0];
		if (this.id === "") {
			this.id = isIdValid(skey);
			this.addToKeyList();
			if (!this.curr_dSets.includes(this.id)){
				return false;
			}
		} else if (this.id !== isIdValid(skey)) { // checks if the id in the SComp matches this.id if this.id
			return false;
		}
		if (scomparison !== "IS") {
			return false;
		} else if (!checkLists([skey], this.keyList.slice(mfield.size, -1))) {
			return false;
		} else if (typeof inputstring !== "string" || inputstring.slice(1,-1).includes("*")) {
			return false;
		} else {
			return new SComparison(skey,inputstring, this.id);
		}
	}

	private checkNEGATION(negation: object): Filter | false {
		let neg: string = Object.keys(negation)[0];
		let checkFilterResult = this.checkFilter(Object.values(negation)[0]);
		if (neg !== "NOT") {
			return false;
		} else if(checkFilterResult === false) {
			return false;
		} else {
			return new Negation(checkFilterResult as Filter);
		}
	}

	private checkColumns (list: string[], set: Set<string>, applyKeys: string[]): boolean{ // true if no errors
		for (const n of list) {
			if (!(this.keyList.concat(applyKeys)).includes(n) || set.has(n)) {
				return false;
			}
			set.add(n);
		}
		return true;
	};

	private checkOptions(options: object, existTransformation: boolean, transformation?: object): Options | false{
		let column = Object.keys(options)[0]; // "COLUMNS"
		let columns: string[] = Object.values(options)[0]; // [keys]
		this.columnList = columns;
		let newSet = new Set<string> ([]);
		let order = null;
		let orderString;
		if (this.id === "") {
			if (existTransformation && (transformation !== undefined)) { // if there are transformations present in the query, get the id from GROUP
				this.id = isIdValid(Object.values(transformation)[0][0]);
			} else { // get id normally
				this.id = isIdValid(columns[0]);
			}
			this.addToKeyList();
			if (!this.curr_dSets.includes(this.id)){
				return false;
			}
		}
		if (Object.keys(options).length === 2) {
			orderString = Object.keys(options)[1];
			order = Object.values(options)[1]; // order is string or object
		}
		if (column !== "COLUMNS" || (columns.length < 1)  || (order !== null &&
			orderString !== "ORDER")) {
			return false;
		} else if (!existTransformation && (!this.checkColumns(columns, newSet, []))) {
			return false;
		} else if (existTransformation) {
			for (const i of columns) {
				newSet.add(i);
			}
		}
		if ((typeof order === "string" && !newSet.has(order)) || (typeof order !== "string" &&
			typeof order !== "object") ||
			(order !== null && typeof order === "object" && this.checkSort(order, newSet) === false)) {
			return false;
		}  else {
			let newObj;
			if (typeof order === "string") {
				newObj = new Options(columns, this.id, new Sort(null,null,order));
			} else if (order !== null && typeof order === "object") {
				newObj = new Options(columns, this.id, this.checkSort(order, newSet) as Sort);
			} else if (order === null) {
				newObj = new Options(columns, this.id);
			}
			return (newObj as Options);
		}
	}

	private checkSort(order: object, columnSet: Set<string>): Sort | false {
		let dirString = Object.keys(order)[0];
		let direction = Object.values(order)[0];
		let keysString = Object.keys(order)[1];
		let inputList = Object.values(order)[1];
		let checkList = (param: string[]): boolean => {
			for (const elem of param) {
				if (!columnSet.has(elem)) {
					return false;
				}
			}
			return true;
		};
		if ((dirString !== "dir") || (keysString !== "keys") || (direction !== "UP" && direction !== "DOWN")) {
			return false;
		} else if (!checkList(inputList) || inputList.length === 0) {
			return false;
		}
		return new Sort(direction, inputList);
	}

	private checkTransformations(transformation: object, columns: string[]): Transformations | false {
		let groupString = Object.keys(transformation)[0]; // "TRANSFORMATIONS"
		let groups = Object.values(transformation)[0];
		let applyString = Object.keys(transformation)[1];
		let applys = Object.values(transformation)[1]; // list of objects
		let applyKeys: string[] = [];
		let newSet = new Set<string> ([]);
		let Applys: Apply[] = [];
		for (const elem of applys) {
			let variab = this.checkApplyRule(elem);
			if (!variab) {
				return false;
			} else {
				applyKeys.push(variab.getApplyKey());
				Applys.push(variab as Apply);
			}
		}
		if (!checkLists(this.columnList, groups.concat(this.applyKeys))) { // checking if column contain the right
			return false;                                     // keys
		}
		if (groupString !== "GROUP" || applyString !== "APPLY") {
			return false;
		} else if (!this.checkColumns(columns, newSet, applyKeys)) {
			return false;
		} else if (!checkLists(groups, this.keyList)) {
			return false;
		}
		return new Transformations(groups, Applys);
	}

	private checkApplyRule(applyRule: object): Apply | false {
		let applyKey = Object.keys(applyRule)[0];
		let applyToken = Object.keys(Object.values(applyRule)[0])[0] as string;
		let key = Object.values(Object.values(applyRule)[0])[0] as string;
		if (!checkLists([applyToken], appyTokens)) { // checks for duplicate apply tokens
			return false;
		} else if ((applyKey.length === 0) || !checkLists([key], this.keyList) ||
			(applyToken !== "COUNT" && checkLists([key], this.keyList.slice(mfield.size, -1))) ||
			(this.applyKeys.includes(applyKey))) {
			return false;
		}
		this.applyKeys.push(applyKey);
		return new Apply(applyKey, applyToken, key);
	};
}
