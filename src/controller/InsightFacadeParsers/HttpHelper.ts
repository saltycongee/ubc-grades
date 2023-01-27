import http from "http";
import {GeoLocation} from "./DataStructures";

export function httpRequest(location: string): Promise<GeoLocation> {
	const apiReq: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team091/" + location;
	return new Promise((resolve, reject) => {
		http.get(apiReq, (res) => {
			res.setEncoding("utf8");
			let body = "";
			res.on("data", (data) => {
				body += data;
			});
			res.on("end", () => {
				const out: GeoLocation = JSON.parse(body);
				if (out.lat === undefined) {
					reject("HTTP returned error");
				}
				resolve(out);
			});
			res.on("error", (e) => {
				reject(e);
			});
		});
	});
}
