import { RawEntity, ConnectionPoint, SignalID } from "../blueprint.js";

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

export interface Endpoint {
    entity: Entity;
    type: number;
    outSignal: SignalID | null;

    red: Endpoint[];
    green: Endpoint[];
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

export function createEndpoint(ent: Entity, type: number, outSignal: SignalID | null): Endpoint {
    return {
        entity: ent,
        type,
        outSignal,
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
