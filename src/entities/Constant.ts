import { Entity, SignalID, RawEntity } from "./Entity.js";
import { dir, objEqual } from "../parser.js";


interface ConstantCombinatorParameters {
    signal: SignalID;
    count: number;
    index: number;
}

export class Constant extends Entity {
    params: ConstantCombinatorParameters[];

    constructor(...param: ConstantCombinatorParameters[]) {
        super(1, 1);
        this.params = param;

        // does not have input
        this.input = undefined;
    }

    toObj() {
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
                "1": {
                    red: this.output.red,
                    green: this.output.green
                }
            }
        };
    }

    eq(other: RawEntity) {
        if (!(other instanceof Constant) || this.params.length != other.params.length)
            return false;

        for (let i = 0; i < this.params.length; i++) {
            const a = this.params[i];
            const b = other.params[i];

            if (!objEqual(a, b)) {
                return false;
            }
        }

        debugger;
        return true;
    }
}
