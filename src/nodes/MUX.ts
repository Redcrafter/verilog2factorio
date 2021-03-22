import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ConstNode } from "./ConstNode.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Entity } from "../entities/Entity.js";
import { createLimiter, createTransformer, Node } from "./Node.js";
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

    transformer: Arithmetic;
    decider1: Decider;
    decider2: Decider;
    limiter: Arithmetic;

    createComb() {
        this.transformer = createTransformer();
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
        this.limiter = createLimiter(this.outMask);

        // TODO: make custom structure for 2 const inputs
        if (this.a instanceof ConstNode && this.b instanceof ConstNode)
            throw new Error("not allowed");

        if (this.a instanceof ConstNode) {
            if (this.a.value == 0) {
                // can be completely ignored
                this.decider1 = null;
                this.limiter = null;
            } else {
                this.a.forceCreate();
            }
        }
        if (this.b instanceof ConstNode) {
            if (this.b.value == 0) {
                // can be completely ignored
                this.decider2 = null;
                this.limiter = null;
            } else {
                this.b.forceCreate();
            }
        }
    }

    connectComb() {
        makeConnection(Color.Red, this.s.output(), this.transformer.input);

        if (!(this.a instanceof ConstNode) || this.a.value != 0) makeConnection(Color.Red, this.a.output(), this.decider1.input);
        if (!(this.b instanceof ConstNode) || this.b.value != 0) makeConnection(Color.Red, this.b.output(), this.decider2.input);

        if (this.decider1) makeConnection(Color.Green, this.transformer.output, this.decider1.input);
        if (this.decider2) makeConnection(Color.Green, this.transformer.output, this.decider2.input);

        if (this.limiter) {
            makeConnection(Color.Red, this.decider1.output, this.limiter.input);
            makeConnection(Color.Red, this.decider2.output, this.limiter.input);
        }
    }

    output() {
        return (this.limiter ?? this.decider1 ?? this.decider2).output;
    }

    combs(): Entity[] {
        let r: Entity[] = [this.transformer];
        if (this.decider1) r.push(this.decider1);
        if (this.decider2) r.push(this.decider2);
        if (this.limiter) r.push(this.limiter);
        return r;
    }
}
