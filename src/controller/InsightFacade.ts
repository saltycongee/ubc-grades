import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError,
} from "./IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";
import {SectionsQuery} from "./SectionsQuery";
import Sections from "./InsightFacadeParsers/Sections";
import Rooms from "./InsightFacadeParsers/Rooms";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

interface DataSet {
	[key: string]: [any];
}

export default class InsightFacade implements IInsightFacade {
	public database: InsightDataset[];
	public databaseIDs: string[];
	public data: DataSet = {};
	public persistDirectory = "./data";
	public sectionsQuery: SectionsQuery;
	public sectionHandler: Sections;
	public roomHandler: Rooms;

	constructor() {
		this.database = [];
		this.databaseIDs = [];
		this.sectionsQuery = new SectionsQuery();
		try {
			if (fs.pathExistsSync(this.persistDirectory + "/" + "data.json")) {
				this.data = fs.readJsonSync(this.persistDirectory + "/" + "data.json");
				this.database = fs.readJsonSync(this.persistDirectory + "/" + "database.json");
				this.databaseIDs = this.database.map((item)=> item.id);
			}
		} catch (e) {
			console.log("No files loaded");
		}
		// This way the two databases should be linked
		this.sectionHandler = new Sections(this);
		this.roomHandler = new Rooms(this);

		console.log("InsightFacadeImpl::init()");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.databaseIDs.includes(id) || /^\s+$|.*_.*/.test(id)) {
			return Promise.reject(new InsightError("ID invalid or already used"));
		}
		if (!(kind === InsightDatasetKind.Sections || kind === InsightDatasetKind.Rooms)) {
			return Promise.reject(new InsightError("Invalid Kind"));
		}
		if (kind === "sections") {
			return await this.sectionHandler.addDataset(id, content, kind);
		} else if (kind === "rooms"){
			return await this.roomHandler.addDataset(id, content, kind);
			// return
		} else {
			throw new InsightError("Unimplemeented Error");
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (/^\s+$|.*_.*/.test(id)) {
			return Promise.reject(new InsightError("ID invalid or already used"));
		}
		if (!this.databaseIDs.includes(id)) {
			return Promise.reject(new NotFoundError("ID not in database"));
		}
		// Item is in database, so I can assume the find will never be return null
		const kind = String(this.database.find((dataSet) => (dataSet.id === id))?.kind);

		if (kind === "sections") {
			return this.sectionHandler.removeDataset(id);
		} else if (kind === "rooms"){
			return this.roomHandler.removeDataset(id);
			// return
		} else {
			throw new InsightError("Unimplemeented Error");
		}

	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.database);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		if (this.isQuery(query) && this.isValidQuery(query)) {
			const whereKeys: Record<string, unknown> = query["WHERE"] as Record<string, unknown>;
			const optionKeys: Record<string, unknown> = query["OPTIONS"] as Record<string, unknown>;
			let columnKeys: string[] = optionKeys["COLUMNS"] as string[];
			this.sectionsQuery.handleAfterQuery.validate.columnNames = {};
			this.sectionsQuery.handleAfterQuery.validate.datasetNameHasBeenSet = false;
			this.sectionsQuery.handleAfterQuery.validate.database = this.database;
			try {
				columnKeys = this.sectionsQuery.handleAfterQuery.validate.checkForTransformations(query, columnKeys,
					this.databaseIDs);
			} catch (e) {
				return Promise.reject(new InsightError("invalid Transformation Keys"));
			}
			let resultArray: InsightResult[] = [];
			try {
				resultArray = this.keepDatapoint(whereKeys, columnKeys);
			} catch (e) {
				return Promise.reject(new InsightError("handleQueryKey Error"));
			}
			if (Object.keys(query).length === 3) {
				const transformationKey: Record<string, unknown> =
					query["TRANSFORMATIONS"] as Record<string, unknown>;
				try {
					resultArray = this.sectionsQuery.handleAfterQuery.handleGROUP
					(transformationKey, resultArray, this.databaseIDs);
				} catch (e) {
					return Promise.reject(new InsightError("Group error"));
				}
			}
			if (Object.keys(optionKeys).length === 2) {
				try {
					resultArray = this.sectionsQuery.handleAfterQuery.handleORDER
					(optionKeys, resultArray, columnKeys, this.databaseIDs);
				} catch (e) {
					return Promise.reject(new InsightError("Order error"));
				}
			} else if (Object.keys(optionKeys).length > 2) {
				return Promise.reject(new InsightError("Too many option keys"));
			}
			if (resultArray.length > 5000) {
				return Promise.reject(new ResultTooLargeError("Too Large"));
			}
			// console.log(resultArray);
			return Promise.resolve(resultArray);
		}
		return Promise.reject(new InsightError());
	}

	private keepDatapoint(whereKeys: Record<string, unknown>, columnKeys: string[]): InsightResult[] {
		let resultArray: InsightResult[] = [];
		let keepDatapoint: boolean = false;
		let dataName: string = "";
		for (let datasets of Object.keys(this.data)) {
			for (let columns of columnKeys) {
				if (columns.indexOf("_") !== -1) {
					if (datasets === columns.substring(0, columns.indexOf("_"))) {
						dataName = datasets;
						break;
					}
				}
			}
			if (dataName !== "") {
				break;
			}
		}
		if (dataName === "") {
			throw new InsightError();
		}
		for (let courses in this.data[dataName]) {
			this.data[dataName][courses].forEach((datapoint: any) => {
				try {
					keepDatapoint = this.handleQueryKey(whereKeys, datapoint);
					if (keepDatapoint) {
						try {
							resultArray.push
							(this.sectionsQuery.keepResult
							(columnKeys, datapoint, this.databaseIDs));
						} catch (e) {
							throw new InsightError();
						}
					}
				} catch (e) {
					throw new InsightError();
				}
			});
		}
		return resultArray;
	}

	private handleQueryKey(keys: Record<string, unknown>, datapoint: any): boolean {
		let keepDatapoint: boolean;
		const dataName = Object.keys(this.data)[0];
		if (Object.keys(keys)[0] === "GT") {
			keepDatapoint = this.sectionsQuery.handleGT(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "LT") {
			keepDatapoint = this.sectionsQuery.handleLT(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "EQ") {
			keepDatapoint = this.sectionsQuery.handleEQ(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "OR") {
			keepDatapoint = this.sectionsQuery.handleOR(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "AND") {
			keepDatapoint = this.sectionsQuery.handleAND(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "IS") {
			keepDatapoint = this.sectionsQuery.handleIS(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys)[0] === "NOT") {
			keepDatapoint = this.sectionsQuery.handleNOT(keys, datapoint, this.databaseIDs);
		} else if (Object.keys(keys).length === 0) {
			keepDatapoint = true;
		} else {
			throw new InsightError();
		}
		return keepDatapoint;
	}

	private isQuery(query: unknown): query is Record<string, unknown> {
		return query !== null && query !== undefined && typeof query === "object" && !Array.isArray(query);
	}

	private isValidQuery(query: object): boolean {
		if (!Object.prototype.hasOwnProperty.call(query, "WHERE") ||
			!Object.prototype.hasOwnProperty.call(query, "OPTIONS") ||
			Object.keys(this.data).length === 0) {
			return false;
		}
		return true;
	}

}
