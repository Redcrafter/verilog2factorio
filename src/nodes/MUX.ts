import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ConstNode } from "./ConstNode.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Entity } from "../entities/Entity.js";
import { Node } from "./Node.js";
import { Color, makeConnection, signalC, signalV } from "../parser.js";

export class MUX extends Node {
    a: Node;
    b: Node;
    s: Node;

    data: any;

    constructor(item: any) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
        this.s = getInputNode(this.data.connections.S);
    }

    constIn: Constant;
    transformer: Arithmetic;
    decider1: Decider;
    decider2: Decider;
    limiter: Arithmetic;

    createComb() {
        this.transformer = new Arithmetic({
            first_signal: signalV,
            second_constant: 0,
            operation: ArithmeticOperations.Add,
            output_signal: signalC
        });
        this.decider1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output value
        this.decider2 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 save input value
        this.limiter = new Arithmetic({
            first_signal: signalV,
            second_constant: this.outMask,
            operation: ArithmeticOperations.And,
            output_signal: signalV
        });

        if (this.a instanceof ConstNode && this.b instanceof ConstNode)
            throw new Error("not allowed");

        if (this.a instanceof ConstNode && this.a.value != 0) {
            this.constIn = new Constant({
                signal: signalV,
                count: this.a.value,
                index: 1
            });
        }
        if (this.b instanceof ConstNode && this.b.value != 0) {
            this.constIn = new Constant({
                signal: signalV,
                count: this.b.value,
                index: 1
            });
        }
    }

    connectComb() {
        makeConnection(Color.Red, this.s.output(), this.transformer.input);

        if (this.a instanceof ConstNode) {
            if (this.a.value != 0) makeConnection(Color.Red, this.constIn.output, this.decider1.input);
        } else {
            makeConnection(Color.Red, this.a.output(), this.decider1.input);
        }
        if (this.b instanceof ConstNode) {
            if (this.b.value != 0) makeConnection(Color.Red, this.constIn.output, this.decider2.input);
        } else {
            makeConnection(Color.Red, this.b.output(), this.decider2.input);
        }

        makeConnection(Color.Green, this.transformer.output, this.decider1.input);
        makeConnection(Color.Green, this.decider1.input, this.decider2.input);

        makeConnection(Color.Red, this.decider1.output, this.decider2.output);
        makeConnection(Color.Red, this.decider2.output, this.limiter.input);
    }

    output() {
        return this.limiter.output;
    }

    combs(): Entity[] {
        let r: Entity[] = [this.transformer, this.decider1, this.decider2, this.limiter];
        if (this.constIn) {
            r.push(this.constIn);
        }
        return r;
    }
}
