import { logger } from "../logger.js";
import { Entity, createEndpoint, convertEndpoint, dir } from "./Entity.js";
export var ComparatorString;
(function (ComparatorString) {
    ComparatorString["LT"] = "<";
    ComparatorString["LE"] = "\u2264";
    ComparatorString["GT"] = ">";
    ComparatorString["GE"] = "\u2265";
    ComparatorString["EQ"] = "=";
    ComparatorString["NE"] = "\u2260";
})(ComparatorString || (ComparatorString = {}));
export class Decider extends Entity {
    params;
    constructor(params) {
        super(1, 2);
        this.params = params;
        this.input = createEndpoint(this, 1);
        this.output = createEndpoint(this, 2, this.params.output_signal);
        logger.assert((params.second_signal === undefined) !== (params.constant === undefined));
    }
    toObj() {
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
