import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Input } from "./Input.js";
import { Node } from "./Node.js";
export class SDFF extends Node {
    data;
    clkIn;
    rstIn;
    dff1;
    dff2;
    dff3;
    constructor(item) {
        super(item.connections.Q);
        this.data = item;
        logger.assert(item.parameters.CLK_POLARITY == 1, "SDFF: revert clk polarity");
    }
    _connect(getInputNode) {
        const clk = getInputNode(this.data.connections.CLK);
        const d = getInputNode(this.data.connections.D);
        const srst = getInputNode(this.data.connections.SRST);
        if (!(clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }
        this.clkIn = new Decider({
            first_signal: signalV,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.rstIn = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.dff1 = new Decider({
            first_signal: signalC,
            constant: this.data.parameters.SRST_POLARITY == 1 ? 1 : 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        this.dff2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        makeConnection(1 /* Red */, clk.output(), this.clkIn.input, this.rstIn.input);
        makeConnection(2 /* Green */, srst.output(), this.rstIn.input);
        makeConnection(1 /* Red */, d.output(), this.dff1.input);
        makeConnection(2 /* Green */, this.clkIn.output, this.rstIn.output, this.dff1.input, this.dff2.input);
        makeConnection(1 /* Red */, this.dff2.input, this.dff2.output);
        makeConnection(3 /* Both */, this.dff2.output, this.dff1.output);
        if (this.data.parameters.SRST_VALUE != 0) {
            this.dff3 = new Arithmetic({
                first_signal: signalC,
                second_constant: this.data.parameters.SRST_VALUE,
                operation: ArithmeticOperations.Mul,
                output_signal: signalV
            });
            makeConnection(1 /* Red */, this.rstIn.output, this.dff3.input);
            makeConnection(3 /* Both */, this.dff1.output, this.dff3.output);
        }
        return this.dff1.output;
    }
    combs() {
        let ret = [this.clkIn, this.rstIn, this.dff1, this.dff2];
        if (this.dff3)
            ret.push(this.dff3);
        return ret;
    }
}
