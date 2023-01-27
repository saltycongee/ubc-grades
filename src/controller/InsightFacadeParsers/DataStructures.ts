interface RoomData {
	rooms_fullname: string;
	rooms_shortname: string;
	rooms_number: string;
	rooms_name: string;
	rooms_address: string;
	rooms_lat: number;
	rooms_lon: number;
	rooms_seats: number;
	rooms_type: string;
	rooms_furniture: string;
	rooms_href: string;
}

interface BuildingInfo {
	name: string;
	address: string;
}

interface RoomPartialInfo {
	room_number: string;
	rooms_seat: number;
	rooms_type: string;
	rooms_furniture: string;
	rooms_href: string;
}

interface ShortNameMap {
	room_shortname: string;
	url: string;
}

interface GeoLocation {
	lat: number;
	lon: number;
}

export {RoomData,BuildingInfo,RoomPartialInfo,ShortNameMap, GeoLocation};
