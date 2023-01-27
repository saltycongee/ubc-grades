import {InsightDataset, InsightError, InsightResult} from "./IInsightFacade";
import Decimal from "decimal.js";
import {ValidDatasetReferenceHelper} from "./ValidDatasetReferenceHelper";

export class HandleAfterQuery {
	public mField: string[] = ["Avg", "Pass", "Fail", "Audit", "Year", "rooms_lat", "rooms_lon", "rooms_seats"];

	public sField: string[] =
		["Subject", "Course", "Professor", "Title", "id", "rooms_fullname", "rooms_shortname",
			"rooms_number", "rooms_name", "rooms_address", "rooms_type", "rooms_furniture", "rooms_href"];

	public APPLYTOKEN: string[] = ["MAX", "MIN", "AVG", "COUNT","SUM"];
	public validate: ValidDatasetReferenceHelper;
	constructor() {
		this.validate = new ValidDatasetReferenceHelper();
	}

	public handleORDER(query: any, resultArray: InsightResult[], columnKeys: string[], databaseNames: string[]):
		InsightResult[] {
		let sortedResult: InsightResult[] = [];
		const orderKey: Record<string, unknown> = query["ORDER"] as Record<string, unknown>;
		if (orderKey["dir"] === undefined || orderKey["keys"] === undefined) {
			const singleOrderKey: string = query["ORDER"] as string;
			if (singleOrderKey === undefined || columnKeys.indexOf(singleOrderKey) === -1 ||
				!this.validate.validDatasetReferenceCheck(singleOrderKey, databaseNames)) {
				throw new InsightError();
			}
			if (this.sField.indexOf(this.validate.columnNames[singleOrderKey]) > -1) {
				sortedResult = resultArray.sort((first, second) =>
					this.sortAscending(first[singleOrderKey] as string, second[singleOrderKey] as string,
						[], first, second));
			} else if (this.validate.columnNames[singleOrderKey] !== undefined) {
				sortedResult = resultArray.sort((first, second) =>
					(first[singleOrderKey] as number) - (second[singleOrderKey] as number));
			} else {
				throw new InsightError();
			}
		} else {
			if (orderKey["dir"] !== "UP" && orderKey["dir"] !== "DOWN") {
				throw new InsightError();
			}
			const directionKey: string = orderKey["dir"] as string;
			const orderKeys: string[] = orderKey["keys"] as string[];
			try {
				orderKeys.forEach((keys) => {
					if (this.validate.columnNames[keys] === undefined ||
					!this.validate.validDatasetReferenceCheck(keys, databaseNames) ||
						(resultArray.length !== 0 && resultArray[0][keys] === undefined)) {
						throw new InsightError();
					}
				});
			} catch (e) {
				throw new InsightError();
			}
			try {
				sortedResult = this.sortWithDir(directionKey, orderKeys, resultArray);
			} catch (e) {
				throw new InsightError();
			}
		}
		return sortedResult;
	}

	private sortWithDir(direction: string, orderKeys: string[], resultArray: InsightResult[]): InsightResult[] {
		let sortedResult: InsightResult[] = [];
		if (direction === "UP") {
			if (this.sField.indexOf(this.validate.columnNames[orderKeys[0]]) > -1) {
				sortedResult = resultArray.sort((first, second) =>
					this.sortAscending(first[orderKeys[0]] as string, second[orderKeys[0]] as string,
						orderKeys, first, second));
			} else if (this.validate.columnNames[orderKeys[0]] !== undefined) {
				sortedResult = resultArray.sort((first, second) =>
					this.sortAscending(first[orderKeys[0]] as number, second[orderKeys[0]] as number,
						orderKeys, first, second));
			} else {
				throw new InsightError();
			}
			return sortedResult;
		} else if (direction === "DOWN") {
			if (this.sField.indexOf(this.validate.columnNames[orderKeys[0]]) > -1) {
				sortedResult = resultArray.sort((first, second) =>
					this.sortDescending(first[orderKeys[0]] as string, second[orderKeys[0]] as string,
						orderKeys, first, second));
			} else if (this.validate.columnNames[orderKeys[0]] !== undefined) {
				sortedResult = resultArray.sort((first, second) =>
					this.sortDescending(first[orderKeys[0]] as number, second[orderKeys[0]] as number,
						orderKeys, first, second));
			} else {
				throw new InsightError();
			}
			return sortedResult;
		} else {
			throw new InsightError();
		}
	}

	private sortAscending(first: any, second: any, keys: string[], firstIR: InsightResult, secondIR: InsightResult):
		number {
		if (first < second) {
			return -1;
		} else if (first > second) {
			return 1;
		} else if (first === second && keys.length > 1){
			let keysCopy = keys;
			let returnValue = 0;
			keysCopy = keysCopy.slice(1);
			keysCopy.forEach((key) => {
				if (firstIR[key] < secondIR[key] && returnValue === 0) {
					returnValue = -1;
				} else if (firstIR[key] > secondIR[key] && returnValue === 0) {
					returnValue = 1;
				}
			});
			return returnValue;
		}
		return 0;
	}

