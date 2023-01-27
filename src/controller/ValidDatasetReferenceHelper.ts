import {InsightDataset, InsightError} from "./IInsightFacade";

export class ValidDatasetReferenceHelper {
	public columnNames: Record<string, string> = {};
	public datasetName: string = "";
	public datasetNameHasBeenSet = false;
	public validExternalKeys: string[] = [];
	public database: InsightDataset[] = [];
	public validDatasetReferenceCheck(datasetName: string, databaseNames: string[]): boolean {
		let dataName: string;
		if (this.validExternalKeys.indexOf(datasetName) !== -1) {
			return true;
		} else if (datasetName.indexOf("_") === -1 || datasetName.indexOf(" ") !== -1) {
			return false;
		} else {
			dataName = datasetName.substring(0, datasetName.indexOf("_"));
		}
		if (!this.datasetNameHasBeenSet) {
			this.datasetName = dataName;
			this.datasetNameHasBeenSet = true;
			if (databaseNames.indexOf(this.datasetName) === -1) {
				return false;
			}
			let datasetKind: string = "";
			this.database.forEach((dataset) => {
				if (dataset.id === this.datasetName) {
					datasetKind = dataset.kind;
				}
			});
			this.setColumnNames(datasetKind);
			return true;
		} else if (this.datasetName !== dataName || dataName === undefined ||
			databaseNames.indexOf(this.datasetName) === -1) {
			return false;
		} else {
			return true;
		}
	}

	private setColumnNames(datasetKind: string) {
		if (datasetKind === "sections") {
			this.columnNames[this.datasetName + "_dept"] = "Subject";
			this.columnNames[this.datasetName + "_id"] = "Course";
			this.columnNames[this.datasetName + "_avg"] = "Avg";
			this.columnNames[this.datasetName + "_instructor"] = "Professor";
			this.columnNames[this.datasetName + "_title"] = "Title";
			this.columnNames[this.datasetName + "_pass"] = "Pass";
			this.columnNames[this.datasetName + "_fail"] = "Fail";
			this.columnNames[this.datasetName + "_audit"] = "Audit";
			this.columnNames[this.datasetName + "_uuid"] = "id";
			this.columnNames[this.datasetName + "_year"] = "Year";
		} else if (datasetKind === "rooms") {
			this.columnNames[this.datasetName + "_fullname"] = "rooms_fullname";
			this.columnNames[this.datasetName + "_shortname"] = "rooms_shortname";
			this.columnNames[this.datasetName + "_number"] = "rooms_number";
			this.columnNames[this.datasetName + "_name"] = "rooms_name";
			this.columnNames[this.datasetName + "_address"] = "rooms_address";
			this.columnNames[this.datasetName + "_lat"] = "rooms_lat";
			this.columnNames[this.datasetName + "_lon"] = "rooms_lon";
			this.columnNames[this.datasetName + "_seats"] = "rooms_seats";
			this.columnNames[this.datasetName + "_type"] = "rooms_type";
			this.columnNames[this.datasetName + "_furniture"] = "rooms_furniture";
			this.columnNames[this.datasetName + "_href"] = "rooms_href";
		}
	}

	public checkForTransformations(query: any, columnKeys: string[], databaseNames: string[]): string[] {
		let groupKeyCheck: string[] = [];
		let tempColumnKeys =  [...new Set(columnKeys)];
		if (query["TRANSFORMATIONS"] !== undefined || columnKeys === undefined || columnKeys.length === 0) {
			const transformationKeys: Record<string, unknown> = query["TRANSFORMATIONS"] as Record<string, unknown>;
			const applyKeys: Record<string, unknown> = transformationKeys["APPLY"] as Record<string, unknown>;
			const groupKeys: string[] = transformationKeys["GROUP"] as string[];
			if (applyKeys === undefined || groupKeys === undefined) {
				throw new InsightError();
			}
			groupKeyCheck = groupKeys;
			let count = 0;
			for (const keys of Object.values(applyKeys)) {
				let key = keys as Record<string, unknown>;
				const currKeyVal = Object.values(key)[0] as Record<string, unknown>;
				const applyColumn = Object.values(currKeyVal)[0] as string;
				const currKey = Object.keys(key)[0] as string;
				if (currKey === "" || currKey.indexOf(" ") !== -1 || currKey.indexOf("_") !== -1 ||
					this.columnNames[currKey] !== undefined) {
					throw new InsightError();
				}
				this.validExternalKeys.push(currKey);
				groupKeyCheck.push(currKey);
				this.columnNames[currKey] = currKey;
				if (tempColumnKeys.indexOf(applyColumn) === -1) {
					count++;
					tempColumnKeys.push(applyColumn);
				}
			}
			if (groupKeyCheck.length !== tempColumnKeys.length - count) {
				throw new InsightError();
			} else {
				tempColumnKeys.forEach((keys) => {
					if (!this.validDatasetReferenceCheck(keys, databaseNames)) {
						throw new InsightError();
					}
				});
			}
		}
		return tempColumnKeys;
	}
}
