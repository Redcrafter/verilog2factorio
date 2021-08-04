import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { signalV, signalC, makeConnection } from "../entities/Entity.js";
import { Input } from "./Input.js";
import { createTransformer, Node } from "./Node.js";
// welcome to hell
// i have no idea what i did here anymore but i sure hope it works
export class SDFFE extends Node {
    data;
    rstVal;
    clk1;
    clk2;
    dff1;
    dff2;
    rst;
    sel1;
    sel2;
    srstInv;
    constructor(item) {
        super(item.connections.Q);
        this.data = item;
        this.rstVal = item.parameters.SRST_VALUE;
        logger.assert(item.parameters.CLK_POLARITY == 1, "SDFFE: revert clk polarity");
        logger.assert(item.parameters.EN_POLARITY == 1, "SDFFE:revert enable polarity");
    }
    _connect(getInputNode) {
        const clk = getInputNode(this.data.connections.CLK);
        const d = getInputNode(this.data.connections.D);
        const en = getInputNode(this.data.connections.EN);
        const srst = getInputNode(this.data.connections.SRST);
        if (!(clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }
        this.clk1 = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.clk2 = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.dff1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        this.dff2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.NE,
            copy_count_from_input: true,
            output_signal: signalV
        });
        this.rst = createTransformer();
        this.sel1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        if (this.rstVal != 0) {
            this.sel2 = new Arithmetic({
                first_constant: this.rstVal,
                second_signal: signalC,
                operation: ArithmeticOperations.Mul,
                output_signal: signalV
            });
            makeConnection(2 /* Green */, this.sel1.input, this.sel2.input);
            makeConnection(1 /* Red */, this.sel1.output, this.sel2.output);
        }
        // pretty lazy just invert the signal
        if (this.data.parameters.SRST_POLARITY == 0) {
            this.srstInv = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalV
            });
            makeConnection(1 /* Red */, srst.output(), this.srstInv.input);
            makeConnection(2 /* Green */, this.srstInv.output, this.clk2.input, this.rst.input);
        }
        else {
            makeConnection(2 /* Green */, srst.output(), this.clk2.input, this.rst.input);
        }
        makeConnection(1 /* Red */, clk.output(), this.clk1.input, this.clk2.input);
        makeConnection(2 /* Green */, en.output(), this.clk1.input);
        makeConnection(1 /* Red */, d.output(), this.sel1.input);
        makeConnection(2 /* Green */, this.clk2.output, this.clk1.output, this.dff1.input, this.dff2.input);
        makeConnection(2 /* Green */, this.rst.output, this.sel1.input);
        makeConnection(1 /* Red */, this.sel1.output, this.dff2.input);
        makeConnection(1 /* Red */, this.dff1.input, this.dff1.output);
        makeConnection(3 /* Both */, this.dff1.output, this.dff2.output);
        return this.dff2.output;
    }
    combs() {
        let res = [this.clk1, this.clk2, this.dff1, this.dff2, this.rst, this.sel1];
        if (this.sel2)
            res.push(this.sel2);
        if (this.srstInv)
            res.push(this.srstInv);
        return res;
    }
}
