import {
	InsightError,
	InsightResult,
} from "./IInsightFacade";
import {HandleAfterQuery} from "./HandleAfterQuery";
export class SectionsQuery {
	public mField: string[] = ["Avg", "Pass", "Fail", "Audit", "Year", "rooms_lat", "rooms_lon", "rooms_seats"];

	public sField: string[] =
		["Subject", "Course", "Professor", "Title", "id", "rooms_fullname", "rooms_shortname",
			"rooms_number", "rooms_name", "rooms_address", "rooms_type", "rooms_furniture", "rooms_href"];

	public handleAfterQuery: HandleAfterQuery;
	constructor() {
		this.handleAfterQuery = new HandleAfterQuery();
	}

	public keepResult(columnKeys: string[], datapoint: any, databaseNames: string[]): any{
		let resultSection = {};
		if (columnKeys.length === 0) {
			throw new InsightError();
		}
		columnKeys.forEach((columns) => {
			if (!this.handleAfterQuery.validate.validDatasetReferenceCheck(columns, databaseNames)) {
				throw new InsightError();
			}
		});
		columnKeys.forEach((columns) => {
			let currentColumnName: string = this.handleAfterQuery.validate.columnNames[columns];
			if (currentColumnName === undefined) {
				throw new InsightError();
			}
			if (datapoint["Section"] === "overall" && currentColumnName === "Year") {
				resultSection = Object.assign(resultSection, {
					[columns]: 1900,
				});
			} else if (currentColumnName === "Year") {
				resultSection = Object.assign(resultSection, {
					[columns]: +(datapoint[currentColumnName]),
				});
			} else if (currentColumnName === "id") {
				resultSection = Object.assign(resultSection, {
					[columns]: (datapoint[currentColumnName]).toString(),
				});
			} else {
				resultSection = Object.assign(resultSection, {
					[columns]: datapoint[currentColumnName],
				});
			}
		});
		return resultSection;
	}

	public handleGT(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const gtKey: Record<string, unknown> = query["GT"] as Record<string, unknown>;
		if (!this.handleAfterQuery.validate.validDatasetReferenceCheck(Object.keys(gtKey)[0], databaseNames)) {
			throw new InsightError();
		}
		if (gtKey === undefined || (section[this.handleAfterQuery.validate.columnNames[Object.keys(gtKey)[0]]]) ===
			undefined || typeof Object.values(gtKey)[0] !== "number" || Object.values(gtKey).length !== 1 ||
			this.mField.indexOf(this.handleAfterQuery.validate.columnNames[Object.keys(gtKey)[0]]) === -1) {
			throw new InsightError();
		}
		const column = Object.keys(gtKey)[0];
		const columnValue: number = Object.values(gtKey)[0] as number;
		if (columnValue > Number.MAX_VALUE || columnValue < -Number.MAX_VALUE) {
			throw new InsightError();
		}
		if (this.handleAfterQuery.validate.columnNames[column] === "Year" && section["Section"] !== "overall") {
			return Number(section[this.handleAfterQuery.validate.columnNames[column]]) > columnValue;
		} else if (this.handleAfterQuery.validate.columnNames[column] === "Year" && section["Section"] === "overall") {
			return 1900 > columnValue;
		} else {
			return section[this.handleAfterQuery.validate.columnNames[column]] > columnValue;
		}
	}

