import { Node, nodeFunc } from "./Node.js";

import { Color, Endpoint, makeConnection } from "../entities/Entity.js";
import { SteelChest } from "../entities/SteelChest.js";

export class Output extends Node {
    bits: number[];
    name: string;
    data: undefined;

    pole: SteelChest;

    constructor(bits: number[], name: string) {
        super([]);
        this.bits = bits;
        this.name = name;
    }

    _connect(getInputNode: nodeFunc): Endpoint {
        const src = getInputNode(this.bits);

        this.pole = new SteelChest();
        this.pole.keep = true;

        makeConnection(Color.Red, src.output(), this.pole.input);

        return null;
    }
    combs() { return [this.pole]; }
}
