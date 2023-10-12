import { Constant } from "../entities/Constant.js";

import { Node } from "./Node.js";

export class ConstNode extends Node {
    data: undefined;

    value: number;
    c: Constant;

    constructor(value: number) {
        super([]);
        this.value = value;

        this.c = Constant.simple(this.value);
    }

    _connect() { return this.c.output; }
    combs() { return [this.c]; }
}
