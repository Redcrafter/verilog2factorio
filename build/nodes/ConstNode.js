import { Constant } from "../entities/Constant.js";
import { Node } from "./Node.js";
export class ConstNode extends Node {
    value;
    c;
    constructor(value) {
        super([]);
        this.value = value;
        this.c = Constant.simple(this.value);
    }
    _connect() { return this.c.output; }
    combs() { return [this.c]; }
}
