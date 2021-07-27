import { RawEntity, ConnectionPoint, SignalID } from "../blueprint.js";

export const dir = 4;

export const signalV: SignalID = { type: "virtual", name: "signal-V" };
export const signalC: SignalID = { type: "virtual", name: "signal-C" };
export const signalR: SignalID = { type: "virtual", name: "signal-R" }
export const signalGreen: SignalID = { type: "virtual", name: "signal-green" };
export const signalGrey: SignalID = { type: "virtual", name: "signal-grey" };

export const anything: SignalID = { type: "virtual", name: "signal-anything" };
export const everything: SignalID = { type: "virtual", name: "signal-everything" };
export const each: SignalID = { type: "virtual", name: "signal-each" };

export const enum Color {
    Red = 1,
    Green = 2,
    Both = Red | Green
}

export interface Endpoint {
    entity: Entity;
    type: number;
    outSignals: Set<SignalID>,

    red: Set<Endpoint>;
    green: Set<Endpoint>;
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

export function createEndpoint(ent: Entity, type: number, ...outSignals: SignalID[]): Endpoint {
    return {
        entity: ent,
        type,
        outSignals: new Set(outSignals),
        red: new Set(),
        green: new Set()
    };
}
export function convertEndpoint(p: Endpoint): ConnectionPoint {
    function map(el: Endpoint[]) {
        return el.map(x => ({ entity_id: x.entity.id, circuit_id: x.type }))
    }

    return {
        red: map([...p.red]),
        green: map([...p.green])
    }
}

export function makeConnection(c: Color, ...points: Endpoint[]) {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];

        if (c & Color.Red) {
            a.red.add(b);
            b.red.add(a);
        }

        if (c & Color.Green) {
            a.green.add(b);
            b.green.add(a);
        }
    }
}
