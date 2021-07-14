import { Color, makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
import { Node, nodeFunc } from "./Node.js";

export class Output extends Node {
    bits: number[];
    src: Node;

    pole: Pole;

    constructor(bits: number[]) {
        super([]);
        this.bits = bits;
    }

    connect(getInputNode: nodeFunc) {
        this.src = getInputNode(this.bits);

        this.pole = new Pole();
        this.pole.keep = true;
    }
    connectComb(): void {
        makeConnection(Color.Red, this.src.output(), this.pole.input);
    }
    output() { return this.pole.output; }
    combs() { return [this.pole]; }
}
