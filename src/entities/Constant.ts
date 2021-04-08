import { Entity, SignalID, RawEntity, convertEndpoint, dir, createEndpoint } from "./Entity.js";

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

        this.input = this.output = createEndpoint(this, 1);
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
                "1": convertEndpoint(this.input)
            }
        };
    }
}
