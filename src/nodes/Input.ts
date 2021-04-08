import { Constant } from "../entities/Constant.js";
import { Node } from "./Node.js";

export class Input extends Node {
    constructor(bits: number[]) {
        super(bits);
    }

    constant: Constant;
    createComb() {
        this.constant = new Constant({
            signal: {
                type: "virtual",
                name: "signal-V"
            },
            count: 0,
            index: 1
        });
        this.constant.keep = true;
    }

    connectComb() { }

    output() { return this.constant.output; }

    combs() { return [this.constant]; }
}
