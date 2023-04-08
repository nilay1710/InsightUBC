import Section from "./Section";
import {InsightDatasetKind} from "./IInsightFacade";
import fs from "fs-extra";
import {DataModellingTools} from "./DataModellingTools";
import Room from "./Room";

export class DiskOperations {
	private readonly dataModeller: DataModellingTools;

	constructor(dataModeller: DataModellingTools) {
		this.dataModeller = dataModeller;
	}

	// **CITATION**: https://github.com/jprichardson/node-fs-extra
	// USE: used the fs-extra documentation to make the directory and write JSON File synchronously
	// EFFECTS: saves the base_64 zip file to disk
	public async saveToDisk(id: string, content: Section[] | Room[], numRows: number,
		type: InsightDatasetKind): Promise<boolean> {
		try {
			// console.time("saveToDisk");
			// checks if directory below exists already or not, if it doesn't, it creates a new one
			fs.ensureDirSync("./data/");
			if (type === InsightDatasetKind.Sections) {
				fs.writeFileSync("./data/" + id + ".json",
					JSON.stringify({data: content, rows: numRows, type: "s"}));
			} else if(type === InsightDatasetKind.Rooms) {
				fs.writeFileSync("./data/" + id + ".json",
					JSON.stringify({data: content, rows: numRows, type: "r"}));
			};
			// console.log(JSON.stringify({sections: content, rows: numRows}));
			// console.timeEnd("saveToDisk");
			return true;
		} catch (e) {
			return false;
		}
	}

	// // **CITATION**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
	// // USE: used stringify to guide approach to creating JSON String
	// **CITATION**: https://github.com/jprichardson/node-fs-extra/blob/master/docs/readJson-sync.md
	// USE: used to learn how to read JSON Files from disk
	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (load async)
	// **CITATION: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used for JSON Parse method and to figure out how to access JSON Components
	// EFFECTS: loads all the sections associated with a dataset from disk and passes back a list of strings
	public loadFromDisk(nameList: string[]): Map<string, Section[] | Room[]> {
		// console.time("loadFromDisk");
		let dSets = new Map<string, Section[] | Room[]>();
		for (const name of nameList) {
			let obj = fs.readJSONSync("./data/" + name + ".json");
			let data: Section[] | Room[];
			if (obj["type"] === "s") {
				data = this.toSections(obj["data"]);
			} else {
				data = this.toRooms(obj["data"]);
			}

			dSets.set(name,data);
		}
		// console.timeEnd("loadFromDisk");
		return dSets;
		// if (numSections === (0 || undefined)) {
		// 	throw new InsightError("numRows entered into Load from disk was null or 0!");
		// }
		// let obj = fs.readJSONSync("./data/" + id + ".json");
		// obj = obj["sections"];
		// obj = obj["base64"];
		// let zip = new JSZip();
		// // console.log("about to load async");
		// return zip.loadAsync(obj, {base64: true}).then(async () => {  // loadAsync the zip using the obj base64 zip
		// 	// console.log("done load async");
		// 	let val =  await this.dataModeller.convertToDataModel(zip);
		// 	// console.log("converted to data Model");
		// 	return val;
		// }).catch((err: Error) => {
		// 	return Promise.reject(new InsightError( "rejected in load from disk"));
		// });
	}

	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (used for the folder, forEach & async)
	// **CITATION: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used for JSON Parse method and to figure out how to access JSON Components
	// EFFECTS: converts all VALID sections within a courses file to a list of sections by parsing the data
	public toSections(toConvert: any): Section[] {
		let sectionList = new Array<Section>();
		for(const section of toConvert) {
			let s = new Section(section.dept.toString(),
				section.instructor.toString(), section.title.toString(),
				section.id.toString(), section.uuid.toString(),
				section.year, section.avg,
				section.pass, section.fail,
				section.audit);
			sectionList.push(s);
		}
		return sectionList;
	}

	// **CITATION**: https://stuk.github.io/jszip/documentation/api_jszip.html
	// USE: used JSZip API documentation within this method to guide approach to opening and evaluating the
	//      base 64 zip (used for the folder, forEach & async)
	// **CITATION: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
	// USE: used for JSON Parse method and to figure out how to access JSON Components
	// **CITATION**: https://www.geeksforgeeks.org/how-to-convert-string-to-number-in-typescript/
	// USE: used for parsing a string into an int
	// EFFECTS: converts all VALID sections within a courses file to a list of sections by parsing the data
	public toRooms(toConvert: any): Room[] {
		let roomList = new Array<Room>();
		for(const room of toConvert) {
			let s = new Room();
			s.setFullName(room.fullName);
			s.setShortName(room.shortName);
			s.setNumber(room.number);
			s.setName(room.name);
			s.setAddress(room.address);
			s.setLat(parseInt(room.lat, 10));
			s.setLon(parseInt(room.lon, 10));
			s.setSeats(parseInt(room.seats,10));
			s.setHref(room.href);
			s.setFurniture(room.furniture);
			s.setType(room.type);
			roomList.push(s);
		}
		return roomList;
	}
}
