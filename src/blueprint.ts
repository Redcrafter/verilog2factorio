import { ArithmeticCombinator } from "./entities/Arithmetic";
import { DeciderCombinator } from "./entities/Decider.js";
import { ConstantCombinator } from "./entities/Constant.js";
import { MediumElectricPole } from "./entities/Pole.js";
import { Substation_ } from "./entities/Substation.js";
import { SteelChest_ } from "./entities/SteelChest.js";

import * as zlib from "zlib";

// https://wiki.factorio.com/Blueprint_string_format

export interface ConnectionData {
    entity_id: number;
    circuit_id?: number;
}

export interface ConnectionPoint {
    red: ConnectionData[];
    green: ConnectionData[];
}

interface Position {
    x: number;
    y: number;
}

interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface SignalID {
    type: "item" | "fluid" | "virtual",
    name: string;
}

export interface EntityBase {
    entity_number: number;
    name: string;
    position: Position;

    direction?: number;
    orientation?: number;

    // connections?: { "1": ConnectionPoint, "2"?: ConnectionPoint };
    // control_behavior?: any;
}

export type RawEntity = ArithmeticCombinator | DeciderCombinator | ConstantCombinator | MediumElectricPole | Substation_ | SteelChest_;

interface Tile {
    name: string;
    position: Position;
}

interface Icon {
    index: number;
    signal: SignalID;
}

interface Schedule {
    schedule: {
        station: string;
        wait_conditions: {
            type: "time" | "inactivity" | "full" | "empty" | "item_count" | "circuit" | "robots_inactive" | "fluid_count" | "passenger_present" | "passenger_not_present";
            compare_type: "and" | "or";
            ticks: number;
            condition: Object;
        }
    };
    locomotives: number[];
}

export interface Blueprint {
    /** String, the name of the item that was saved ("blueprint" in vanilla). */
    item: string;
    /** String, the name of the blueprint set by the user. */
    label?: string;
    /** The color of the label of this blueprint. */
    label_color?: Color;
    /** The actual content of the blueprint. */
    entities: RawEntity[];
    /** The tiles included in the blueprint. */
    tiles?: Tile[];
    /** The icons of the blueprint set by the user. */
    icons: Icon[];
    /** The schedules for trains in this blueprint. */
    schedules?: Schedule[];
    /** The map version of the map the blueprint was created in. */
    version: number;
}

interface BlueprintBook {
    item: "blueprint-book";
    blueprints: { index: number, blueprint: Blueprint }[];
    active_index: 0;
    version: 281479273447424;
}

type BlueprintWrapper = { blueprint_book: BlueprintBook } | { blueprint: Blueprint };

export function createBlueprint(entityList: RawEntity[], name: string): Blueprint {
    return {
        item: "blueprint",
        label: name,
        icons: [
            {
                signal: {
                    type: "item",
                    name: "decider-combinator"
                },
                index: 1
            },
            {
                signal: {
                    type: "item",
                    name: "constant-combinator"
                },
                index: 2
            }
        ],
        entities: entityList,
        version: 281479273447424
    }
}

function createBlueprintBook(blueprints: Blueprint[]): BlueprintBook {
    return {
        item: "blueprint-book",
        blueprints: blueprints.map((blueprint, index) => ({ index, blueprint })),
        active_index: 0,
        version: 281479273447424
    }
}

function compress(data: BlueprintWrapper) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

export function createBpString(blueprints: Blueprint[]): string {
    let el: BlueprintWrapper;

    if (blueprints.length == 1) {
        el = { blueprint: blueprints[0] };
    } else {
        el = { blueprint_book: createBlueprintBook(blueprints) };
    }

    return compress(el);
}
