export default class Room {
	private fullName: string | false;  		// full building name
	private shortName: string | false; 		// short building name
	private number: string | false;			// the room number (not always a number which is why it's a string)
	private name: string | false;			// room id (<rooms_shortname> + "_" + <rooms_number>)
	private address: string | false;		// the building address
	private lat: number | false;			// the latitude of the building
	private lon: number | false;			// the longitude of the building
	private seats: number | false;			// number of seats in the building
	private type: string | false;			// the room type
	private furniture: string | false;		// the room furniture
	private href: string | false;			// the link to the full details online

	// all fields are instantiated to be false and are filled in as the relevant information becomes available
	constructor() {
		this.fullName = false;
		this.shortName = false;
		this.number = false;
		this.name = false;
		this.address = false;
		this.lat = false;
		this.lon = false;
		this.seats = false;
		this.type = false;
		this.furniture = false;
		this.href = false;
	}

	// Getters for each field:
	public getFullName(): string | false{
		return this.fullName;
	}

	public getShortName(): string | false{
		return this.shortName;
	}

	public getNumber(): string | false{
		return this.number;
	}

	public getName(): string | false{
		return this.name;
	}

	public getAddress(): string | false{
		return this.address;
	}

	public getLat(): number | false{
		return this.lat;
	}

	public getLon(): number | false{
		return this.lon;
	}

	public getSeats(): number | false{
		return this.seats;
	}

	public getType(): string | false{
		return this.type;
	}

	public getFurniture(): string | false{
		return this.furniture;
	}

	public getHref(): string | false{
		return this.href;
	}

	// Getters for each field:
	public setFullName(fullName: string | false): void {
		this.fullName = fullName;
	}

	public setShortName(shortName: string | false): void {
		this.shortName = shortName;
	}

	public setNumber(num: string | false): void {
		this.number = num;
	}

	public setName(name: string | false): void {
		this.name = name;
	}

	public setAddress(address: string | false): void {
		this.address = address;
	}

	public setLat(lat: number | false): void {
		this.lat = lat;
	}

	public setLon(lon: number | false): void {
		this.lon = lon;
	}

	public setSeats(seats: number | false): void {
		this.seats = seats;
	}

	public setType(type: string | false): void {
		this.type = type;
	}

	public setFurniture(furniture: string | false): void {
		this.furniture = furniture;
	}

	public setHref(href: string | false): void {
		this.href = href;
	}

	public setBuilding(longName: string, shortName: string, address: string, lat: number, lon: number) {
		this.setFullName(longName);
		this.setShortName(shortName);
		this.setAddress(address);
		this.setLon(lon);
		this.setLat(lat);
	}

	public setRoomWithoutLatandLon(number: string, seats: number, type: string,
								   furniture: string, href: string) {
		this.setNumber(number);
		this.setSeats(seats);
		this.setType(type);
		this.setFurniture(furniture);
		this.setHref(href);
		this.setName(this.getShortName() + "_" + this.getNumber()); // console.log(room.getShortName() + room.getNumber().toString());
	}

	public removeSpace() {
		if (this.getFullName() === " ") {
			this.setFullName("");
		}
		if (this.getShortName() === " ") {
			this.setShortName("");
		}
		if (this.getNumber() === " ") {
			this.setNumber("");
		}
		if (this.getAddress() === " ") {
			this.setAddress("");
		}
		if (this.getType() === " ") {
			this.setType("");
		}
		if (this.getFurniture() === " ") {
			this.setFurniture("");
		}
		if (this.getHref() === " ") {
			this.setHref("");
		}
	}
}
