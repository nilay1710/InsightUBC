import Query, {Filter, LogicComparison, MComparison, Negation, SComparison} from "./Query";
import Section from "./Section";
import {InsightResult} from "./IInsightFacade";
import Room from "./Room";

export class QueryEval {

	constructor() {
		// console.log("")
	}

	// **CITATION**: - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
	//				 - https://www.tutorialspoint.com/typescript/typescript_array_sort.htm
	// USE: used to figure out the format of the sort "compare" function below
	// EFFECTS: filters the list of strings inputted according to query criteria
	public filterList(sections: Section[] | Room[], q: Query): Section[] | Room[]{
		let filteredList = [];
		// if there is no filter in WHERE, then return the list of sections as is
		if (q.getBody().getFilter()?.getType() === "" || q.getBody().getFilter()?.getValue() === null) {
			return sections;
		}
		let firstFilter: Filter = q.getBody().getFilter() as Filter;
		// SORT ARRAY before filtering it in order to produce the same results as the tests
		// TODO: it only sort instances of Sections?
		// if (sections[0] instanceof Section) {
		// 	(sections as Section[]).sort((firstElm: Section, secondElm: Section) => {
		//
		// 		let temp = [firstElm.getDept(), secondElm.getDept()];
		// 		temp.sort();
		// 		if(temp[0] !== firstElm.getDept()) { 		// this means the order was changed by calling sort before this
		// 			return 1;								// returning a positive indicates to sort 'a' after 'b'
		// 		} else {
		// 			return -1;								// returning a negative indicates to sort 'a' before 'b'
		// 		}
		// 	});
		// }

		// for each section in the list if queryBodyEval returns true, then add it to the filtered list, otherwise loop
		for (const section of sections) {
			if (this.queryBodyEval(section, firstFilter)){
				filteredList.push(section);
			}
		}
		if (filteredList[0] instanceof Room) {
			(filteredList as Room[]).sort((firstElm: Room, secondElm: Room) => {

				let temp = [firstElm.getFullName(), secondElm.getFullName()];
				temp.sort();
				if(temp[0] !== firstElm.getFullName()) { 		// this means the order was changed by calling sort before this
					return 1;								// returning a positive indicates to sort 'a' after 'b'
				} else {
					return -1;								// returning a negative indicates to sort 'a' before 'b'
				}
			});
		}
		if (filteredList[0] instanceof Section) {
			(filteredList as Section[]).sort((firstElm: Section, secondElm: Section) => {

				let temp = [firstElm.getDept(), secondElm.getDept()];
				temp.sort();
				if(temp[0] !== firstElm.getDept()) { 		// this means the order was changed by calling sort before this
					return 1;								// returning a positive indicates to sort 'a' after 'b'
				} else {
					return -1;								// returning a negative indicates to sort 'a' before 'b'
				}
			});
		}

		return filteredList as Section[] | Room[];
	}

	// EFFECTS: evaluates and filters the sections according to query components
	//			- uses recursion with logic-comp and negation, uses scomp and mcomp as based cases that trigger recursion back up the tree of filters
	//			- returns true if section has all the required components outlined by the filters
	public queryBodyEval(section: any, filter: Filter): boolean {
		// Case 1: Logic Comparison
		if (filter.getType() === "LOGIC") {
			// console.time("logicFilter");
			let logic = this.handleLogic(section, filter);
			// console.timeEnd("logicFilter");
			return logic;
		}
		// Case 2: Negation
		if (filter.getType() === "NEGATION") {
			// console.time("negationFilter");
			let negation = this.handleNegation(section, filter);
			// console.timeEnd("negationFilter");
			return negation;
		}
		// Case 3: MComparison
		if (filter.getType() === "MCOMPARISON") {
			// console.time("mcompFilter");
			let mcomp = this.handleMComp(section, filter);
			// console.timeEnd("mcompFilter");
			return mcomp;
		}
		// Case 4: SComparison
		if (filter.getType() === "SCOMPARISON") {
			// console.time("scompFilter");
			let scomp = this.handleSComp(section, filter);
			// console.timeEnd("scompFilter");
			return scomp;
		}
		return false;
	}

