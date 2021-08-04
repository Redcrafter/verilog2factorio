import { ConnectionPoint, EntityBase, SignalID } from "../blueprint.js";
import { logger } from "../logger.js";

import { Entity, createEndpoint, convertEndpoint, dir } from "./Entity.js";

export enum ComparatorString {
    LT = "<",
    LE = "≤",
    GT = ">",
    GE = "≥",
    EQ = "=",
    NE = "≠"
}

export interface DeciderControlBehavior {
    first_signal: SignalID,

    second_signal?: SignalID;
    constant?: number;

    comparator: ComparatorString;
    output_signal: SignalID;
    copy_count_from_input: boolean;
}

export interface DeciderCombinator extends EntityBase {
    name: "decider-combinator";
    control_behavior: {
        decider_conditions: DeciderControlBehavior
    };
    connections: {
        "1": ConnectionPoint,
        "2": ConnectionPoint
    };
}

export class Decider extends Entity {
    params: DeciderControlBehavior;

    constructor(params: DeciderControlBehavior) {
        super(1, 2);
        this.params = params;

        this.input = createEndpoint(this, 1);
        this.output = createEndpoint(this, 2, this.params.output_signal);

        logger.assert((params.second_signal === undefined) !== (params.constant === undefined));
    }

    toObj(): DeciderCombinator {
        if (this.input.red.size == 0 && this.input.green.size == 0 || this.output.red.size == 0 && this.output.green.size == 0) {
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
