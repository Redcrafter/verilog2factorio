import { Color, makeConnection, signalV } from "../parser.js";
import { ConstNode } from "./ConstNode.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Node } from "./Node.js";

export class ADD extends Node {
    a: Node;
    b: Node;

    data: any;

    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    limiter: Arithmetic;
    const: Constant;
    createComb() {
        this.limiter = new Arithmetic({
            first_signal: signalV,
            second_constant: this.outMask,
            operation: ArithmeticOperations.And,
            output_signal: signalV
        });

        if (this.a instanceof ConstNode) {
            this.const = new Constant({
                count: this.a.value,
                index: 1,
                signal: signalV
            });
        }

        if (this.b instanceof ConstNode) {
            if (this.const) { throw "Two const inputs"; }
            this.const = new Constant({
                count: this.b.value,
                index: 1,
                signal: signalV
            });
        }
    }

    connectComb() {
        if (this.a instanceof ConstNode) {
            makeConnection(Color.Red, this.const.output, this.limiter.input);
        } else {
            makeConnection(Color.Red, this.a.output(), this.limiter.input);
        }

        if (this.b instanceof ConstNode) {
            makeConnection(Color.Green, this.const.output, this.limiter.input);
        } else {
            makeConnection(Color.Green, this.b.output(), this.limiter.input);
        }
    }

    output() {
        return this.limiter.output;
    }

    combs() {
        if (this.const)
            return [this.const, this.limiter];

        else
            return [this.limiter];
    }
}
