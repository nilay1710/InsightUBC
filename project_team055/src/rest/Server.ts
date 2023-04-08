import express, {Application, Request, Response} from "express";
import * as http from "http";
import * as fs from "fs-extra";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, NotFoundError} from "../controller/IInsightFacade";
import {getContentFromArchives} from "../../test/TestUtil";
import * as buffer from "buffer";
import {readJSONSync} from "fs-extra";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static facade: InsightFacade;
	// instantiate a new facade each time an endpoint is called in case a cleardisk() is called in between

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		/** NOTE: you can serve static frontend files in from your express server
		 * by uncommenting the line below. This makes files in ./frontend/public
		 * accessible at http://localhost:<port>/
		 */
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		// TODO: your other endpoints should go here

		// PUT
		// allows one to submit a zip file that will be parsed and used for future queries.
		// The zip file content will be sent 'raw' as a buffer in the PUT's body, and you will
		// need to convert it to base64 server side. (addDataset)
		this.express.put("/dataset/:id/:kind", Server.addDset);

		// DELETE
		// deletes the existing dataset stored. This will delete both disk and memory caches for the dataset
		// for the id, meaning that subsequent queries for that id should fail unless a new PUT happens first.
		// (removeDataset)
		this.express.delete("/dataset/:id", Server.removeDset);

		// POST
		// - sends the query to the application. The query will be in JSON format in the POST's body.
		// NOTE: the server may be shutdown between the PUT and the POST. This endpoint should always
		// check for a persisted data structure on disk before returning a missing dataset error.
		// (performQuery)
		this.express.post("/query", Server.performQ);

		// GET
		// returns a list of datasets that were added. (listDataset)
		this.express.get("/datasets", Server.listDset);

	}

	// PUT
	// - "/dataset/:id/:kind"
	private static async addDset(req: Request, res: Response) {
		try {
			Server.facade = new InsightFacade();  // instantiate a new facade
				// console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			let response: string[];
			if (req.params.kind === "rooms") {
				// console.log(req.body);
				response = await Server.facade.addDataset(req.params.id as string,
					(req.body as Buffer).toString("base64"),
					InsightDatasetKind.Rooms);
				res.status(200).json({result: response});
			} else if (req.params.kind === "sections") {
				// console.log(req.body);
				response = await Server.facade.addDataset(req.params.id as string,
					(req.body as Buffer).toString("base64"),
					InsightDatasetKind.Sections);
				res.status(200).json({result: response});
			} else {
				res.status(400).json({error: "error - wrong kind"});
			}
		} catch (err) {
			res.status(400).json({error: "error - caught"});
		}
	}

	// DELETE
	// - "/dataset/:id"
	private static async removeDset(req: Request, res: Response) {
		try {
			Server.facade = new InsightFacade();  // instantiate a new facade
			// console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = await Server.facade.removeDataset(req.params.id);
			res.status(200).json({result: response});
		} catch (err) {
			// console.log("Error: " + (err as Error).constructor.name);
			if ((err as Error).constructor.name === "NotFoundError") {
				res.status(404).json({error: "NotFoundError"});   // different status code for a NotFoundError
			} else {
				res.status(400).json({error: "InsightError"});
			}
		}
	}

	// POST
	// - "/query"
	private static async performQ(req: Request, res: Response) {
		try {
			Server.facade = new InsightFacade();  // instantiate a new facade
			// let query = JSON.parse(req.body);
			// if (typeof req.body !== "object") {
			// 	JSON.parse(req.body);
			// }
			// console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = await Server.facade.performQuery(JSON.parse(JSON.stringify(req.body)));
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: "error - caught"});
		}
	}

	// GET
	// - "/datasets"
	private static async listDset(req: Request, res: Response) {
		Server.facade = new InsightFacade(); // instantiate a new facade
		// console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
		const response =  await Server.facade.listDatasets();
		res.status(200).json({result: response}); // listDataset only resolves
	}

	/**
	 * The next two methods handle the echo service.
	 * These are almost certainly not the best place to put these, but are here for your reference.
	 * By updating the Server.echo function pointer above, these methods can be easily moved.
	 */
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			// when something is declared as static , used Server.<var> instead of this.<var>
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: "error"});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
