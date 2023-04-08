import {InsightError, ResultTooLargeError} from "./IInsightFacade";

let mkey = new Set<string>(["avg" , "pass" , "fail" , "audit" , "year", "lat","lon","seats"]);
let skey = new Set<string>(["dept" , "id" , "instructor" , "title" , "uuid",
	"fullname","shortname","number","name","address","type","furniture","href"]);

let applyTokens = new Set<string>(["MAX","MIN","AVG","COUNT","SUM"]);
export default class Query {
	public id: string;
	public body: Body;
	public options: Options;
	public transformations?: Transformations;
	constructor(id: string, body: Body, options: Options, transformations?: Transformations) {
		this.id = id; // dataset id
		this.body = body;
		this.options = options;
		this.transformations = transformations;
	}

	public getBody(): Body {
		return this.body;
	}

	public getOptions(): Options {
		return this.options;
	}

	public getTransformations(): Transformations | undefined {
		return this.transformations;
	}
}


export class Body {
	private filter?: Filter;

	constructor(filter?: Filter) {
		this.filter = filter;
	}

	public getFilter(): Filter | undefined {
		return this.filter;
	}
}

export class Filter {
	private type: string;
	private value: any;

	constructor(type: string, value: any) {
		this.type = type;
		this.value = value;
	}

	public getType(): string {
		return this.type;
	}

	public getValue(): any {
		return this.value;
	}
}
export class LogicComparison extends Filter {
	private logic: string;
	private filterList: Filter[];
	constructor(logic: string, filterList: Filter[]) {
		super("LOGIC", {logic, filterList});
		this.logic = logic;
		this.filterList = filterList;
	}

	public getLogic(): string {
		return this.logic;
	}

	public getFilterList(): Filter[] {
		return this.filterList;
	}
}
export class MComparison extends Filter {
	private mComparator: string;
	private mKey: string;
	private number: number;
	private id: string;
	constructor(mComparator: string, mKey: string, number: number, id: string) {
		super("MCOMPARISON", {mComparator, mKey, number});
		this.mComparator = mComparator; // LT, GT, EQ
		this.mKey = mKey;
		this.number = number;
		this.id = id;
	}

	public getMComparator(): string {
		return this.mComparator;
	}

	public getMKey(): string {
		return this.mKey;
	}

	public getNumber(): number {
		return this.number;
	}
}

export class SComparison extends Filter {
	private sKey: string;
	private inputString: string;

	private id: string;

	constructor(sKey: string, inputString: string, id: string) {
		super("SCOMPARISON", {sKey, inputString});
		this.sKey = sKey;
		this.inputString = inputString;
		this.id = id;
	}

	public getsKey(): string {
		return this.sKey;
	}

	public getInputString(): string {
		return this.inputString;
	}
}

export class Negation extends Filter {
	private filter: Filter;

	constructor(filter: Filter) {
		super("NEGATION", filter);
		this.filter = filter;
	}

	public getFilter(): Filter {
		return this.filter;
	}
}

export class Options {
	private id: string;
	private columns: string[];
	private sort?: Sort;

	constructor(columns: string[], id: string, sort?: Sort) {
		this.columns = columns;
		this.id = id;
		this.sort = sort;
	};

	public getColumns(): string[] {
		return this.columns;
	}

	public getId(): string {
		return this.id;
	}

	public getSort(): Sort | undefined {
		return this.sort;
	}

	public getOrder(): string {
		return "order";    // this is wrong. Done to stop error in datamodelling tools.
	}
}

export class Sort{
	private dir?: string; // "up" or "down"

	private keys?: string[];

	private order?: string;

	constructor(dir?: any, keys?: any, order?: string){
		this.dir = dir;
		this.order = order;
		this.keys = keys;
	}

	public getDirection(): string | undefined{
		return this.dir;
	}

	public getKeys(): string[] | undefined{
		return this.keys;
	}

	public getOrder(): string | undefined{
		return this.order;
	}
}

export class Transformations {
	private group: string[]; // key list
	private apply?: Apply[];

	constructor(group: string[], apply?: Apply[]){
		this.apply = apply;
		this.group = group;
	}

	public getGroup(): string[] {
		return this.group;
	}

	public getApply(): Apply[] | undefined {
		return this.apply;
	}


}


export class Apply {
	private applyKey: string;
	private applyToken: string;
	private key: string;

	constructor(applyKey: string, applyToken: string, key: string) {
		this.applyKey = applyKey;
		this.applyToken = applyToken;
		this.key = key;
	}

	public getApplyKey(): string {
		return this.applyKey;
	}

	public getApplyToken(): string {
		return this.applyToken;
	}

	public getKey(): string {
		return this.key;
	}


}
