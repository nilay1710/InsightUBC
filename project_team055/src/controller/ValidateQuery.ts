import Query, {Body, Filter, LogicComparison, MComparison, Negation, Options, SComparison} from "./Query";

export class ValidateQuery {
	private userInput: string;
	private curr_dSets: string[];  	// a list of the current datasets in the system (passed into the constructor for Validate Query)
	private dsetToQuery: string;	// the dataset being queried currently queried
	constructor(i: string, curr_dSets: string[]) {
		this.userInput = JSON.parse(i);
		this.curr_dSets = curr_dSets;
		this.dsetToQuery = "";
	}

	// **** NOTE ****************************************************************************************************
	// The approach with all the proceeding methods is as follows:
	//		- check if the current path has a non-null/non-undefined path (ex. check that userInput.input is non-null)
	//		- if the path is non-null then pass to children functions (ex. child of checkMComparator is checkMKey)
	//		- check if the children functions return false, if they don't return false then create the parent object
	//		  with the children objects that compose it then return the parent object to it's parent
	// **************************************************************************************************************
	// EFFECTS: checks if "input" exists in string, returns false
	public checkInput (): Query | false{
		return false; // STUB
	}

	// EFFECTS: checks if WHERE exists then passes to filter
	//			- returns immediately if WHERE {} is empty
	private checkBody (id: string): Body | false{
		return false; // STUB
	}

	// EFFECTS: check if there is an OPTIONS (if not, return false)
	//			passes to checkColumns then if returned correctly
	// IMPORTANT: check that if there is an ORDER specified, it must be a key that is in COLUMNS
	private checkOptions (id: string): Options | false{
		return false; // STUB
	}

	// EFFECTS: check for which type of filter is used, key words: {"AND", "OR"} = Logic, {"IS"} = SComp
	//			{"LT", "GT", "EQ"}  = MComp, {"NOT"} = Negation
	private checkFilter (id: string): Filter | false{
		return false; // STUB
	}

	// EFFECTS: Check that there are two arguments to LOGIC;
	//			passes to checkFilter to deal with next level of filters (only if all subfilters to LOGIC are non-false can
	//			we create the LogicComparison Object to return
	private checkLogic (id: string): LogicComparison | false{
		return false; // STUB
	}

	// EFFECTS: Check MComparator "LT"|"GT"|"EQ" exists
	//			pass to checkMkey
	private checkMComparator (id: string): MComparison | false{
		return false; // STUB
	}

	// EFFECTS: Check SComparator "IS" Exists and pass to checkSKey
	private checkSComparator (id: string): SComparison | false{
		return false; // STUB
	}

	// EFFECTS: check that "NOT" is not Null
	//			passes back to checkFilter to deal with next level of filters (only if all subfilters to LOGIC are non-false can
	// 			we create the LogicComparison Object to return
	private checkNegation (id: string): Negation | false{
		return false; // STUB
	}

	// EFFECTS: Checks if mkey is in the correct form and returns it if it is
	private checkMKey (id: string): string | false{
		return ""; // STUB
	}

	// EFFECTS: checks if skey is in the correct form and returns it if it is
	private checkSKey (id: string): string | false{
		return ""; // STUB
	}

	// EFFECTS: - first checks if dSetToQuery is an empty string
	//				- if it is empty, check if id is contained in the curr_dSets
	//					- if not return false
	//				- if it is not empty, check if id == dSetToQuery
	//					- if not return false
	private checkDSet (id: string): string | false{
		return ""; // STUB
	}
}