	private sortDescending(first: any, second: any, keys: string[], firstIR: InsightResult, secondIR: InsightResult):
		number {
		if (first < second) {
			return 1;
		} else if (first > second) {
			return -1;
		} else if (first === second && keys.length > 1){
			let keysCopy = keys;
			let returnValue = 0;
			keysCopy = keysCopy.slice(1);
			keysCopy.forEach((key) => {
				if (firstIR[key] < secondIR[key] && returnValue === 0) {
					returnValue = 1;
				} else if (firstIR[key] > secondIR[key] && returnValue === 0) {
					returnValue = -1;
				}
			});
			return returnValue;
		}
		return 0;
	}

	public handleGROUP(query: Record<string, unknown>, resultArray: InsightResult[],
					   databaseNames: string[]): InsightResult[] {
		const groupKeys: string[] = query["GROUP"] as string[];
		const copyArray = resultArray as any[];
		const result = copyArray.reduce((groupedResult, insightResult) => {
			let keyString = "";
			groupKeys.forEach((key) => {
				if (keyString === "") {
					keyString = keyString + insightResult[key];
				} else {
					keyString = keyString + "-" + insightResult[key];
				}
			});
			groupedResult[keyString] = (groupedResult[keyString] || []);
			groupedResult[keyString].push(insightResult);
			return groupedResult;
		}, {});
		resultArray = [];
		try {
			resultArray = this.handleAPPLY(query, result);
		} catch (e) {
			throw new InsightError();
		}
		return resultArray;
	}

	public handleAPPLY(query: Record<string, unknown>, groupedResults: any): InsightResult[]{
		const groupKeys: string[] = query["GROUP"] as string[];
		const applyKeys: Record<string, unknown> = query["APPLY"] as Record<string, unknown>;
		let result: InsightResult[] = [];
		for (let groups in groupedResults) {
			let resultSection = {};
			let count = 0;
			for (const keys of Object.values(applyKeys)) {
				let returnVal: number = 0;
				let key = keys as Record<string, unknown>;
				const currKey = Object.keys(key)[0];
				const currKeyVal = Object.values(key)[0] as Record<string, unknown>;
				const applyToken = Object.keys(currKeyVal)[0] as string;
				const applyColumn = Object.values(currKeyVal)[0] as string;
				if (applyToken === "MAX" && this.mField.indexOf(this.validate.columnNames[applyColumn]) !== -1) {
					returnVal = this.handleMAX(groupedResults[groups], applyColumn);
				} else if (applyToken === "MIN" && this.mField.indexOf(this.validate.columnNames[applyColumn]) !== -1) {
					returnVal = this.handleMIN(groupedResults[groups], applyColumn);
				} else if (applyToken === "AVG" && this.mField.indexOf(this.validate.columnNames[applyColumn]) !== -1) {
					returnVal = this.handleAVG(groupedResults[groups], applyColumn);
				} else if (applyToken === "SUM" && this.mField.indexOf(this.validate.columnNames[applyColumn]) !== -1) {
					returnVal = this.handleSUM(groupedResults[groups], applyColumn);
				} else if (applyToken === "COUNT") {
					returnVal = this.handleCOUNT(groupedResults[groups], applyColumn);
				} else {
					throw new InsightError();
				}
				if (count === 0) {
					groupKeys.forEach((columns) => {
						resultSection = Object.assign(resultSection, {
							[columns]: groupedResults[groups][0][columns],
						});
					});
					count++;
				}
				resultSection = Object.assign(resultSection, {
					[currKey]: returnVal,
				});
			}
			result.push(resultSection);
		}
		return result;
	}

	private handleMAX(group: InsightResult[], applyColumn: string): number {
		let currMax = -1;
		group.forEach((key) => {
			if (currMax === -1) {
				currMax = key[applyColumn] as number;
			} else if (key[applyColumn] as number > currMax) {
				currMax = key[applyColumn] as number;
			}
		});
		return currMax;
	}

	private handleMIN(group: InsightResult[], applyColumn: string): number {
		let currMin: number = -1;
		group.forEach((key) => {
			const value = key[applyColumn] as number;
			if (currMin === -1) {
				currMin = value;
			} else if (currMin > value) {
				currMin = value;
			}
		});
		return currMin;
	}

	private handleAVG(group: InsightResult[], applyColumn: string): number {
		let currAVG = new Decimal(0);
		group.forEach((key) => {
			const value = new Decimal(key[applyColumn] as number);
			currAVG = currAVG.add(value);
		});
		let avg = currAVG.toNumber() / group.length;
		let res = Number(avg.toFixed(2));
		return res;
	}

	private handleSUM(group: InsightResult[], applyColumn: string): number {
		let currSum = new Decimal(0);
		group.forEach((key) => {
			const value = new Decimal(key[applyColumn] as number);
			currSum = currSum.add(value);
		});
		let res = Number(currSum.toFixed(2));
		return res;
	}

	private handleCOUNT(group: InsightResult[], applyColumn: string): number {
		let currCount: any[] = [];
		group.forEach((key) => {
			if (currCount.indexOf(key[applyColumn]) === -1) {
				currCount.push(key[applyColumn]);
			}
		});
		return currCount.length;
	}
}
