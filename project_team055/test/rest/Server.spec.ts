import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect} from "chai";
import request, {Response} from "supertest";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {readFileSync} from "fs";
import fs, {readJSONSync} from "fs-extra";

// CITATION: https://github.com/ladjs/supertest
// USE: used to inform implementation of the test suite
describe("Server", () => {

	let facade: InsightFacade;
	let server: Server;

	before(async () => {
		facade = new InsightFacade();
		server = new Server(4321);
		try {
			await server.start();
		} catch(err) {
			expect(err).to.be.null;
		}
		// TODO: start server here once and handle errors properly
	});

	after(async () => {
		try {
			await server.stop();
		} catch(err) {
			expect(err).to.be.null;
		}
		// TODO: stop server here once!
	});

	beforeEach(function () {
		clearDisk();
		facade = new InsightFacade();
		// might want to add some process logging here to keep track of what's going on
	});
	afterEach(() => {
		clearDisk();
		// might want to add some process logging here to keep track of what's going on
	});

	// Sample on how to format PUT requests
	/*
	it("PUT test for courses dataset", async () => {
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then((res: Response) => {
					expect(res.status).to.be.equal(200);
					// more assertions here
				})
				.catch((err) => {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	 */

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
	describe("PUT Tests", () => {

		it("PUT test for courses dataset", async () => {
			try {
				return request("http://localhost:4321")
					.put("/dataset/section/sections")
					.send(fs.readFileSync("test/resources/archives/pair.zip")) // CITATION: referred to the given getContentFromArchives() implementation for this
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						expect(res.status).to.be.equal(200);
						// console.log(res.body.result);
						expect(res.body.result).to.have.deep.members(["section"]);
						// expect(facade.getDatasets()).to.have.deep.members(["section"]);
						// more assertions here
					})
					.catch((err) => {
						// some logging here please!
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});

		it("should test PUT InsightError", async () => {
			try {
				return request("http://localhost:4321")
					.put("/dataset/section/sections")
					.send(fs.readFileSync("test/resources/archives/invalid-course-not-Json.zip"))
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						expect(res.status).to.be.equal(400);
						// more assertions here
					})
					.catch((err) => {
						// some logging here please!
						expect.fail();
					});
			} catch (err) {
				// and some more logging here!
			}
		});
	});

	describe("GET Tests", () => {
		it("should test whether GET resolves with an added Dataset", async () => {
			try {
				// first add a dataset to the InsightFacade instance 'facade'
				// and then the persistence to disk will allow us to perform
				// procedures on the dataset
				await facade.addDataset("section", getContentFromArchives("test/resources/archives/pair.zip"),
					InsightDatasetKind.Sections);
				return request("http://localhost:4321")
					.get("/datasets")
					.then((res: Response) => {
						expect(res.status).to.be.equal(200);
						// console.log(res.body.result);
						expect(res.body.result).to.have.deep.members([{id: "section", kind: "sections", numRows: 60}]);
					})
					.catch((err) => {
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});

		it("should test whether GET resolves without any added Dataset", async () => {
			try {
				return request("http://localhost:4321")
					.get("/datasets")
					.then((res: Response) => {
						expect(res.status).to.be.equal(200);
						// console.log(res.body.result.length);
						expect(res.body.result).to.have.length(0);
					})
					.catch((err) => {
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
	});

	describe("DELETE Tests", () => {
		it("should test DELETE success case", async () => {
			try {
				await facade.addDataset("section", getContentFromArchives("test/resources/archives/pair.zip"),
				 		InsightDatasetKind.Sections);
				return request("http://localhost:4321")
					.delete("/dataset/section")
					.then((res: Response) => {
						expect(res.status).to.be.equal(200);
						// console.log(res.body.result);
						expect(res.body.result).to.have.deep.members(["section"]);
					})
					.catch((err) => {
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
	});

	it("should test DELETE NotFoundError", async () => {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/doesNotExist")
				.then((res: Response) => {
					expect(res.status).to.be.equal(404);
				})
				.catch((err) => {
					// console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
		}
	});
	it("should test DELETE InsightError", async () => {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/_") // "_" included in idstring throws an InsightError
				.then((res: Response) => {
					expect(res.status).to.be.equal(400);
				})
				.catch((err) => {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
		}
	});

	// CITATION: https://github.com/ladjs/supertest
	// USE: Used for setting the correct type for the request
	describe("POST Tests", () => {

		it("should test POST for a valid query", async () => {
			await facade.addDataset("sections", getContentFromArchives("pair.zip"), InsightDatasetKind.Sections);
			try {
				return request("http://localhost:4321")
					.post("/query")
					.send(readJSONSync("test/resources/archives/testQuerySuccess.json")) // readJSONSync -> suggestion from IntelliJ
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						expect(res.status).to.be.equal(200);
						// console.log(res.body.result);
						expect(res.body.result).to.have.length(46);
					})
					.catch((err) => {
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("should test POST for an invalid query", async () => {
			try {
				return request("http://localhost:4321")
					.post("/query")
					.send(readJSONSync("test/resources/archives/testQueryFailure.json"))
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						expect(res.status).to.be.equal(400);
					})
					.catch((err) => {
						// console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
	});
});