	public handleLT(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const ltKey: Record<string, unknown> = query["LT"] as Record<string, unknown>;
		if (!this.handleAfterQuery.validate.validDatasetReferenceCheck(Object.keys(ltKey)[0], databaseNames)) {
			throw new InsightError();
		}
		if (ltKey === undefined || (section[this.handleAfterQuery.validate.columnNames[Object.keys(ltKey)[0]]]) ===
			undefined || typeof Object.values(ltKey)[0] !== "number" || Object.values(ltKey).length !== 1 ||
			this.mField.indexOf(this.handleAfterQuery.validate.columnNames[Object.keys(ltKey)[0]]) === -1) {
			throw new InsightError();
		}
		const column = Object.keys(ltKey)[0];
		const columnValue: number = Object.values(ltKey)[0] as number;
		if (columnValue > Number.MAX_VALUE || columnValue < -Number.MAX_VALUE) {
			throw new InsightError();
		}
		if (this.handleAfterQuery.validate.columnNames[column] === "Year" && section["Section"] !== "overall") {
			return Number(section[this.handleAfterQuery.validate.columnNames[column]]) < columnValue;
		} else if (this.handleAfterQuery.validate.columnNames[column] === "Year" && section["Section"] === "overall") {
			return 1900 < columnValue;
		} else {
			return section[this.handleAfterQuery.validate.columnNames[column]] < columnValue;
		}
	}

	public handleEQ(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const eqKey: Record<string, unknown> = query["EQ"] as Record<string, unknown>;
		if (!this.handleAfterQuery.validate.validDatasetReferenceCheck(Object.keys(eqKey)[0], databaseNames)) {
			throw new InsightError();
		}
		if (eqKey === undefined || (section[this.handleAfterQuery.validate.columnNames[Object.keys(eqKey)[0]]]) ===
			undefined || typeof Object.values(eqKey)[0] !== "number" || Object.values(eqKey).length !== 1 ||
			this.mField.indexOf(this.handleAfterQuery.validate.columnNames[Object.keys(eqKey)[0]]) === -1) {
			throw new InsightError();
		}
		const column = Object.keys(eqKey)[0];
		const columnValue: number = Object.values(eqKey)[0] as number;
		if (columnValue > Number.MAX_VALUE || columnValue < -Number.MAX_VALUE) {
			throw new InsightError();
		}
		if (this.handleAfterQuery.validate.columnNames[column] === "Year" && section["Section"] !== "overall") {
			return Number(section[this.handleAfterQuery.validate.columnNames[column]]) === columnValue;
		} else if (this.handleAfterQuery.validate.columnNames[column] === "Year" && columnValue === 1900) {
			return section["Section"] === "overall";
		} else {
			return section[this.handleAfterQuery.validate.columnNames[column]] === columnValue;
		}
	}

	public handleOR(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const orKeys: Record<string, unknown> = query["OR"] as Record<string, unknown>;
		if (orKeys === undefined || Object.values(orKeys).length < 1) {
			throw new InsightError();
		}
		let currBoolean = false;
		for (const keys of Object.values(orKeys)) {
			let key = keys as Record<string, unknown>;
			const currKey = Object.keys(key)[0];
			try {
				if (currKey === "EQ") {
					currBoolean = this.handleEQ(key, section, databaseNames);
				} else if (currKey === "LT") {
					currBoolean = this.handleLT(key, section, databaseNames);
				} else if (currKey === "GT") {
					currBoolean = this.handleGT(key, section, databaseNames);
				} else if (currKey === "AND") {
					currBoolean = this.handleAND(key, section, databaseNames);
				} else if (currKey === "OR") {
					currBoolean = this.handleOR(key, section, databaseNames);
				} else if (currKey === "IS") {
					currBoolean = this.handleIS(key, section, databaseNames);
				} else if (currKey === "NOT") {
					currBoolean = this.handleNOT(key, section, databaseNames);
				} else {
					throw new InsightError();
				}
			} catch (e) {
				throw new InsightError();
			}
			if (currBoolean) {
				return true;
			}
		}
		return false;
	}

