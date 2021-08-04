import { Entity, convertEndpoint, dir, createEndpoint, signalV } from "./Entity.js";
export class Constant extends Entity {
    params;
    constructor(...param) {
        super(1, 1);
        this.params = param;
        this.input = this.output = createEndpoint(this, 1, ...this.params.map(x => x.signal));
    }
    toObj() {
        if (this.output.red.size == 0 && this.output.green.size == 0) {
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
