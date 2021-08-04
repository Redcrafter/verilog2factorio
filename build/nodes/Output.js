import { Node } from "./Node.js";
import { makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
export class Output extends Node {
    bits;
    pole;
    constructor(bits) {
        super([]);
        this.bits = bits;
    }
    _connect(getInputNode) {
        const src = getInputNode(this.bits);
        this.pole = new Pole();
        this.pole.keep = true;
        makeConnection(1 /* Red */, src.output(), this.pole.input);
        return null;
    }
    combs() { return [this.pole]; }
}