	public handleAND(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const andKeys: Record<string, unknown> = query["AND"] as Record<string, unknown>;
		if (andKeys === undefined || Object.values(andKeys).length < 1) {
			throw new InsightError();
		}
		let currBoolean = false;
		for (const keys of Object.values(andKeys)) {
			let key = keys as Record<string, unknown>;
			const currKey = Object.keys(key)[0];
			try {
				if (currKey === "EQ") {
					currBoolean = this.handleEQ(key, section, databaseNames);
				} else if (currKey === "LT") {
					currBoolean = this.handleLT(key, section, databaseNames);
				} else if (currKey === "GT") {
					currBoolean = this.handleGT(key, section, databaseNames);
				} else if (currKey === "AND") {
					currBoolean = this.handleAND(key, section, databaseNames);
				} else if (currKey === "OR") {
					currBoolean = this.handleOR(key, section, databaseNames);
				} else if (currKey === "IS") {
					currBoolean = this.handleIS(key, section, databaseNames);
				} else if (currKey === "NOT") {
					currBoolean = this.handleNOT(key, section, databaseNames);
				} else {
					throw new InsightError();
				}
			} catch (e) {
				throw new InsightError();
			}
			if (!currBoolean) {
				return false;
			}
		}
		return true;
	}

	public handleIS(query: Record<string, unknown>, section: any , databaseNames: string[]): boolean {
		const isKey: Record<string, unknown> = query["IS"] as Record<string, unknown>;
		if (!this.handleAfterQuery.validate.validDatasetReferenceCheck(Object.keys(isKey)[0], databaseNames)) {
			throw new InsightError();
		}
		if (isKey === undefined || (section[this.handleAfterQuery.validate.columnNames[Object.keys(isKey)[0]]]) ===
			undefined || typeof Object.values(isKey)[0] !== "string" || Object.values(isKey).length !== 1 ||
			this.sField.indexOf(this.handleAfterQuery.validate.columnNames[Object.keys(isKey)[0]]) === -1) {
			throw new InsightError();
		}
		const column = Object.keys(isKey)[0];
		const columnValue: string = Object.values(isKey)[0] as string;
		if (columnValue.indexOf("*") === -1) {
			return columnValue === section[this.handleAfterQuery.validate.columnNames[column]].toString();
		} else if (columnValue.indexOf("*") === (columnValue.length - 1)) {
			return columnValue.substring(0, columnValue.indexOf("*")) ===
				section[this.handleAfterQuery.validate.columnNames[column]].toString().
					substring(0, columnValue.indexOf("*"));
		} else if (columnValue.indexOf("*") === 0 && columnValue.substring(1).indexOf("*") === -1) {
			return columnValue.substring(1) === section[this.handleAfterQuery.validate.columnNames[column]].toString().
				substring(section[this.handleAfterQuery.validate.columnNames[column]].
					toString().length - columnValue.substring(1).length);
		} else if (columnValue.indexOf("*") === 0 &&
			columnValue.substring(1).indexOf("*") === (columnValue.length - 2)) {
			return section[this.handleAfterQuery.validate.columnNames[column]].toString().
				includes(columnValue.substring(1, columnValue.length - 1));
		} else {
			throw new InsightError();
		}
	}

	public handleNOT(query: Record<string, unknown>, section: any, databaseNames: string[]): boolean {
		const notKeys: Record<string, unknown> = query["NOT"] as Record<string, unknown>;
		if (notKeys === undefined ||  Object.values(notKeys).length !== 1) {
			throw new InsightError();
		}
		let currBoolean = true;
		const currKey = Object.keys(notKeys)[0];
		try {
			if (currKey === "EQ") {
				currBoolean = this.handleEQ(notKeys, section, databaseNames);
			} else if (currKey === "LT") {
				currBoolean = this.handleLT(notKeys, section, databaseNames);
			} else if (currKey === "GT") {
				currBoolean = this.handleGT(notKeys, section, databaseNames);
			} else if (currKey === "AND") {
				currBoolean = this.handleAND(notKeys, section, databaseNames);
			} else if (currKey === "OR") {
				currBoolean = this.handleOR(notKeys, section, databaseNames);
			} else if (currKey === "IS") {
				currBoolean = this.handleIS(notKeys, section, databaseNames);
			} else if (currKey === "NOT") {
				currBoolean = this.handleNOT(notKeys, section, databaseNames);
			} else {
				throw new InsightError();
			}
		} catch (e) {
			throw new InsightError();
		}
		return !currBoolean;
	}
}
