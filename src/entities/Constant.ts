import { ConnectionPoint, EntityBase, SignalID } from "../blueprint.js";
import { Entity, convertEndpoint, dir, createEndpoint } from "./Entity.js";

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

        this.input = this.output = createEndpoint(this, 1, this.params[0].signal);
        console.assert(param.length == 1);
    }

    toObj(): ConstantCombinator {
        if (this.output.red.length == 0 && this.output.green.length == 0) {
            throw new Error("Unconnected Constant");
        }

        return {
            entity_number: this.id,
            name: "constant-combinator",
            position: { x: this.x, y: this.y },
            direction: dir,
            control_behavior: {
                filters: this.params
            },
            connections: {
                "1": convertEndpoint(this.input)
            }
        };
    }
}
