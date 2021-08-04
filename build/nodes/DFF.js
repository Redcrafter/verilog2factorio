import { logger } from "../logger.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Input } from "./Input.js";
import { createTransformer, Node } from "./Node.js";
export class DFF extends Node {
    data;
    transformer;
    decider1;
    decider2;
    constructor(item) {
        super(item.connections.Q);
        this.data = item;
        logger.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        if (item.type == "$dffe")
            logger.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");
    }
    _connect(getInputNode) {
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
            makeConnection(2 /* Green */, en.output(), this.transformer.input);
        }
        else {
            this.transformer = createTransformer();
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
        makeConnection(1 /* Red */, clk.output(), this.transformer.input);
        makeConnection(1 /* Red */, d.output(), this.decider1.input);
        makeConnection(2 /* Green */, this.transformer.output, this.decider1.input, this.decider2.input);
        makeConnection(3 /* Both */, this.decider1.output, this.decider2.output);
        makeConnection(1 /* Red */, this.decider2.output, this.decider2.input);
        return this.decider1.output;
    }
    combs() { return [this.transformer, this.decider1, this.decider2]; }
}
