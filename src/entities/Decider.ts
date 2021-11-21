import { ConnectionPoint, EntityBase, SignalID } from "../blueprint.js";
import { logger } from "../logger.js";

import { Entity, Endpoint, isSpecial } from "./Entity.js";

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

        this.input = new Endpoint(this, 1);
        if(isSpecial(this.params.output_signal)) {
            this.output = new Endpoint(this, 2);
        } else {
            this.output = new Endpoint(this, 2, this.params.output_signal);
        }

        logger.assert((params.second_signal === undefined) !== (params.constant === undefined));
    }

    override netSignalAdd(e: Endpoint, s: SignalID) {
        if(e == this.input && isSpecial(this.params.output_signal)) {
            this.output.outSignals.add(s);

            // ripple update
            this.output.red?.addSignal(s);
            this.output.green?.addSignal(s);
        }
    }

    toObj(): DeciderCombinator {
        if (!this.input.red && !this.input.green || !this.output.red && !this.output.green) {
            throw new Error("Unconnected Decider");
        }

        return {
            entity_number: this.id,
            name: "decider-combinator",
            position: { x: this.x, y: this.y },
            direction: this.dir,
            control_behavior: {
                decider_conditions: this.params
            },
            connections: {
                "1": this.input.convert(),
                "2": this.output.convert()
            }
        };
    }
}
