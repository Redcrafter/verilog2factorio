import { signalV, signalC, makeConnection, Color } from "../parser.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { Entity } from "../entities/Entity.js";
import { createLimiter, createTransformer, Node } from "./Node.js";

export class DFF extends Node {
    data: any;

    clk: Node;
    d: Node;

    constructor(item: any) {
        super(item.connections.Q);
        this.data = item;
    }

    connect(getInputNode) {
        this.clk = getInputNode(this.data.connections.CLK);
        this.d = getInputNode(this.data.connections.D);
    }

    transformer: Arithmetic;
    decider1: Decider;
    decider2: Decider;
    limiter: Arithmetic;

    createComb() {
        this.transformer = createTransformer(); // clk v to c
        this.decider1 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 output a
        this.decider2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output b
        this.limiter = createLimiter(this.outMask); // return (a & limit)
    }

    connectComb() {
        makeConnection(Color.Red, this.clk.output(), this.transformer.input);

        makeConnection(Color.Green, this.transformer.output, this.decider1.input);
        makeConnection(Color.Green, this.decider1.input, this.decider2.input);

        makeConnection(Color.Red, this.d.output(), this.decider1.input);

        makeConnection(Color.Red, this.decider1.output, this.decider2.output);
        makeConnection(Color.Red, this.decider2.output, this.decider2.input);

        makeConnection(Color.Red, this.decider2.output, this.limiter.input);
    }

    output() {
        return this.limiter.output;
    }

    combs(): Entity[] { return [this.transformer, this.decider1, this.decider2, this.limiter]; }
}
