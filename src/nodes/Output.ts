import { Endpoint, Entity } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
import { Color, makeConnection } from "../parser.js";
import { Node } from "./Node.js";

export class Output extends Node {
    bits: number[];
    src: Node;

    constructor(bits: number[]) {
        super([]);
        this.bits = bits;
    }

    connect(getInputNode) {
        this.src = getInputNode(this.bits);
    }

    pole: Pole;
    createComb(): void {
        this.pole = new Pole();
    }
    connectComb(): void {
        makeConnection(Color.Red, this.src.output(), this.pole.input);
    }
    output(): Endpoint { return this.pole.output; }
    combs(): Entity[] { return [this.pole]; }
}
