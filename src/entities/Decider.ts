import { Entity, SignalID, RawEntity } from "./Entity.js";
import { dir, objEqual } from "../parser.js";

export const enum ComparatorString {
    LE = "<",
    LEQ = "≤",
    GE = ">",
    GEQ = "≥",
    EQ = "=",
    NEQ = "≠"
}

interface DeciderCombinatorParameters {
    first_signal: SignalID,

    second_signal?: SignalID;
    constant?: number;

    comparator: ComparatorString;
    output_signal: SignalID;
    copy_count_from_input: boolean;
}

export class Decider extends Entity {
    params: DeciderCombinatorParameters;

    constructor(params: DeciderCombinatorParameters) {
        super(1, 2);
        this.output.type = 2;
        this.params = params;
    }

    toObj() {

        if (this.input.red.length == 0 && this.input.green.length == 0 || this.output.red.length == 0 && this.output.green.length == 0) {
            throw new Error("Unconnected Decider");
        }

        return {
            entity_number: this.id,
            name: "decider-combinator",
            position: { x: this.x, y: this.y },
            direction: dir,
            control_behavior: {
                decider_conditions: this.params
            },
            connections: {
                "1": {
                    red: this.input.red,
                    green: this.input.green
                },
                "2": {
                    red: this.output.red,
                    green: this.output.green
                }
            }
        };
    }

    eq(other: RawEntity) {
        if (!(other instanceof Decider))
            return false;

        return objEqual(this.params, other.params);
    }
}
