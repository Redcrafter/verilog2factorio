import { Endpoint, Entity } from "../entities/Entity.js";
import { Node } from "./Node.js";


export class ConstNode extends Node {
    value: number;

    constructor(value, bits) {
        super([]);
        this.outMask = (1 << bits) - 1;
        this.value = value;
    }

    createComb(): void { }
    connectComb(): void { }
    output(): Endpoint { throw new Error("Method not implemented."); }
    combs(): Entity[] { return []; }
}
