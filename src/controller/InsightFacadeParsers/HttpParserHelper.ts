// Finds the specific text in a div
import {ChildNode, Element, ParentNode, TextNode} from "parse5/dist/tree-adapters/default";
import {InsightError} from "../IInsightFacade";
import {BuildingInfo, ShortNameMap} from "./DataStructures";

export function isParent(node: ChildNode|ParentNode): node is ParentNode {
	return "childNodes" in (node as ParentNode);
}
export function isElement(node: Element|ParentNode|ChildNode): node is Element {
	return "attrs" in (node as Element);
}
export function isText(node: ChildNode|TextNode): node is TextNode {
	return "value" in (node as TextNode);
}
export function isChild(node: ChildNode|undefined|ParentNode): node is ChildNode {
	return "nodeName" in (node as ChildNode);
}

export function findText(div: ChildNode): string {
	// There should be only one text node found
	if (isParent(div)) {
		let nodesToProcess: ChildNode[] = [div];
		while (nodesToProcess.length > 0) {
			const nextNode = nodesToProcess.pop();
			if (nextNode == null) {
				continue;
			}
			if (isText(nextNode)) {
				return nextNode.value;
			} else if (isParent(nextNode)) {
				nodesToProcess = nodesToProcess.concat(nextNode.childNodes);
			}
		}
	}
	throw new InsightError("Node entered doesn't contain text children");
}

// Finds xth text component that appears in a div
export function findAllText(div: ChildNode): {[key: string]: string} {
	// There should be only one text node found
	let outputList: {[key: string]: string} = {};
	if (isParent(div)) {
		let nodesToProcess: ChildNode[] = [div];
		while (nodesToProcess.length > 0) {
			const nextNode = nodesToProcess.shift();
			if (nextNode == null) {
				continue;
			}
			if (isText(nextNode)) {
				if (nextNode.parentNode != null && isElement(nextNode.parentNode)) {
					Object.assign(outputList, {
						[nextNode.parentNode.attrs[nextNode.parentNode.attrs.length - 1].value]: nextNode.value
					});
				}
			} else if (isParent(nextNode)) {
				nodesToProcess = nodesToProcess.concat(nextNode.childNodes);
			}
		}
	}
	return outputList;
}

export function findLink(div: ChildNode): string {
	// There should be only one text node found
	if (isParent(div)) {
		let nodesToProcess: ChildNode[] = [div];
		while (nodesToProcess.length > 0) {
			const nextNode = nodesToProcess.shift();
			if (nextNode == null) {
				continue;
			}
			if (isElement(nextNode) && nextNode.attrs[0].name === "href") {
				return nextNode.attrs[0].value;
			} else if (isParent(nextNode)) {
				nodesToProcess = nodesToProcess.concat(nextNode.childNodes);
			}
		}
	}
	throw new InsightError("No links found");
}

export function findTables(htmlFile: ParentNode): ParentNode[] {
	let nodesToExplore: ParentNode[] = [htmlFile];
	let tablesFound: ParentNode[] = [];

	while (nodesToExplore.length > 0) {
		const currentNode = nodesToExplore.pop();
		if (currentNode == null) {
			continue;
		}
		if (currentNode.nodeName === "table") {
			tablesFound.push(currentNode);
		}
		for (const childNode in currentNode.childNodes) {
			const node = currentNode.childNodes[childNode];
			if (isParent(node)){
				nodesToExplore.push(node);
			}
		}
	}
	return tablesFound;
}

// Find Name and Address
export function findBuildingInfo(htmlFile: ParentNode): BuildingInfo {
	let nodesToExplore: ParentNode[] = [htmlFile];
	while (nodesToExplore.length > 0) {
		const currentNode = nodesToExplore.pop();
		if (currentNode == null) {
			continue;
		}
		if (isElement(currentNode) && currentNode.attrs.some((attribute)=>{
			return (attribute.value === "building-info");
		})) {
			return(readInfo(currentNode));
		}
		for (const childNode in currentNode.childNodes) {
			const node = currentNode.childNodes[childNode];
			if (isParent(node)){
				nodesToExplore.push(node);
			}
		}
	}
	throw new InsightError("No building info found");
}

// Specifically for the "building-info" div, to find it's first two entries
export function readInfo(building: Element): BuildingInfo {
	const output: BuildingInfo = {
		name: findText(building.childNodes[1]),
		address: findText(building.childNodes[3])
	};
	return output;
}

export function findTbodyInTable(table: ParentNode): ShortNameMap[]{
	let listOfPages: ShortNameMap[] = [];
	for (const childNodes in table.childNodes) {
		const tbody = table.childNodes[childNodes];
		if (isParent(tbody)) {
			if (tbody.nodeName === "tbody") {
				for (const row in tbody.childNodes) {
					const room = tbody.childNodes[row];
					if (isParent(room) && room.nodeName === "tr") {
						let url: string = "";
						let shortname: string = "";
						const td = room.childNodes[5];
						if(isParent(td)) {
							const textNode = td.childNodes[1];
							if (isElement(textNode)) {
								url = textNode.attrs[0].value;
							}
						}
						const tr = room.childNodes[3];
						if(isParent(tr)) {
							const textNode = tr.childNodes[0];
							if (isText(textNode)) {
								shortname = textNode.value.trim();
							}
						}
						if (!(url === "" || shortname === "")) {
							listOfPages.push({
								room_shortname: shortname,
								url:url
							});
						}
					}
				}
			}
		}
	}
	return listOfPages;
}

