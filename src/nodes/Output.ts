import { Color, Endpoint, makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
import { ConstNode } from "./ConstNode.js";
import { Node, nodeFunc } from "./Node.js";

export class Output extends Node {
    bits: number[];

    pole: Pole;

    constructor(bits: number[]) {
        super([]);
        this.bits = bits;
    }

    _connect(getInputNode: nodeFunc): Endpoint {
        const src = getInputNode(this.bits);

        this.pole = new Pole();
        this.pole.keep = true;

        makeConnection(Color.Red, src.output(), this.pole.input);

        return null;
    }
    combs() { return [this.pole]; }
}
