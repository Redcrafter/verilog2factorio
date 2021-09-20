import { ConnectionPoint, EntityBase, SignalID } from "../blueprint.js";

import { Entity, signalV, Endpoint } from "./Entity.js";

export interface ConstantControlBehavior {
    signal: SignalID;
    count: number;
    index: number;
}

export interface ConstantCombinator extends EntityBase {
    name: "constant-combinator",
    control_behavior: {
        filters: ConstantControlBehavior[];
    }
    connections: {
        "1": ConnectionPoint
    };
}

export class Constant extends Entity {
    params: ConstantControlBehavior[];

    constructor(...param: ConstantControlBehavior[]) {
        super(1, 1);
        this.params = param;

        this.input = this.output = new Endpoint(this, 1, ...this.params.map(x => x.signal));
    }

    toObj(): ConstantCombinator {
        if (!this.output.red && !this.output.green) {
            throw new Error("Unconnected Constant");
        }

        return {
            entity_number: this.id,
            name: "constant-combinator",
            position: { x: this.x, y: this.y },
            direction: this.dir,
            control_behavior: {
                filters: this.params
            },
            connections: {
                "1": this.input.convert()
            }
        };
    }

    getValue(s: SignalID) {
        for (const el of this.params) {
            if (el.signal == s) return el.count;
        }
    }

    static simple(value: number) {
        return new Constant({
            count: value,
            index: 1,
            signal: signalV
        });
    }
}
