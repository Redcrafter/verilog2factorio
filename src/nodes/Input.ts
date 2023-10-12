import { Constant } from "../entities/Constant.js";
import { setGlobalSource } from "../entities/Entity.js";

import { Node } from "./Node.js";

export class Input extends Node {
    data: undefined;

    name: string;
    constant: Constant;

    constructor(bits: number[], name: string) {
        super(bits);
        this.name = name;
    }

    override _connect() {
        this.constant = Constant.simple(0);
        this.constant.keep = true;

        return this.constant.output;
    }

    combs() { return [this.constant]; }
}
