const numberFields = ['avg', 'pass', 'fail', 'audit', 'year', 'lat', 'lon', 'seats'];

export function parseQueryTable(query, id) {
	if (query == null) {
		return null;
	}
	if (query.combinator === "AND" || query.combinator === "OR") {
		let valueList = []
		for (const rule in query.rules) {
			valueList.push(parseQueryTable(query.rules[rule], id));
		}
		return ({
			[query.combinator]: valueList
		});
	} else if (query.combinator === "NOT") {
		return ({
			"NOT": parseQueryTable(query.rules[0], id)
		});
	} else {
		if (numberFields.includes(query.field)) {
			return ({
				[query.operator]: {
					[id+"_"+query.field] : parseInt(query.value)
				}
			});
		} else {
			return ({
				[query.operator]: {
					[id+"_"+query.field] : query.value
				}
			});
		}
	}
}

export function parseApplys(applyTable, id) {
	let out = []
	for (const apply in applyTable) {
		out.push({
			[applyTable[apply].name]: {
				[applyTable[apply].token]: id+"_"+applyTable[apply].key
			}
		})
	}
	return out;
}

export function createQuery(query, applyTable, columns, groups, sortKeys, sortDirection, id) {

	columns = columns.map(sortKey => (applyTable.some((apply)=>apply.name===sortKey))?sortKey:id+"_"+sortKey);
	sortKeys = sortKeys.map(sortKey => (applyTable.some((apply)=>apply.name===sortKey))?sortKey:id+"_"+sortKey);
	groups = groups.map(group => id+"_"+group);
	let out = {
		WHERE: parseQueryTable(query, id),
		OPTIONS: {
			COLUMNS: columns
		}
	}
	if (sortKeys.length > 0) {
		out.OPTIONS = Object.assign(out.OPTIONS, {
			ORDER: {
				keys: sortKeys,
				dir: sortDirection
			}
		})
	}
	if (groups.length > 0) {
		out = Object.assign(out,{TRANSFORMATIONS: {
			GROUP: groups,
			APPLY: parseApplys(applyTable, id)
		}});
	}
	return out;
}

export default(parseApplys, parseQueryTable);
