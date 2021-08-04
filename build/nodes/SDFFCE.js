import { logger } from "../logger.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Input } from "./Input.js";
import { createTransformer, Node } from "./Node.js";
export class SDFFCE extends Node {
    data;
    entities;
    constructor(item) {
        super(item.connections.Q);
        this.data = item;
        logger.assert(item.parameters.SRST_VALUE == 0, "reset value != 0");
        logger.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        logger.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");
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
        let clkIn = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        }); // if c + en == 2
        let rstIn = createTransformer(srst.output());
        let dataMask = new Decider({
            first_signal: signalV,
            constant: this.data.parameters.SRST_POLARITY ? 0 : 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalV
        });
        let dff1 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 output a
        let dff2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output b
        this.entities = [clkIn, rstIn, dataMask, dff1, dff2];
        makeConnection(1 /* Red */, clk.output(), clkIn.input);
        makeConnection(2 /* Green */, en.output(), clkIn.input);
        makeConnection(2 /* Green */, clkIn.output, dff1.input, dff2.input);
        makeConnection(1 /* Red */, d.output(), dataMask.input);
        makeConnection(2 /* Green */, rstIn.output, dataMask.input);
        makeConnection(1 /* Red */, dataMask.output, dff1.input);
        makeConnection(3 /* Both */, dff1.output, dff2.output);
        makeConnection(1 /* Red */, dff2.output, dff2.input);
        return dff1.output;
    }
    combs() {
        return this.entities;
    }
}
