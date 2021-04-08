import { Constant } from "../entities/Constant.js";
import { signalV } from "../entities/Entity.js";
import { Node } from "./Node.js";

export class ConstNode extends Node {
    value: number;
    c: Constant;

    constructor(value: number, bits: number) {
        super([]);
        this.outMask = (1 << bits) - 1;
        this.value = value;
    }

    forceCreate() {
        this.c = new Constant({
            count: this.value,
            index: 1,
            signal: signalV
        });
    }

    createComb(): void { }
    connectComb(): void { }

    output() { return this.c?.output; }
    combs() {
        if (this.c) return [this.c];
        else return [];
    }
}
