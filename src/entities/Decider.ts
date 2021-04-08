import { Entity, SignalID, RawEntity, createEndpoint, convertEndpoint, dir } from "./Entity.js";

export enum ComparatorString {
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
        this.params = params;

        this.input = createEndpoint(this, 1);
        this.output = createEndpoint(this, 2);
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
                "1": convertEndpoint(this.input),
                "2": convertEndpoint(this.output)
            }
        };
    }
}
