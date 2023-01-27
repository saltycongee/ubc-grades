import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import chai, {expect, use} from "chai";
import chaiHttp from "chai-http";
import * as fs from "fs-extra";
import {getContentFromArchives} from "../TestUtils";
import {InsightError} from "../../src/controller/IInsightFacade";


describe("Server", function () {

	let facade: InsightFacade;
	let server: Server;
	let sections: Buffer;
	let invalid: Buffer;
	let rooms: Buffer;

	use(chaiHttp);

	before(function () {
		facade = new InsightFacade();
		server = new Server(4321);
		sections = fs.readFileSync("test/resources/archives/pair.zip");
		invalid = fs.readFileSync("test/resources/archives/sectionsInvalid.zip");
		rooms = fs.readFileSync("test/resources/archives/rooms.zip");
		// TODO: start server here once and handle errors properly
		server.start();
		// Just in case there is anything hanging around from a previous run of the test suite
	});

	after(function () {
		// TODO: stop server here once!
		server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	it("PUT test for courses dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/ubcSections/sections")
				.send(sections)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.body.result).to.be.an.instanceof(Array);
					expect(res.body.result).to.have.length(1);
					expect(res.body.result).to.have.deep.members(["ubcSections"]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("PUT test for rooms dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/ubcRooms/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.body.result).to.be.an.instanceof(Array);
					expect(res.body.result).to.have.length(2);
					expect(res.body.result).to.have.deep.members(["ubcRooms", "ubcSections"]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("PUT test for invalid dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/sections/sections")
				.send(invalid)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("GET test for list datasets", function () {
		try {
			return chai.request("http://localhost:4321")
				.get("/datasets")
				.then(function (res: ChaiHttp.Response) {
					expect(res.body.result).to.be.an.instanceof(Array);
					expect(res.body.result).to.have.length(2);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("GET test for database IDs", function () {
		try {
			return chai.request("http://localhost:4321")
				.get("/ids")
				.then(function (res: ChaiHttp.Response) {
					expect(res.body.result).to.be.an.instanceof(Array);
					expect(res.body.result).to.have.length(2);
					expect(res.body.result).to.have.deep.members(["ubcRooms", "ubcSections"]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("POST test for perform query", function () {
		const validQuery = {
			WHERE: {
				EQ: {
					ubcSections_avg: 50
				}
			},
			OPTIONS: {
				COLUMNS: [
					"ubcSections_dept",
					"ubcSections_avg"
				],
				ORDER: "ubcSections_avg"
			}
		};
		try {
			return chai.request("http://localhost:4321")
				.post("/query")
				.send(validQuery)
				.then(function (res: ChaiHttp.Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("POST test for invalid query", function () {
		const invalidQuery = {
			WHERE: {
				EQ: {
					ubcCourses_avg: 50
				}
			},
			OPTIONS: {
				COLUMNS: [
					"ubcCourses_dept",
					"sections_avg"
				],
				ORDER: "ubcCourses_avg"
			}
		};
		try {
			return chai.request("http://localhost:4321")
				.post("/query")
				.send(invalidQuery)
				.then(function (res: ChaiHttp.Response) {
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("DELETE test for sections dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.delete("/dataset/ubcSections")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.body.result).to.equal("ubcSections");
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("DELETE test for rooms dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.delete("/dataset/ubcRooms")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.body.result).to.equal("ubcRooms");
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("DELETE test for NotFoundError", function () {
		try {
			return chai.request("http://localhost:4321")
				.delete("/dataset/asdf")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.status).to.be.equal(404);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("DELETE test for InsightError", function () {
		try {
			return chai.request("http://localhost:4321")
				.delete("/dataset/as_df")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
