import { logger } from "../logger.js";
import { Entity, Endpoint, isSpecial } from "./Entity.js";
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
        this.input = new Endpoint(this, 1);
        if (isSpecial(this.params.output_signal)) {
            this.output = new Endpoint(this, 2);
        }
        else {
            this.output = new Endpoint(this, 2, this.params.output_signal);
        }
        logger.assert((params.second_signal === undefined) !== (params.constant === undefined));
    }
    netSignalAdd(e, s) {
        if (e == this.input && isSpecial(this.params.output_signal)) {
            this.output.outSignals.add(s);
            // ripple update
            this.output.red?.addSignal(s);
            this.output.green?.addSignal(s);
        }
    }
    toObj() {
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
