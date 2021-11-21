import { logger } from "../logger.js";
import { Entity, signalV, Endpoint } from "./Entity.js";
export class Constant extends Entity {
    params;
    isOn = true;
    constructor(...param) {
        super(1, 1);
        this.params = param;
        this.input = this.output = new Endpoint(this, 1, ...this.params.map(x => x.signal));
    }
    toObj() {
        logger.assert(this.input.redP.size != 0 || this.input.greenP.size != 0, "Unconnected Constant");
        let el = {
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
        if (!this.isOn)
            el.control_behavior.is_on = false;
        return el;
    }
    getValue(s) {
        for (const el of this.params) {
            if (el.signal == s)
                return el.count;
        }
    }
    static simple(value) {
        return new Constant({
            count: value,
            index: 1,
            signal: signalV
        });
    }
}
