import { ConstNode } from "./ConstNode.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { createLimiter, Node, nodeFunc } from "./Node.js";
import { Color, makeConnection } from "../entities/Entity.js";
import { BinaryCell } from "../yosys.js";

export class ADD extends Node {
    a: Node;
    b: Node;

    limiter: Arithmetic;

    data: BinaryCell;

    constructor(item: BinaryCell) {
        super(item.connections.Y);
        this.data = item;

        console.assert(parseInt(item.parameters.A_SIGNED, 2) == 0);
        console.assert(parseInt(item.parameters.B_SIGNED, 2) == 0);
    }

    connect(getInputNode: nodeFunc) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    createComb() {
        this.limiter = createLimiter(this.outMask);

        if (this.a instanceof ConstNode && this.b instanceof ConstNode)
            throw new Error("Unnecessary operation");

        if (this.a instanceof ConstNode) {
            if (this.a.value == 0) throw new Error("Unnecessary operation");
            this.a.forceCreate();
        }

        if (this.b instanceof ConstNode) {
            if (this.b.value == 0) throw new Error("Unnecessary operation");
            this.b.forceCreate();
        }
    }

    connectComb() {
        makeConnection(Color.Red, this.a.output(), this.limiter.input);
        makeConnection(Color.Green, this.b.output(), this.limiter.input);
    }

    output() {
        return this.limiter.output;
    }

    combs() {
        return [this.limiter];
    }
}
