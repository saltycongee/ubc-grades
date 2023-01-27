import InsightFacade from "../InsightFacade";
import {InsightDatasetKind, InsightError} from "../IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";
import {DataSet} from "./Sections";
import {parse} from "parse5";
import {ChildNode, Element, ParentNode, TextNode} from "parse5/dist/tree-adapters/default";
import {Agent} from "http";
import {BuildingInfo, GeoLocation, RoomData, RoomPartialInfo, ShortNameMap} from "./DataStructures";
import {httpRequest} from "./HttpHelper";
import {
	findAllText,
	findBuildingInfo,
	findLink, findTbodyInTable,
	findTables,
	findText,
	isChild,
	isElement,
	isParent,
	isText
} from "./HttpParserHelper";

interface RoomHolder {
	[key: string]: RoomData;
}

export default class Rooms {

	public owner: InsightFacade;

	constructor(owner: InsightFacade) {
		this.owner = owner;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.addDatasetNoWrite(id, content,kind);
		if (!fs.pathExistsSync(this.owner.persistDirectory)) {
			await fs.mkdir(this.owner.persistDirectory);
		}
		fs.writeJsonSync(this.owner.persistDirectory + "/" + "data.json", this.owner.data);
		fs.writeJsonSync(this.owner.persistDirectory + "/" + "database.json", this.owner.database);
		return Promise.resolve(this.owner.databaseIDs);
	}

	public async addDatasetNoWrite(id: string, content: string, kind: InsightDatasetKind){
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

	// Any single failed table = throw error
	private async exploreTable(table: ParentNode, zipfiles: JSZip, buildings: RoomHolder) {
		let listOfBuildings: ShortNameMap[] = findTbodyInTable(table);
		if (listOfBuildings.length === 0) {
			return Promise.reject(new InsightError("Table has no tbody"));
		}
		let promiseList: Array<Promise<RoomData[]>> = [];
		for (const page in listOfBuildings) {
			promiseList.push(this.readPage(listOfBuildings[page].url,
				listOfBuildings[page].room_shortname, zipfiles, buildings));
		}
		const promiseOutcome = await Promise.allSettled(promiseList);
		if (promiseOutcome.every((promise) => (String(promise) === "rejected"))) {
			throw new InsightError("No sections added");
		}
		await Promise.allSettled(promiseList);
	}


	private async readPage(url: string, shortname: string, zipfiles: JSZip, buildings: RoomHolder): Promise<RoomData[]>{
		if (zipfiles.files[url.substring(2)] != null) {
			const htmlFileZip = await zipfiles.files[url.substring(2)].async("text");
			const htmlFile = parse(htmlFileZip);
			const tables: ParentNode[] = findTables(htmlFile);
			const info: BuildingInfo = findBuildingInfo(htmlFile);
			let location: GeoLocation;
			try {
				location = await httpRequest(info.address);
			} catch (e) {
				throw new InsightError("Failed to get Geolocation");
			}
			let roomList: RoomPartialInfo[] = [];
			for (const table in tables) {
				roomList = roomList.concat(this.findRoomList(tables[table]));
			}
			let output: RoomData[] = [];
			for (const room in roomList) {
				output.push({
					rooms_fullname: info.name,
					rooms_shortname: shortname,
					rooms_number: roomList[room].room_number,
					rooms_name: shortname + "_" + roomList[room].room_number,
					rooms_address: info.address,
					rooms_lat: location.lat,
					rooms_lon: location.lon,
					rooms_seats: roomList[room].rooms_seat,
					rooms_type: roomList[room].rooms_type,
					rooms_furniture: roomList[room].rooms_furniture,
					rooms_href: roomList[room].rooms_href
				});
			}
			if (output.length > 0) {
				Object.assign(buildings, {
					[output[0].rooms_shortname]: output
				});
			}
		}
		return Promise.reject("Can't find page");
	}

	private findRoomList(table: ParentNode): RoomPartialInfo[] {
		let tcomponents: ParentNode[] = [];
		for (const child in table.childNodes) {
			const childNode = table.childNodes[child];
			if (isParent(childNode)) {
				// This is a room
				tcomponents.push(childNode);
			}
		}
		const tbody = tcomponents[1];
		let rooms: RoomPartialInfo[] = [];
		for (const row in tbody.childNodes) {
			const childNode = tbody.childNodes[row];
			if (isParent(childNode)) {
				try {
					rooms.push(this.findRoom(childNode));
				} catch (e) {
					// Failed a row in a room read
				}
			}
		}
		return rooms;
	}

	private findRoom(table: ParentNode): RoomPartialInfo {
		let infoList: {[key: string]: string} = {};
		let link: string = "";
		if (isChild(table)) {
			infoList = findAllText(table);
			link = findLink(table);
		}
		const out: RoomPartialInfo = {
			room_number: infoList["Room Details"],
			rooms_seat: parseInt(infoList["views-field views-field-field-room-capacity"], 10),
			rooms_type: infoList["views-field views-field-field-room-type"].trim(),
			rooms_furniture: infoList["views-field views-field-field-room-furniture"].trim(),
			rooms_href: link
		};
		if (out.room_number === undefined || out.rooms_furniture === undefined || out.rooms_href === undefined
			|| out.rooms_seat === undefined || out.rooms_type === undefined) {
			throw new InsightError("Missing Key");
		}
		return (out);
	}


	private async readDataSet(content: string): Promise<DataSet> {
		const jszip = new JSZip();

		const zipfiles: JSZip = await jszip.loadAsync(content, {base64: true});
		let buildings = {};
		if (zipfiles != null && zipfiles.files["index.htm"] != null) {
			const htmlFileZip = await zipfiles.files["index.htm"].async("text");
			const htmlFile = parse(htmlFileZip);
			let promiseList: Array<Promise<any>> = [];
			const tablesFound: ParentNode[]  = findTables(htmlFile);

			for (const table in tablesFound) {
				promiseList.push(this.exploreTable(tablesFound[table], zipfiles, buildings));
			}
			// Apparently any SINGLE file makes the zip valid??
			const promiseOutcome = await Promise.allSettled(promiseList);
			if (promiseOutcome.every((promise) => (String(promise) === "rejected"))) {
				throw new InsightError("No sections added");
			}
		}
		return buildings;
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
