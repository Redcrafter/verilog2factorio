import { Constant } from "../entities/Constant.js";
import { Endpoint, signalV } from "../entities/Entity.js";
import { mergeFunc, Node, nodeFunc } from "./Node.js";

export class ConstNode extends Node {
    value: number;
    c: Constant;

    constructor(value: number) {
        super([]);
        this.value = value;
    }

    forceCreate() {
        this.c = Constant.simple(this.value);
    }

    _connect(getInputNode: nodeFunc, getMergeEls: mergeFunc): Endpoint {
        return this.c?.output;
    }

    combs() {
        if (this.c) return [this.c];
        else return [];
    }
}
