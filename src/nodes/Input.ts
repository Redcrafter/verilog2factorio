import { Constant } from "../entities/Constant.js";
import { Node } from "./Node.js";

export class Input extends Node {
    constant: Constant;

    constructor(bits: number[]) {
        super(bits);

        this.constant = Constant.simple(0);
        this.constant.keep = true;
    }

    override _connect() {
        return this.constant.output;
    }

    combs() { return [this.constant]; }
}
