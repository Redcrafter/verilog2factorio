interface Vec2 {
    x: number;
    y: number;
}

export interface RawEntity {
    entity_number: number;
    name: string;
    position: Vec2;

    direction?: number;
    orientation?: number;

    connections?: any;

    control_behaviour?: any;
}

export interface Connection {
    entity_id: number;
    circuit_id?: number;
}

export interface Endpoint {
    id: number;
    type: number;

    red: Connection[];
    green: Connection[];
}

export interface SignalID {
    type: "item" | "fluid" | "virtual",
    name: string;
}

export abstract class Entity {
    x = -1;
    y = -1;

    width: number;
    height: number;

    input: Endpoint;
    output: Endpoint;
    private _id: number;

    constructor(width: number, height: number) {
        this.input = {
            id: 0,
            type: 1,
            red: [],
            green: []
        };
        this.output = {
            id: 0,
            type: 1,
            red: [],
            green: []
        };
        this.width = width;
        this.height = height;
    }

    get id() {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
        if (this.input) {
            this.input.id = value;
        }
        this.output.id = value;
    }

    abstract toObj(): RawEntity;
    abstract eq(other: RawEntity);
}

