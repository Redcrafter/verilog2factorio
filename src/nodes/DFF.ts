import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { ComparatorString, Decider } from "../entities/Decider.js";

import { Node, nodeFunc } from "./Node.js";
import { Input } from "./Input.js";
import { Dff, Dffe } from "../yosys.js";

export class DFF extends Node {
    data: Dff | Dffe;

    transformer: Decider;
    decider1: Decider;
    decider2: Decider;

    constructor(item: Dff | Dffe) {
        super(item.connections.Q);
        this.data = item;

        console.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        if (item.type == "$dffe")
            console.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");
    }

    _connect(getInputNode: nodeFunc) {
        const clk = getInputNode(this.data.connections.CLK);
        const d = getInputNode(this.data.connections.D);

        if (!(clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }

        if (this.data.type == "$dffe") {
            const en = getInputNode(this.data.connections.EN);

            this.transformer = new Decider({
                first_signal: signalV,
                constant: 2,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalC
            });
            makeConnection(Color.Green, en.output(), this.transformer.input);
        } else {
            this.transformer = new Decider({
                first_signal: signalV,
                constant: 1,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalC
            });
        }

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

        makeConnection(Color.Red, clk.output(), this.transformer.input);
        makeConnection(Color.Red, d.output(), this.decider1.input);

        makeConnection(Color.Green, this.transformer.output, this.decider1.input, this.decider2.input);
        makeConnection(Color.Both, this.decider1.output, this.decider2.output);
        makeConnection(Color.Red, this.decider2.output, this.decider2.input);

        return this.decider1.output;
    }

    combs(): Entity[] { return [this.transformer, this.decider1, this.decider2]; }
}
