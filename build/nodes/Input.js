import { Constant } from "../entities/Constant.js";
import { Node } from "./Node.js";
export class Input extends Node {
    constant;
    constructor(bits) {
        super(bits);
        this.constant = Constant.simple(0);
        this.constant.keep = true;
    }
    _connect() {
        return this.constant.output;
    }
    combs() { return [this.constant]; }
}
