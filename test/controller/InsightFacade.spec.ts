import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {getContentFromArchives, clearDisk} from "../TestUtils";
import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import {assert, expect} from "chai";
import {httpRequest} from "../../src/controller/InsightFacadeParsers/HttpHelper";


describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDirectory = "./data";
	const datasetContents = new Map<string, string>();
	let content1: string;
	let content2: string;
	let contentEmpty: string;
	let contentInvalid: string;

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		sections: "./test/resources/archives/pair.zip",
		sections2: "./test/resources/archives/subset.zip",
		sectionsEmpty: "./test/resources/archives/sectionsEmpty.zip",
		sectionsInvalid: "./test/resources/archives/sectionsInvalid.zip",
		rooms: "./test/resources/archives/rooms.zip"
		// sections2: "./test/resources/archives/subset.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run of the test suite
		content1 = getContentFromArchives("pair.zip");
		content2 = getContentFromArchives("subset.zip");
		contentEmpty = getContentFromArchives("sectionsEmpty.zip");
		contentInvalid = getContentFromArchives("sectionsInvalid.zip");

		fs.removeSync(persistDirectory);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		it("testDuplicate", async function () {
			await insightFacade.addDataset("sections", content2, InsightDatasetKind.Sections);
			let ids = [];
			try {
				ids = await insightFacade.addDataset("sections", content2, InsightDatasetKind.Sections);
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidID", async function () {
			try {
				await insightFacade.addDataset("   ", content2, InsightDatasetKind.Sections);
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidID2", async function () {
			try {
				await insightFacade.addDataset("_", content2, InsightDatasetKind.Sections);
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidKind", async function () {
			try {
				await insightFacade.addDataset("sections", content2, ("invalid" as InsightDatasetKind));
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});

		// Deletions
		it("testDeleteDataset", async function () {
			await insightFacade.addDataset("id", content2, InsightDatasetKind.Sections);
			await insightFacade.removeDataset("id");
			expect(await insightFacade.listDatasets()).to.have.length(0);
		});
		it("testDeleteNA", async function () {
			try {
				await insightFacade.removeDataset("id");// should fail and throw an error
				assert(false, "Failed to throw error");
			} catch (e) {
				assert(e instanceof NotFoundError);
			}
		});
		it("testDeleteSomethingElse", async function () {
			await insightFacade.addDataset("id0" , content2, InsightDatasetKind.Sections);
			try {
				await insightFacade.removeDataset("id1");// should fail and throw an error
				assert(false, "Failed to throw error");
			} catch (e) {
				assert(e instanceof NotFoundError);
			}
			let datasets = await insightFacade.listDatasets();
			expect(datasets).to.have.length(1);
			await insightFacade.removeDataset("id0");
			datasets = await insightFacade.listDatasets();
			expect(datasets).to.have.length(0);
		});
		it("mostly trash, shouldnt fail", async function () {
			const mostTrash = getContentFromArchives("mostTrash.zip");
			await insightFacade.addDataset("sections", mostTrash, InsightDatasetKind.Sections);
			const list = await insightFacade.listDatasets();
			assert(list[0].numRows === 2);
		});
		it("Missing key", async function () {
			const errorSet = getContentFromArchives("subsetWithError.zip");
			await insightFacade.addDataset("sections", errorSet, InsightDatasetKind.Sections);
			const list = await insightFacade.listDatasets();
			assert(list[0].numRows === 1);
		});
	});

	describe("AddDataset", function() {
		let facade: InsightFacade;
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		it ("Add invalid id with underscore should return InsightError", async function() {
			try {
				await facade.addDataset("sections_1", content1, InsightDatasetKind.Sections);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("Add invalid id with only whitespaces should return InsightError", async function() {
			try {
				await facade.addDataset("      ", content1, InsightDatasetKind.Sections);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("adding same ID twice should return InsightError and testing single section dataset add", async function() {
			try {
				const insightDatasets = await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(1);
				expect(insightDatasets).to.have.deep.members(["sections"]);
			} catch (err) {
				expect.fail("should not have thrown an error");
			}
			try {
				await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("testing valid multiple dataset add", async function() {
			try {
				const singleInsightDataset = await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
				expect(singleInsightDataset).to.be.an.instanceof(Array);
				expect(singleInsightDataset).to.have.length(1);
				expect(singleInsightDataset).to.have.deep.members(["sections"]);
				const multiInsightDataset = await facade.
					addDataset("sections-2", content2, InsightDatasetKind.Sections);
				expect(multiInsightDataset).to.be.an.instanceof(Array);
				expect(multiInsightDataset).to.have.length(2);
				expect(multiInsightDataset).to.have.deep.members(["sections", "sections-2"]);
			} catch (err) {
				expect.fail("should not have thrown error");
			}
		});

		it ("empty dataset should return InsightError", async function() {
			try {
				await facade.addDataset("sections", contentEmpty, InsightDatasetKind.Sections);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("invalid dataset should return InsightError", async function() {
			try {
				await facade.addDataset("sections", contentInvalid, InsightDatasetKind.Sections);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});
	});

	describe("RemoveDataset", function() {
		let facade: InsightFacade;
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		it ("removing a dataset that has not been added yet should return NotFoundError", async function() {
			try {
				await facade.removeDataset("sections");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(NotFoundError);
			}
		});

		it ("Remove invalid id with underscore should return InsightError", async function() {
			try {
				await facade.removeDataset("sections_1");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("Remove invalid id with only whitespaces should return InsightError", async function() {
			try {
				await facade.removeDataset("      ");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("valid remove of single Dataset", async function() {
			try {
				const singleInsightDataset = await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
				expect(singleInsightDataset).to.be.an.instanceof(Array);
				expect(singleInsightDataset).to.have.length(1);
				expect(singleInsightDataset).to.have.deep.members(["sections"]);
				const removedDataset = await facade.removeDataset("sections");
				expect(removedDataset).to.equal("sections");
			} catch {
				expect.fail("should not have thrown error");
			}
			try {
				await facade.removeDataset("sections");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(NotFoundError);
			}
		});

		it ("valid remove of multiple Datasets", async function() {
			try {
				const singleInsightDataset = await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
				expect(singleInsightDataset).to.be.an.instanceof(Array);
				expect(singleInsightDataset).to.have.length(1);
				expect(singleInsightDataset).to.have.deep.members(["sections"]);
				const multiInsightDataset = await facade.
					addDataset("sections-2", content2, InsightDatasetKind.Sections);
				expect(multiInsightDataset).to.be.an.instanceof(Array);
				expect(multiInsightDataset).to.have.length(2);
				expect(multiInsightDataset).to.have.deep.members(["sections", "sections-2"]);
				const firstRemovedDataset = await facade.removeDataset("sections-2");
				expect(firstRemovedDataset).to.equal("sections-2");
				const secondRemovedDataset = await facade.removeDataset("sections");
				expect(secondRemovedDataset).to.equal("sections");
			} catch (err) {
				expect.fail("should not have thrown error");
			}
		});
	});

	// From piazza video
	describe("ListDatasets", function() {
		let facade: InsightFacade;
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});
		it("should return no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should return one dataset", function() {
			return facade.addDataset("sections", content2, InsightDatasetKind.Sections)
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					}]);

					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(1);
					const [insightDataset] = insightDatasets;
					expect(insightDataset).to.have.property("id");
					expect(insightDataset.id).to.equal("sections");
				});
		});

		it("should return multiple datasets", function() {
			return facade.addDataset("sections", content2, InsightDatasetKind.Sections)
				.then(() => {
					return facade.addDataset("sections-2", content2, InsightDatasetKind.Sections);
				})
				.then(() => {
					return facade.listDatasets();
				}).then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "sections",
							kind: InsightDatasetKind.Sections,
							numRows: 2,
						},
						{
							id: "sections-2",
							kind: InsightDatasetKind.Sections,
							numRows: 2,
						}
					];
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
					expect(insightDatasets).to.have.length(2);
				});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("ListDataset", function () {
		let facade: InsightFacade;
		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});
		it("testInitiate", async function () {
			// test empty
			let datasets = (await facade.listDatasets());
			expect(datasets).to.have.length(0);
			// test single
			await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
			datasets = await facade.listDatasets();
			expect(datasets).to.deep.equal([{
				id: "sections",
				kind: InsightDatasetKind.Sections,
				numRows: 2
			}]);
		});
		it("testSeveral", async function () {
			await facade.addDataset("sections", content2, InsightDatasetKind.Sections);
			await facade.addDataset("sections2", content2, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();
			expect(datasets).to.have.length(2);
		});
	});
	describe("PerformQuery Tests", () => {
		before(function () {
			this.timeout(20000);
			console.info(`Before: ${this.test?.parent?.title}`);
			fs.removeSync(persistDirectory);
			insightFacade = new InsightFacade();
			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset(
					"sections",
					datasetContents.get("sections") ?? "",
					InsightDatasetKind.Sections
				),
				insightFacade.addDataset(
					"courses",
					datasetContents.get("sections") ?? "",
					InsightDatasetKind.Sections
				),
				insightFacade.addDataset(
					"rooms",
					datasetContents.get("rooms") ?? "",
					InsightDatasetKind.Rooms
				),
				insightFacade.addDataset(
					"ubcRooms",
					datasetContents.get("rooms") ?? "",
					InsightDatasetKind.Rooms
				),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDirectory);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		// Assert value equals expected
		function assertResult(actual: any, expected: InsightResult[]): void {
			expect(actual).to.have.deep.members(expected);
			expect(actual.length).to.equal(expected.length);
		}

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: assertResult,
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});

	describe("PerformQueryErrorTests", function() {
		let facade: InsightFacade;
		const validQuery = {
			WHERE: {
				EQ: {
					ubc_avg: 50
				}
			},
			OPTIONS: {
				COLUMNS: [
					"ubc_dept",
					"ubc_avg"
				],
				ORDER: "ubc_avg"
			}
		};
		const invalidQuery = {
			WHERE: {
				EQ: {
					courses_avg: 50
				}
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"sections_avg"
				],
				ORDER: "courses_avg"
			}
		};

		before(function () {
			this.timeout(10000);
			console.info(`Before: ${this.test?.parent?.title}`);
			fs.removeSync(persistDirectory);
			facade = new InsightFacade();
			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset(
					"sections",
					datasetContents.get("sections") ?? "",
					InsightDatasetKind.Sections
				),
				facade.addDataset(
					"courses",
					datasetContents.get("sections") ?? "",
					InsightDatasetKind.Sections
				),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDirectory);
		});
		it ("referencing multiple datasets should return InsightError", async function() {
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("referencing a dataset not added should return InsightError", async function() {
			try {
				await facade.performQuery(validQuery);
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});
	});
});
describe("Non Isolated Tests", () => {
	it("Add then delete", async function () {
		let insightFacade = new InsightFacade();
		const content2 = getContentFromArchives("subset.zip");
		await insightFacade.addDataset("eye dee", content2, InsightDatasetKind.Sections);
		insightFacade = new InsightFacade();
		await insightFacade.removeDataset("eye dee");
	});
});

describe("Room Tests", () => {
	let insightFacade: InsightFacade;

	const persistDirectory = "./data";
	let rooms: string;
	let tableExample: string;
	let roomsSubset: string;

	before(function () {
		// Just in case there is anything hanging around from a previous run of the test suite
		fs.removeSync(persistDirectory);

		rooms = getContentFromArchives("rooms.zip");
		tableExample = getContentFromArchives("tableExample.zip");
		roomsSubset = getContentFromArchives("roomsSubset.zip");
	});
	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		it("Add and Duplicate", async function () {
			await insightFacade.addDataset("sections", rooms, InsightDatasetKind.Rooms);
			let ids = [];
			try {
				ids = await insightFacade.addDataset("sections", rooms, InsightDatasetKind.Rooms);
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidID", async function () {
			try {
				await insightFacade.addDataset("   ", tableExample, InsightDatasetKind.Rooms);
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidID2", async function () {
			try {
				await insightFacade.addDataset("_", tableExample, InsightDatasetKind.Rooms);
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("testInvalidKind", async function () {
			try {
				await insightFacade.addDataset("sections", tableExample, ("invalid" as InsightDatasetKind));
				// Should throw error because invalid kind
				assert(false);
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});

		// Deletions
		it("testDeleteDataset", async function () {
			await insightFacade.addDataset("id", tableExample, InsightDatasetKind.Rooms);
			await insightFacade.removeDataset("id");
			expect(await insightFacade.listDatasets()).to.have.length(0);
		});
		it("testDeleteNA", async function () {
			try {
				await insightFacade.removeDataset("id");// should fail and throw an error
				assert(false, "Failed to throw error");
			} catch (e) {
				assert(e instanceof NotFoundError);
			}
		});
		it("testDeleteSomethingElse", async function () {
			await insightFacade.addDataset("id0" , tableExample, InsightDatasetKind.Rooms);
			try {
				await insightFacade.removeDataset("id1");// should fail and throw an error
				assert(false, "Failed to throw error");
			} catch (e) {
				assert(e instanceof NotFoundError);
			}
			let datasets = await insightFacade.listDatasets();
			expect(datasets).to.have.length(1);
			await insightFacade.removeDataset("id0");
			datasets = await insightFacade.listDatasets();
			expect(datasets).to.have.length(0);
		});
		it("mostly trash, shouldnt fail", async function () {
			const roomMostTrash = getContentFromArchives("roomMostTrash.zip");
			await insightFacade.addDataset("rooms", tableExample, InsightDatasetKind.Rooms);
			const list = await insightFacade.listDatasets();
			assert(list[0].numRows === 38);
		});
		it("Missing key, should fail", async function () {
			const errorSet = getContentFromArchives("roomsWithError.zip");
			try {
				await insightFacade.addDataset("rooms", errorSet, InsightDatasetKind.Rooms);
				assert(false, "Failed to throw error");
			} catch (e) {
				assert(e instanceof InsightError);
			}
		});
		it("Invalid geolocation", async function () {
			const geoError = getContentFromArchives("roomsWithBadGeo.zip");
			await insightFacade.addDataset("rooms", geoError, InsightDatasetKind.Rooms);
			const list = await insightFacade.listDatasets();
			assert(list[0].numRows === 34);
		});
	});

	describe("RemoveDataset", function() {
		let facade: InsightFacade;
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDirectory);
		});

		it ("Remove invalid id with only whitespaces should return InsightError", async function() {
			try {
				await facade.removeDataset("      ");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it ("valid remove of single Dataset", async function() {
			try {
				const singleInsightDataset = await facade.addDataset("rooms", roomsSubset, InsightDatasetKind.Rooms);
				expect(singleInsightDataset).to.be.an.instanceof(Array);
				expect(singleInsightDataset).to.have.length(1);
				expect(singleInsightDataset).to.have.deep.members(["rooms"]);
				const removedDataset = await facade.removeDataset("rooms");
				expect(removedDataset).to.equal("rooms");
			} catch {
				expect.fail("should not have thrown error");
			}
			try {
				await facade.removeDataset("rooms");
				expect.fail("Error should've been thrown");
			} catch (err) {
				expect(err).to.be.an.instanceof(NotFoundError);
			}
		});

		it ("valid remove of multiple Datasets", async function() {
			try {
				const singleInsightDataset = await facade.addDataset("rooms", roomsSubset, InsightDatasetKind.Rooms);
				expect(singleInsightDataset).to.be.an.instanceof(Array);
				expect(singleInsightDataset).to.have.length(1);
				expect(singleInsightDataset).to.have.deep.members(["rooms"]);
				const multiInsightDataset = await facade.
					addDataset("rooms-2", roomsSubset, InsightDatasetKind.Rooms);
				expect(multiInsightDataset).to.be.an.instanceof(Array);
				expect(multiInsightDataset).to.have.length(2);
				expect(multiInsightDataset).to.have.deep.members(["rooms", "rooms-2"]);
				const firstRemovedDataset = await facade.removeDataset("rooms-2");
				expect(firstRemovedDataset).to.equal("rooms-2");
				const secondRemovedDataset = await facade.removeDataset("rooms");
				expect(secondRemovedDataset).to.equal("rooms");
			} catch (err) {
				expect.fail("should not have thrown error");
			}
		});
	});
	describe("HTTP test", () => {
		it("Add then delete", async function () {
			const a = await httpRequest("2211 Wesbrook Mall");
			assert(a.lat = 49.26408);
			assert(a.lon = -123.24605);
		});
	});
});

