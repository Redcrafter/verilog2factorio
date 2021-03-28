import { Color, makeConnection, signalV } from "../parser.js";
import { ConstNode } from "./ConstNode.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { createLimiter, Node } from "./Node.js";

export class ADD extends Node {
    a: Node;
    b: Node;

    limiter: Arithmetic;

    data: any;

    constructor(item: any) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    createComb() {
        this.limiter = createLimiter(this.outMask);

        if (this.a instanceof ConstNode && this.b instanceof ConstNode)
            throw new Error("Unnecessary operation");

        if (this.a instanceof ConstNode) {
            if (this.a.value == 0) throw new Error("Unnecessary operation");
            else this.a.forceCreate();
        }

        if (this.b instanceof ConstNode) {
            if (this.b.value == 0) throw new Error("Unnecessary operation");
            else this.b.forceCreate();
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
