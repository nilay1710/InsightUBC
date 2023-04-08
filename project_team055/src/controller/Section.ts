import SectionOrRoom from "./SectionOrRoom";

export default class Section {
	private readonly dept: string;
	private readonly instructor: string;
	private readonly title: string;
	private readonly id: string;
	private readonly uuid: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;


	constructor(dept: string, instructor: string, title: string, id: string, uuid: string,
		year: number, avg: number, pass: number, fail: number, audit: number) {
		this.dept = dept;
		this.instructor = instructor;
		this.title = title;
		this.id = id;
		this.uuid = uuid;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;

	}

	// Getters for each field:
	public getDept(): string {
		return this.dept;
	}

	public getInstructor(): string {
		return this.instructor;
	}

	public getTitle(): string {
		return this.title;
	}

	public getID(): string {
		return this.id;
	}

	public getUUID(): string {
		return this.uuid;
	}

	public getYear(): number {
		return this.year;
	}

	public getAvg(): number {
		return this.avg;
	}

	public getPass(): number {
		return this.pass;
	}

	public getFail(): number {
		return this.fail;
	}

	public getAudit(): number {
		return this.audit;
	}


}
