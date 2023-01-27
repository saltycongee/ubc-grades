import React, {useEffect, useState} from "react";

import {
	Box,
	Button,
	createTheme, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
	FormControl, getAvatarGroupUtilityClass,
	Grid,
	InputLabel, Menu,
	MenuItem,
	Paper,
	Select, TableContainer, TablePagination, Table, TableCell, TableHead, TableRow, TextField,
	ThemeProvider, TableBody
} from "@mui/material";
import {findPath, formatQuery, QueryBuilder, RuleGroupType} from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';
import parseQueryTable, {createQuery, parseApplys} from "./helper";

const darkTheme = createTheme({
	palette: {
		mode: 'dark',
	},
});
const fields = [
	{ name: 'avg', label: 'AVG', inputType: 'number'  },
	{ name: 'pass', label: 'Pass', inputType: 'number'  },
	{ name: 'fail', label: 'Fail', inputType: 'number' },
	{ name: 'audit', label: 'Audit', inputType: 'number'  },
	{ name: 'year', label: 'Year', inputType: 'number'  },
	{ name: 'lat', label: 'Latitude', inputType: 'number' },
	{ name: 'lon', label: 'Longitude', inputType: 'number' },
	{ name: 'seats', label: 'Seats', inputType: 'number' },
	{ name: 'dept', label: 'Department'},
	{ name: 'id', label: 'ID'},
	{ name: 'instructor', label: 'Instructor'},
	{ name: 'title', label: 'Title'},
	{ name: 'uuid', label: 'uuid'},
	{ name: 'fullname', label: 'Full name'},
	{ name: 'shortname', label: 'Short name'},
	{ name: 'number', label: 'Number'},
	{ name: 'name', label: 'Name'},
	{ name: 'address', label: 'Address'},
	{ name: 'type', label: 'Type'},
	{ name: 'furniture', label: 'Furniture'},
	{ name: 'href', label: 'href'},
];
const operators = [
	{ name: 'EQ', label: '=' },
	{ name: 'LT', label: '<' },
	{ name: 'GT', label: '>' },
	{ name: 'IS', label: 'IS' },
];
const combinators = [
	{ name: 'AND', label: 'AND' },
	{ name: 'OR', label: 'OR' },
	{ name: 'NOT', label: 'NOT' },
];
const ApplyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

