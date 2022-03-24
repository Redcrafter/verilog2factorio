import { Node, nodeFunc } from "./Node.js";

import { Color, Endpoint, makeConnection, setGlobalSource } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";

export class Output extends Node {
    bits: number[];
    name: string;

    pole: Pole;

    constructor(bits: number[], name: string) {
        super([]);
        this.bits = bits;
        this.name = name;
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
