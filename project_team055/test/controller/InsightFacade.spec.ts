import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

use(chaiAsPromised);

// // describe("InsightFacade", function () {
// // 	let facade: IInsightFacade;
// //
// // 	// Declare datasets used in tests. You should add more datasets like this!
// // 	let sections: string;
// //
// // 	before(function () {
// // 		// This block runs once and loads the datasets.
// // 		sections = getContentFromArchives("pair.zip");
// //
// // 		// Just in case there is anything hanging around from a previous run of the test suite
// // 		clearDisk();
// // 	});
// //
// // 	describe("Add/Remove/List Dataset", function () {
// // 		before(function () {
// // 			console.info(`Before: ${this.test?.parent?.title}`);
// // 		});
// //
// // 		beforeEach(function () {
// // 			// This section resets the insightFacade instance
// // 			// This runs before each test
// // 			console.info(`BeforeTest: ${this.currentTest?.title}`);
// // 			facade = new InsightFacade();
// // 		});
// //
// // 		after(function () {
// // 			console.info(`After: ${this.test?.parent?.title}`);
// // 		});
// //
// // 		afterEach(function () {
// // 			// This section resets the data directory (removing any cached data)
// // 			// This runs after each test, which should make each test independent of the previous one
// // 			console.info(`AfterTest: ${this.currentTest?.title}`);
// // 			clearDisk();
// // 		});
// //
// // 		// This is a unit test. You should create more like this!
// // 		it("should reject with  an empty dataset id", function () {
// // 			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
// // 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// // 		});
// // 	});
// //
// // 	/*
// // 	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
// // 	 * You should not need to modify it; instead, add additional files to the queries directory.
// // 	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
// // 	 */
// // 	describe("PerformQuery", () => {
// // 		before(function () {
// // 			console.info(`Before: ${this.test?.parent?.title}`);
// //
// // 			facade = new InsightFacade();
// //
// // 			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
// // 			// Will *fail* if there is a problem reading ANY dataset.
// // 			// const loadDatasetPromises = [facade.addDataset("sections", sections, InsightDatasetKind.Sections)];
// //
// // 			// return Promise.all(loadDatasetPromises);
// // 		});
// //
// // 		after(function () {
// // 			console.info(`After: ${this.test?.parent?.title}`);
// // 			clearDisk();
// // 		});
// //
// // 		type PQErrorKind = "ResultTooLargeError" | "InsightError";
// //
// // 		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// // 			"Dynamic InsightFacade PerformQuery tests",
// // 			(input) => facade.performQuery(input),
// // 			"./test/resources/queries",
// // 			{
// // 				assertOnResult: (actual, expected) => {
// //
// // 				},
// // 				errorValidator: (error): error is PQErrorKind =>
// // 					error === "ResultTooLargeError" || error === "InsightError",
// // 				assertOnError: (actual, expected) => {
// //
// // 				},
// // 			}
// // 		);
// // 	});
// // });
//
describe("InsightFacade 2", function()  {
	let sections: string;
	let sectionsSubset: string;
	let rooms: string;
	let facade: InsightFacade;
	let qFacade: InsightFacade;
	let qFacadeNew: InsightFacade;
	let qFacadeNew2: InsightFacade;
	type Input = unknown;
	type Output = Promise<InsightResult[]>;
	type Error = "InsightError" | "ResultTooLargeError";


	before(function() {
		clearDisk();
		sections = getContentFromArchives("bigDataset.zip");
		sectionsSubset = getContentFromArchives("subset1.zip");
		rooms = getContentFromArchives("campus.zip");
	});

	describe("addDataset - Sections", function() {
		beforeEach(function() {                 // change to "before" if before takes up too much time
			clearDisk();
			facade = new InsightFacade();
		});

		it ("should reject with  an empty dataset id", function() {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with  an underscore in dataset id", function() {
			const result = facade.addDataset("_", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with an invalid kind", function() {
			const result = facade.addDataset("new-dataset", sections, InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with  an empty invalid dataset", function() {
			const result = facade.addDataset("new-dataset", getContentFromArchives("empty.zip"),
				InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with  a duplicate dataset id", function() {
			const result = facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections)
				.then(() => facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections));

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should successfully add dataset", async function() {
			try {
				const result = facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections);

				return expect(result).to.eventually.have.members(["new-dataset"]);
			} catch (e) {
				return expect(e).to.be.null;
			}
		});


		it ("should reject with a non-zip invalid dataset", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid-course-not-Json.zip"),
				InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it ("should reject with a non-Json invalid course", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid-course-not-Json.zip"),
				InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with a invalid course not placed in 'courses' folder", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid-course-not-in-correct-folder.zip"),
				InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with  an invalid course that has no result key", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid-course-valid sections-can't-be-found-with-result-key.zip"),
				InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it ("should test crash handling for addDataset",
			async function() {
				const result1 = facade.addDataset("new-dataset", sectionsSubset,
					InsightDatasetKind.Sections).then(() => {
					let newFacade = new InsightFacade();
					return newFacade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections);
				});
				return expect(result1).to.eventually.be.rejectedWith(InsightError);
			});

	});

	describe("addDataset - Rooms", function() {
		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});
		it ("should reject an html file that doesn't have an index file", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_index_not_at_root.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it ("should reject an html file that has a index file but not located at the root of the zip", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_index_not_at_root.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it ("index.htm is present, in the correct place but doesnt have a valid table", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_no_building_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("index.htm is present, in the correct place with a valid table but no buildings", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_no_buildings_in_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("missing class column in index table", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_missing_class_in_index_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("missing class column in rooms table", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_missing_class_in_room_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("less than 5 columns in rooms table", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_less_than_five_columns_in_room_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// ACCORDNG TO PIAZZA -> This is an edge case that their implementation doesn't cover (it is correct, but it
		//						 won't show up as correct in th #check command)
		// it ("less than 5 columns in index table", function() {
		// 	const result = facade.addDataset("new-dataset",
		// 		getContentFromArchives("invalid_less_than_five_columns_in_index_table.zip"),
		// 		InsightDatasetKind.Rooms);
		//
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// }); // index page doesn't need all five columns

		// TODO
		it ("Building doesn't have room table (wrong class in the room table) - therefore no valid rooms", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_no_valid_rooms_table.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("Room doesn't have all the required fields", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_missing_query_field.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("geolocation returns error", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_geolocation_error.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("number field doesn't parseInt", function() {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("invalid_room_capacity_not_a_num.zip"),
				InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("should reject an html index file with no table (large file)", async function () {
			const result = facade.addDataset("new-dataset",
				getContentFromArchives("table_not_in_dSet.zip"), InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// TODO
		it ("should successfully add a dataset where the index is at the bottom", async function () {
			try {
				const result = await facade.addDataset("new-dataset",
					getContentFromArchives("table_at_bottom_of_file_dSet.zip"), InsightDatasetKind.Rooms);

				return expect(result).to.have.members(["new-dataset"]);
				// return expect(facade.getDatasets().get("new-dataset")?.length).to.equal(364);
			} catch (e) {
				return expect(e).to.be.null;
			}
		});

		// TODO
		it ("should successfully add a dataset of type room", async function () {
			try {
				const result = await facade.addDataset("new-dataset", rooms,
					InsightDatasetKind.Rooms);

				expect(result).to.have.members(["new-dataset"]);
				return expect(facade.getDatasets().get("new-dataset")?.length).to.equal(364);
			} catch (e) {
				return expect(e).to.be.null;
			}
		});
	});

	describe("removeDataset", function() {
		beforeEach(function() {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with an empty dataset id", function () {
			const result = facade.removeDataset("");

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore in dataset id", function () {
			const result = facade.removeDataset("_");

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject with a valid id that has not been added yet", function () {
			const result = facade.removeDataset("11111");

			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should successfully remove a dataset", async function () {
			try {
				const result = facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections)
					.then(() => facade.removeDataset("new-dataset")).catch((err: Error) => {
						console.error("error caught");
					});

				return expect(result).to.eventually.equal("new-dataset");
			} catch (e) {
				return expect(e).to.be.null;
			}
		});

		it("should successfully remove a dataset of type room", async function () {
			try {
				const result = facade.addDataset("new-dataset",
					getContentFromArchives("subsetRoom1.zip"), InsightDatasetKind.Rooms)
					.then(() => facade.removeDataset("new-dataset")).catch((err: Error) => {
						console.error("error caught");
					});

				return expect(result).to.eventually.equal("new-dataset");
			} catch (e) {
				return expect(e).to.be.null;
			}
		});

		it("should successfully remove a dataset and then fail when trying to remove it again", async function () {
			try {
				const result = facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections)
					.then(() => facade.removeDataset("new-dataset"))
					.then(() => facade.removeDataset("pair.zip"));

				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
			} catch(e) {
				return expect(e).to.be.null;
			}
		});
		it("should successfully remove a dataset, add it, then remove it again", async function () {
			try {
				const result = facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections)
					.then(() => facade.removeDataset("new-dataset"))
					.then(() => facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections))
					.then(() => facade.removeDataset("new-dataset")).catch((err: Error) => {
						console.error("error caught");
					});

				return expect(result).to.eventually.equal("new-dataset");
			} catch (e) {
				return expect(e).to.be.null;
			}
		});
		it ("should test crash handling for removeDataset",
			async function() {
				try {
					const result = await facade.addDataset("new-dataset",
						getContentFromArchives("subsetRoom1.zip"), InsightDatasetKind.Rooms);
					expect(result).to.have.members(["new-dataset"]);
					// instantiate a new InsightFacade
					let newFacade = new InsightFacade();
					const result2 = newFacade.removeDataset("new-dataset");
					expect(newFacade.getDatasets).to.have.lengthOf(0);
					return expect(result2).to.eventually.equal("new-dataset");
				} catch (e) {
					return expect(e).to.be.null;
				}
			});
		it ("should test crash handling for remove, add and list used in combination",
			async function() {
				sectionsSubset = getContentFromArchives("subset1.zip");
				qFacade = new InsightFacade();
				try {
					// TODO: add a part that tests crash handling for datasets of type room
					// add two new datasets to qFacade
					await qFacade.addDataset("sectionsSubset", sectionsSubset, InsightDatasetKind.Sections);
					await qFacade.addDataset("subsetRoom", getContentFromArchives("subsetRoom1.zip"),
						InsightDatasetKind.Rooms);
					// let result1 = qFacade.addDataset("sectionsSubset",
					// 	sectionsSubset, InsightDatasetKind.Sections);
					// let expect1 = await expect(result1).to.eventually.be.rejectedWith(InsightError);
					// instantiate qFacadeNew
					qFacadeNew = new InsightFacade();
					// remove a dataset
					const result2 = qFacadeNew.removeDataset("sectionsSubset");
					let expect2 = await expect(result2).to.eventually.equal("sectionsSubset").then(() => {
						let i = 0;
						qFacadeNew.getDatasets().forEach((elm) => {
							return i++;
						});
						return expect(i).to.equal(1);
					});
					// try to remove the facade again to make sure it causes an error
					const result3 = qFacadeNew.removeDataset("sectionsSubset");
					let expect3 = await expect(result3).to.eventually.be.rejectedWith(NotFoundError);
					// instantiate another facade and try to add same dataset back (should work)
					qFacadeNew2 = new InsightFacade();
					await qFacadeNew2.addDataset("sectionsSubset", sectionsSubset, InsightDatasetKind.Sections);
					const result4 = qFacadeNew2.addDataset("sectionsSubset", sectionsSubset,
						InsightDatasetKind.Sections);
					return expect(result4).to.eventually.be.rejectedWith(InsightError);
					// console.log(qFacadeNew2.getDatasets().keys());
					// return expect1 && expect3 && expect4;
				} catch (e) {
					// console.log(e);
					return expect(e).to.be.null;
				}
			});

	});

	describe("listDataset", function() {
		beforeEach(function() {                 // change to "before" if before takes up too much time
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list currently added datasets - zero case", async function () {
			try {
				const result = await facade.listDatasets();
				console.log(result);
				return expect(result).to.have.lengthOf(0);
			} catch (e) {
				console.error("error caught");
			}
		});

		it("should list currently added datasets - one case", async function () {
			try {
				await facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections);
				await facade.addDataset("new-dataset-2",
					getContentFromArchives("subsetRoom1.zip"), InsightDatasetKind.Rooms);
				const result = await facade.listDatasets();
				// console.log("1" + result);
				return expect(result).to.have.deep.members
				([{id: "new-dataset", kind: "sections", numRows: 60},
					{id: "new-dataset-2", kind: "rooms", numRows: 5}]);
				// return expect(result).to.eventually.have.lengthOf(2);
			} catch (e) {
				// console.log(e);
				return expect(e).to.be.null;
			}
		});
		it ("should test crash handling for ListDataSet",
			async function() {
				try {
					const result = await facade.addDataset("new-dataset", sectionsSubset, InsightDatasetKind.Sections);
					const result3 = await facade.addDataset("new-dataset-2",
						getContentFromArchives("subsetRoom1.zip"), InsightDatasetKind.Rooms);
					// console.log(result3);
					expect(result3).to.have.deep.members(["new-dataset","new-dataset-2"]);
					// instantiate a new InsightFacade
					let newFacade = new InsightFacade();
					const result2 = newFacade.listDatasets();
					expect(result2).to.eventually.have.deep.members(
						[{id: "new-dataset", kind: "sections", numRows: 60},
							{id: "new-dataset-2", kind: "rooms", numRows: 5}]);
					return expect(result2).to.eventually.have.lengthOf(2);
				} catch (e) {
					return expect(e).to.be.null;
				}
			});

	});

	describe("performQuery tests", function() {

		before(  async function() {
			clearDisk();
			sectionsSubset = getContentFromArchives("subset1.zip");
			qFacade = new InsightFacade();
			try {
				await qFacade.addDataset("sections", sections, InsightDatasetKind.Sections);
				await qFacade.addDataset("sectionsSubset", sectionsSubset, InsightDatasetKind.Sections);
				qFacadeNew = new InsightFacade();
				await qFacadeNew.removeDataset("sectionsSubset");
				// console.log("remove second");
				qFacadeNew2 = new InsightFacade();
				await qFacadeNew2.addDataset("sectionsSubset", sectionsSubset, InsightDatasetKind.Sections);
				await qFacadeNew2.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			} catch(e) {
				return expect(e).to.be.null;
			}
		});

		function assertOnError(actual: unknown, expected: Error): void {
			if (expected === "InsightError") {
				expect(actual).to.be.an.instanceOf(InsightError);
			} else if (expected === "ResultTooLargeError") {
				expect(actual).to.be.an.instanceOf(ResultTooLargeError);
			} else {
				expect.fail("error not thrown!");
			}
		}

		function assertOnResult(actual: unknown, expected: Output): void {
			expect(actual).to.have.lengthOf((expected as unknown as InsightResult[]).length - 1);
			expect(actual).to.have.deep.members(expected as any);
			expect(actual).to.be.an.instanceOf(Array);
		}

		function errorValidator(error: any): error is Error {
			return error === "InsightError" || error === "ResultTooLargeError";
		}

		folderTest<Input, Output, Error>(
			"performQuery tests",                                       // suiteName
			async (input: Input): Output => await qFacadeNew2.performQuery(input),       // target
			"./test/resources/queries",                                    // path
			{
				assertOnResult,
				assertOnError,                                                   // options
				errorValidator,
			}
		);

	});
});
