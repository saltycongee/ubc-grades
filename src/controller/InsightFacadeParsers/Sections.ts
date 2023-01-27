import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import InsightFacade from "../InsightFacade";

export interface DataSet {
	[key: string]: [any];
}

export default class Sections {

	public owner: InsightFacade;

	constructor(owner: InsightFacade) {
		this.owner = owner;
	}

	public async addDatasetNoWrite(id: string, content: string, kind: InsightDatasetKind) {
		const courses = await this.readDataSet(content);
		this.owner.data = Object.assign(this.owner.data, {
			[id]: courses,
		});
		let numRows = 0;
		const keys: string[] = Object.keys(courses);
		if (keys.length === 0) {
			return Promise.reject(new InsightError("Empty dataset"));
		}
		try {
			for (const course in keys) {
				numRows += courses[keys[course]].length;
			}
		} catch (e) {
			return Promise.reject(new InsightError("Invalid dataset"));
		}
		this.owner.databaseIDs.push(id);
		this.owner.database.push({
			id: id,
			kind: kind,
			numRows: numRows
		});
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await this.addDatasetNoWrite(id, content,kind);
			if (!fs.pathExistsSync(this.owner.persistDirectory)) {
				await fs.mkdir(this.owner.persistDirectory);
			}
			// Writes zip file
			// await fs.writeFile(this.persistDirectory + "/" + id + ".zip", content, "base64");
			fs.writeJsonSync(this.owner.persistDirectory + "/" + "data.json", this.owner.data);
			fs.writeJsonSync(this.owner.persistDirectory + "/" + "database.json", this.owner.database);
			return Promise.resolve(this.owner.databaseIDs);
		} catch (e) {
			return Promise.reject(new InsightError());
		}
	}

	private async readDataSet(content: string): Promise<DataSet> {
		const jszip = new JSZip();
		try {
			const zipfiles = await jszip.loadAsync(content, {base64: true});
			let courses = {};
			const promiseList = [];
			const requiredKeys = ["Subject","Course","Avg","Professor","Title","Pass","Fail","Audit","id","Year",];
			let anySingleSectionInserted = false;
			if (zipfiles != null) {
				for (const zipFile in zipfiles.files) {
					try {
						if (!zipfiles.files[zipFile].dir) {
							promiseList.push(
								zipfiles.files[zipFile].async("text").then((dirtyData) => {
									const data = JSON.parse(dirtyData).result;
									for (let section in Object.keys(data)) {
										if (!requiredKeys.every((key) => Object.prototype.
											hasOwnProperty.call(data[section], key))) {
											data.splice(section, 1);
										}
									}
									if (!anySingleSectionInserted) {
										if (data.length > 0) {
											anySingleSectionInserted = true;
										}
									}
									courses = Object.assign(courses, {
										[zipFile.toString()]: data
									});
								})
							);
						}
					} catch (e) {
						// Failed read
					}

				}
				// Apparently any SINGLE file makes the zip valid??
				const promiseOutcome = await Promise.allSettled(promiseList);
				if (promiseOutcome.every((promise) => (String(promise) === "rejected"))) {
					throw new Error();
				}
				if (!anySingleSectionInserted) {
					throw new InsightError("No sections added");
				}
			}
			return courses;
		} catch (e) {
			return Promise.reject(new InsightError(String(e)));
		}
	}

	public async removeDataset(id: string): Promise<string> {
		const index = this.owner.databaseIDs.indexOf(id);
		// delete this.databaseIDs[index];
		this.owner.databaseIDs.splice(index, 1);
		for (const key in this.owner.database) {
			if (this.owner.database[key].id === id) {
				// delete this.database[key];
				this.owner.database.splice(Number(key), 1);
				break;
			}
		}
		delete this.owner.data[id];
		fs.removeSync(this.owner.persistDirectory + "/" + id + ".zip");
		fs.writeJsonSync(this.owner.persistDirectory + "/" + "database.json", this.owner.database);
		// implement removing from this.data and files

		return Promise.resolve(id);
	}
}