	// EFFECTS: evaluates and filters the sections according to query components
	//			- uses recursion with logic-comp and negation, uses scomp and mcomp as based cases that trigger recursion back up the tree of filters
	//			- returns true if section has all the required components outlined by the filters
	public handleLogic(section: any, filter: Filter): boolean {
		let logicFilter = filter as LogicComparison;
		let logic = logicFilter.getLogic();
		if (logic === "AND") {
			let bool = true;
			// make a recursive call for the filters part of the Logic Comp and && them
			for(let subFilter of logicFilter.getFilterList()){
				bool = bool && this.queryBodyEval(section, subFilter);
				if (!bool) { // if bool is ever false, immediately return false
					return false;
				}
			}
			return true;
		}
		if (logic === "OR") {
			let bool = false;
			// make a recursive call for the filters part of the Logic Comp and || them
			for(let subFilter of logicFilter.getFilterList()){
				bool = bool || this.queryBodyEval(section, subFilter);
				if (bool) {				// if bool is ever true, it has fulfilled the statement and true can be returned
					return true;
				}
			}
			return false;
		}
		return false;
	}

	// EFFECTS: returns the negation of whatever the recursive call returns
	public handleNegation(section: any, filter: Filter): boolean {
		let logicFilter = filter as Negation;
		return !this.queryBodyEval(section, logicFilter.getFilter());
	}

	private checkLists(listA: string[], listB: string[]): boolean {
		for (const elem of listA) {
			if (!listB.includes(elem)) {
				return false;
			}
		}
		return true;
	}

	// **CITATION**: https://mkyong.com/javascript/how-to-access-json-object-in-javascript/#:~:text=To%20access%20the%20JSON%20object,%E2%80%9D%20or%20%E2%80%9C%5B%5D%E2%80%9D.
	// USE: used to figure out various ways to index into JSON String
	// EFFECTS: acts as a base case for the recursion
	public handleMComp(section: any, filter: Filter): boolean {
		let mCompFilter = filter as MComparison;
		let mField: string |number | false = this.getField(mCompFilter.getMKey(), "M", section); 		// gets the value of the field to check for in section
		let operation = mCompFilter.getMComparator();     // checks if the operation is LT, GT or EQ
		if(operation === "GT") { // greater-than operation
			// if value of section's mField is greater than the number asked for in the query then return true
			if (mCompFilter.getNumber() < mField){
				return true;
			}
		} else if(operation === "LT") { // less-than operation
			// if value of section's mField is less than the number asked for in the query then return true
			if (mCompFilter.getNumber() > mField){
				return true;
			}
		} else if(operation === "EQ") { // equal-to operation
			// if value of section's mField is equal to the number asked for in the query then return true
			if (mCompFilter.getNumber() === mField){
				return true;
			}
		}
		return false;
	}