function App() {
	const [name, setName] = useState("");
	const [dataSetType, setDataSetType] = useState("sections");
	const [queryType, setQueryType] = useState("sections")
	const [file, setFile] = useState(null);
	const [error, setError] = useState("");
	const [dataSetIDs, setDataSetIDs] = useState(["id1", "id2"]);
	const [selectedID, setSelectedID] = useState("id1");
	const [columns, setColumns] = useState([]);
	const [sortDirection, setSortDirection] = useState("UP");
	const [sortKeys, setSortKeys] = useState([]);
	const [groupKeys, setGroupSortKeys] = useState([]);
	const [query, setQuery] = useState(null);
	const [applys, setApplys] = useState([]);
	const [data, setData] = useState([]);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	useEffect(()=>{
		fetch(`http://localhost:4321/ids`, {
			method: "GET"
		}).then((response)=>{
			if (response.status == 200) {
				response.json().then((output) => {
					if (output.hasOwnProperty("result")) {
						setDataSetIDs(output.result);
						setSelectedID(output.result[0]);
						console.log("Selected")
					}
				});
			}
		});
	},[]);

	function sendDataSet() {
		fetch(`http://localhost:4321/dataset/${name}/${dataSetType}`, {
			method: "PUT",
			body: file
		}).then((response)=>{
			let popup = ""
			if (response.status == 200) {
				popup += "Upload Successful\n"
			} else {
				popup += "Upload Failed"
			}
			response.json().then((out) => {
				console.log(out);
				popup += JSON.stringify(out);
				setError(popup);
			})
		});
	}
	function queryDataSets() {
		const JSONquery = createQuery(
			JSON.parse(formatQuery(query, 'json_without_ids')),
			applys,
			columns,
			groupKeys,
			sortKeys,
			sortDirection,
			selectedID
		);
		fetch(`http://localhost:4321/query`, {
			method: "POST",
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(JSONquery)
		}).then((response)=>{
			if (response.status === 200) {
				response.json().then((out) => {
					console.log(out);
					setData(out.result);
				})
			} else {
				setError("Query Failed");
			}

		});
	}

	return (
		<ThemeProvider theme={darkTheme}>
			<Grid container spacing={1} sx={{color: 'text.primary'}}>
				<Grid item xs={12} sm={6} >
					<Box sx={{color: 'text.primary', typography: 'body1', textAlign: 'left', overflow: 'auto' }}>
						<Box sx={{ typography: 'h6', boxShadow: 1}}>
							Upload Dataset
						</Box>
						<FormControl>
							<InputLabel>Dataset Type</InputLabel>
							<Select
								value={dataSetType?dataSetType:""}
								label="Dataset Type"
								onChange={(event) => (setDataSetType(event.target.value))}
							>
								<MenuItem value={"rooms"}>Rooms</MenuItem>
								<MenuItem value={"sections"}>Sections</MenuItem>
							</Select>
						</FormControl>
						<TextField
							label={"Dataset ID"}
							value={name}
							onChange={(event) => (setName(event.target.value))}
						/>
						<input color={"#FFFFFF"} type="file" onChange={(event)=> {setFile(Array.from(event.target.files)[0])}} />
						<Button
							onClick={(e) => (sendDataSet())}
							variant={"outlined"}
						>
							Upload
						</Button>
					</Box>
					<Grid container direction={"column"} spacing={1}>
						<Grid item xs={12}>
							<Box sx={{ typography: 'h6', boxShadow: 1}}>
								Queries
							</Box>
						</Grid>
						<Grid container item xs={12} spacing={1}>
							<Grid item xs = {6}>
								<FormControl fullWidth>
									<InputLabel id="selectTypeLabel">Query Type</InputLabel>
									<Select
										labelId="selectType"
										id="selectType"
										value={queryType?queryType:""}
										label="Query Type"
										onChange={(event) => (setQueryType(event.target.value))}
									>
										<MenuItem value={"rooms"}>Rooms</MenuItem>
										<MenuItem value={"sections"}>Sections</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs = {6}>
								<FormControl fullWidth>
									<InputLabel id="selectIDLabel">Select ID</InputLabel>
									<Select
										labelId="selectIDLabel"
										id="selectID"
										value={selectedID?selectedID:""}
										label="Select ID"
										onChange={(event) => (setSelectedID(event.target.value))}
									>
										{
											dataSetIDs?dataSetIDs.map((id) => (
												<MenuItem value={id}>{id}</MenuItem>
											)):null
										}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs = {12}>
								<FormControl fullWidth>
									<InputLabel id="SelectColumnsLabel">Select Columns</InputLabel>
									<Select
										labelId="SelectColumnsLabel"
										id="selectColumns"
										value={columns?columns:""}
										label="Select Columns"
										multiple
										onChange={(event) => {
											const {
												target: { value },
											} = event;
											setColumns(
												// On autofill we get a stringified value.
												typeof value === 'string' ? value.split(',') : value,
											);
										}}
									>
										{
											fields?fields.map((field) => (
												<MenuItem value={field.name}>{field.label}</MenuItem>
											)):null
										}
										{
											applys?applys.map((apply) => (
												<MenuItem value={apply.name}>{apply.name}</MenuItem>
											)):null
										}
									</Select>
								</FormControl>
							</Grid>
							<Grid container item xs = {12} spacing={1}>
								<Grid item xs = {8}>
									<FormControl fullWidth>
										<InputLabel id="SelectKeysLabel">Select Sort Keys</InputLabel>
										<Select
											labelId="SelectKeysLabel"
											id="SelectKeys"
											value={sortKeys?sortKeys:""}
											label="Select Sort Keys"
											multiple
											onChange={(event) => {
												const {
													target: { value },
												} = event;
												setSortKeys(
													// On autofill we get a stringified value.
													typeof value === 'string' ? value.split(',') : value,
												);
											}}
										>
											{
												columns?columns.map((column) => (
													<MenuItem value={column}>{column}</MenuItem>
												)):null
											}
											{

												applys?applys.map((apply) => (
													<MenuItem value={apply.name}>{apply.name}</MenuItem>
												)):null
											}
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={4}>
									<FormControl fullWidth>
										<InputLabel id="SelectSortDirectionLabel">Select Sort Direction</InputLabel>
										<Select
											labelId="SelectSortDirectionLabel"
											id="SelectSortDirection"
											value={sortDirection?sortDirection:""}
											label="Select Sort Keys"
											onChange={(event) => {
												setSortDirection(event.target.value);
											}}
										>
											<MenuItem value = "UP">UP</MenuItem>
											<MenuItem value = "DOWN">DOWN</MenuItem>
										</Select>
									</FormControl>
								</Grid>
							</Grid>
							<Grid item xs = {12}>
								<QueryBuilder
									fields={fields}
									query={query}
									operators={operators}
									combinators={combinators}
									onAddRule={(ruleType,path,group)=>{
										const parent = findPath(path, group);
										console.log((parent.combinator === "not" && parent.rules.length > 0));
										return ((parent.combinator === "not" && parent.rules.length > 0)?false:ruleType);
									}}
									onQueryChange={q => setQuery(q)}
								/>
							</Grid>
						</Grid>
						<Grid item xs={12}>
							<Box sx={{ typography: 'h6', boxShadow: 1}}>
								Transformations
							</Box>
						</Grid>
						<Grid container item xs = {12}>

						</Grid>
					</Grid>
					<Grid item container xs={12}>
						<Grid item xs={9}>
							<FormControl fullWidth>
								<InputLabel id="SelectGroupsLabel">Select Groups</InputLabel>
								<Select
									labelId="SelectGroupsLabel"
									id="SelectGroupKeys"
									value={groupKeys?groupKeys:""}
									label="Select Groups"
									multiple
									onChange={(event) => {
										const {
											target: { value },
										} = event;
										setGroupSortKeys(
											// On autofill we get a stringified value.
											typeof value === 'string' ? value.split(',') : value,
										);
									}}
								>
									{
										columns?columns.map((column) => (
											<MenuItem value={column}>{column}</MenuItem>
										)):null
									}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={3}>
							<Button
								fullWidth
								sx = {{height: "100%"}}
								onClick={(e) => {
									setApplys([...applys, {
										name: "",
										key: "",
										token: ""
									}]);
									// console.log(applys);
								}}
								variant={"outlined"}
							>
								Add Apply
							</Button>
						</Grid>
					</Grid>
					<Grid item container xs={12}>
						{
							applys?applys.map((pair, index) => (
								<Grid item container xs={12}>
									<Grid item xs={4}>
										<TextField
											fullWidth
											value={applys[index].name?applys[index].name:""}
											onChange={(event) => {
												const {
													target: { value },
												} = event;
												let newList = JSON.parse(JSON.stringify(applys));
												newList[index] = Object.assign(newList[index], {
													name: value
												})
												setApplys(newList);
											}}
										/>
									</Grid>
									<Grid item xs={3}>
										<FormControl fullWidth>
											<InputLabel id="SelectApplyLabal">Apply Key</InputLabel>
											<Select
												labelId="SelectGroupsLabel"
												id="SelectGroupKeys"
												value={applys[index].key?applys[index].key:""}
												label="Select Groups"
												onChange={(event) => {
													const {
														target: { value },
													} = event;
													let newList = JSON.parse(JSON.stringify(applys));
													newList[index] = Object.assign(newList[index], {
														key: value
													})
													setApplys(newList);
												}}
											>
												{
													fields?fields.map((field) => (
														<MenuItem value={field.name}>{field.label}</MenuItem>
													)):null
												}
											</Select>
										</FormControl>
									</Grid>
									<Grid item xs={3}>
										<FormControl fullWidth>
											<InputLabel id="SelectApplyLabal">Apply Tokens</InputLabel>
											<Select
												labelId="SelectGroupsLabel"
												id="SelectGroupKeys"
												value={applys[index].token?applys[index].token:""}
												label="Apply Tokens"
												onChange={(event) => {
													const {
														target: { value },
													} = event;
													let newList = JSON.parse(JSON.stringify(applys));
													newList[index] = Object.assign(newList[index], {
														token: value
													})
													setApplys(newList);
												}}
											>
												{
													ApplyTokens?ApplyTokens.map((token) => (
														<MenuItem value={token}>{token}</MenuItem>
													)):null
												}
											</Select>
										</FormControl>
									</Grid>
									<Grid item xs={2}>
										<Button
											fullWidth
											sx = {{height: "100%"}}
											onClick={(e) => {
												let newList = JSON.parse(JSON.stringify(applys));
												newList.splice(index,1);
												setApplys(newList);
											}}
											variant={"outlined"}
										>
											Remove
										</Button>
									</Grid>
								</Grid>
							)):null
						}
					</Grid>

					<Grid item>
						<Button
							onClick={(e) => {
								queryDataSets();
							}}
							variant={"outlined"}
						>
							Query
						</Button>
					</Grid>
				</Grid>

				<Grid xs={12} sm={6}>
				  <Grid item xs={12}>
					  <Box sx={{typography: 'h6'}}>
						  Output
					  </Box>
				  </Grid>
					<Grid item xs={12}>
						<TableContainer sx={{}}>
							<Table stickyHeader aria-label="sticky table">
								<TableHead>
									<TableRow>
										{}
									</TableRow>
								</TableHead>
								<TableBody>
									{data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index)=>(
										<TableRow hover role="checkbox" tabIndex={-1} key={index}>
											<TableCell>{JSON.stringify(row)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							rowsPerPageOptions={[10, 25, 100]}
							component="div"
							count={data.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={(e, newPage)=>{setPage(newPage)}}
							onRowsPerPageChange={(event) => {setRowsPerPage(+event.target.value); setPage(0)}}
						/>
					</Grid>
				</Grid>
			</Grid>
			<Dialog
				open={error.length>0}
				onClose={()=>{setError("")}}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			><DialogTitle id="alert-dialog-title">
				{"Upload response"}
			</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						{error}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={()=>{setError("")}}>Close</Button>
				</DialogActions>
			</Dialog>
		</ThemeProvider>
	);
}

export default App;
