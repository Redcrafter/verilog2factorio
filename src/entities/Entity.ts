export const dir = 4;

export const signalV: SignalID = {
    type: "virtual",
    name: "signal-V"
};
export const signalC: SignalID = {
    type: "virtual",
    name: "signal-C"
};
export const signalR: SignalID = {
    type: "virtual",
    name: "signal-R"
}

export const enum Color {
    Red = 1,
    Green = 2,
    Both = Red | Green
}

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

    connections?: { "1": ConnectionPoint, "2"?: ConnectionPoint };

    control_behaviour?: any;
}

export interface Endpoint {
    entity: Entity;
    type: number;

    red: Endpoint[];
    green: Endpoint[];
}
export interface ConnectionPoint {
    red: ConnectionData[];
    green: ConnectionData[];
}
export interface ConnectionData {
    entity_id: number;
    circuit_id?: number;
}

export interface SignalID {
    type: "item" | "fluid" | "virtual",
    name: string;
}

export abstract class Entity {
    keep = false;

    x = -1;
    y = -1;

    width: number;
    height: number;

    input: Endpoint;
    output: Endpoint;
    id: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    abstract toObj(): RawEntity;
}

export function createEndpoint(ent: Entity, type: number) {
    return {
        entity: ent,
        type,
        red: [],
        green: []
    };
}
export function convertEndpoint(p: Endpoint): ConnectionPoint {
    function map(el: Endpoint[]) {
        return el.map(x => ({ entity_id: x.entity.id, circuit_id: x.type }))
    }

    return {
        red: map(p.red),
        green: map(p.green)
    }
}

export function makeConnection(c: Color, ...points: Endpoint[]) {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];

        if (c & Color.Red) {
            a.red.push(b);
            b.red.push(a);
        }

        if (c & Color.Green) {
            a.green.push(b);
            b.green.push(a);
        }
    }
}