	// **CITATION**: https://mkyong.com/javascript/how-to-access-json-object-in-javascript/#:~:text=To%20access%20the%20JSON%20object,%E2%80%9D%20or%20%E2%80%9C%5B%5D%E2%80%9D.
	// USE: used to figure out various ways to index into JSON String
	// **CITATION**: https://www.tutorialsteacher.com/typescript/typescript-string
	// USE: used for string methods in typescript (startsWith, endsWith, contains)
	// **CITATION**: https://www.tutorialspoint.com/typescript/typescript_string_substring.htm
	// USE: used for substring indexing
	// EFFECTS: acts a base case for the recursion
	public handleSComp(section: any, filter: Filter): boolean {
		let sCompFilter = filter as SComparison;
		let sField = this.getField(sCompFilter.getsKey(), "S", section); 			// gets the value of the field to check for in section
		let inputStringLength = sCompFilter.getInputString().length;
		let wildcard = this.getWildcard(sCompFilter.getInputString());    	// checks what type of wildcard there is (or if there isn't one)
		if(wildcard === "front") { // WILDCARD CASE => starts with input string -> inputString*
			// if the field specified starts with the inputString, return true
			let input = sCompFilter.getInputString().substring(0,inputStringLength - 1);  // removes the * at the end of the inputString
			if((sField as string).startsWith(input)){
				return true;
			}
		} else if(wildcard === "back") { // WILDCARD CASE => ends with input string -> *inputString // if the field specified ends with the inputString, return true
			let input = sCompFilter.getInputString().substring(1,inputStringLength);  // removes the * at the beginning of the inputString
			if ((sField as string).endsWith(input)){
				return true;
			}
		} else if(wildcard === "contains") { // WILDCARD CASE => contains input string -> *inputString* // if the field specified contains with the inputString, return true
			let input = sCompFilter.getInputString().substring(1,inputStringLength - 1);  // removes the * at the start and end of the inputString
			if ((sField as string).includes(input)){
				return true;
			}
		} else if(wildcard === "none") { // WILDCARD CASE => no wildcard // if the field specified matches the inputString exactly, return true
			if (sCompFilter.getInputString() === sField){
				return true;
			}
		}
		return false;
	}

	// **CITATION**: https://www.tutorialsteacher.com/typescript/typescript-string#split
	// USE: used string documentation to split up the MComp below
	// EFFECTS: returns the mfield part of the mkey or sfield part of skey
	public getField(key: string, type: string, section: Section | Room): string | number | false{
		let field = key.split("_")[1];
		// split the mkey into two parts, before and after the "_" which returns a list of strings
		// (indexes to the second value of that list which is equivalent to a string)
		if (type === "M") {						// handles mKeys
			return this.getMFieldEquiv(field, section);
		}
		if (type === "S") {						// handles mKeys
			return this.getSFieldEquiv(field, section);
		}
		return ""; // should not reach this case
	}

	// EFFECTS: converts the query field name to corresponding names on file for mField
	public getMFieldEquiv(field: string, section: Section | Room): number | false {
		if(field === "year" || field === "overall") {
			return (section as Section).getYear();
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
		return 0; // should not reach this case
	}

	// EFFECTS: converts the query field name to corresponding names on file sField
	public getSFieldEquiv(field: string, dataType: Section | Room): string | false{
		if(field === "uuid") {
			return (dataType as Section).getUUID().toString();
		} else if (field === "id") {
			return (dataType as Section).getID();
		} else if (field === "title") {
			return (dataType as Section).getTitle();
		} else if (field === "instructor") {
			return (dataType as Section).getInstructor();
		} else if (field === "dept") {
			return (dataType as Section).getDept();
		} else if (field === "fullname") {
			return (dataType as Room).getFullName();
		} else if (field === "shortname") {
			return (dataType as Room).getShortName();
		} else if (field === "number") {
			return (dataType as Room).getNumber();
		} else if (field === "name") {
			return (dataType as Room).getName();
		} else if (field === "address") {
			return (dataType as Room).getAddress();
		} else if (field === "type") {
			return (dataType as Room).getType();
		} else if (field === "furniture") {
			return (dataType as Room).getFurniture();
		} else if (field === "href") {
			return (dataType as Room).getHref();
		}
		return ""; // should not reach this case
	}

	// **CITATION**: https://www.tutorialsteacher.com/typescript/typescript-string
	// USE: used for string methods in typescript
	// EFFECTS: returns "front", "back", "contains", or "none" for the wildcard
	public getWildcard(inputString: string): string {
		if (inputString.startsWith("*") && inputString.endsWith("*")) {
			return "contains";
		} else if (inputString.startsWith("*") && !inputString.endsWith("*")) {
			return "back";
		} else if (!inputString.startsWith("*") && inputString.endsWith("*")) {
			return "front";
		} else {
			return "none";
		}
	}
}
