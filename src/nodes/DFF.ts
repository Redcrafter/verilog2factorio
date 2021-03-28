import { signalV, signalC, makeConnection, Color } from "../parser.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { Entity } from "../entities/Entity.js";
import { Node } from "./Node.js";
import { Input } from "./Input.js";

// TODO: check parameters.EN_POLARITY

export class DFF extends Node {
    data: any;

    clk: Node;
    en: Node;
    d: Node;

    transformer: Decider;
    decider1: Decider;
    decider2: Decider;

    constructor(item: any) {
        super(item.connections.Q);
        this.data = item;
    }

    connect(getInputNode) {
        this.clk = getInputNode(this.data.connections.CLK);
        this.d = getInputNode(this.data.connections.D);
        if (this.data.connections.EN) {
            this.en = getInputNode(this.data.connections.EN);
        }

        if (!(this.clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }
    }

    createComb() {
        this.transformer = new Decider({
            first_signal: signalV,
            constant: this.en ? 2 : 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        }); // if (c == 1) / (c + en == 2)
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
    }

    connectComb() {
        makeConnection(Color.Red, this.clk.output(), this.transformer.input);
        if (this.en) {
            makeConnection(Color.Green, this.en.output(), this.transformer.input);
        }

        makeConnection(Color.Green, this.transformer.output, this.decider1.input);
        makeConnection(Color.Green, this.decider1.input, this.decider2.input);

        makeConnection(Color.Red, this.d.output(), this.decider1.input);

        makeConnection(Color.Both, this.decider1.output, this.decider2.output);
        makeConnection(Color.Red, this.decider2.output, this.decider2.input);
    }

    output() {
        return this.decider1.output;
    }

    combs(): Entity[] { return [this.transformer, this.decider1, this.decider2]; }
}
