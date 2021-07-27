import { Decider, ComparatorString } from "../entities/Decider.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Node, nodeFunc } from "./Node.js";
import { Input } from "./Input.js";
import { SDffe } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";


export class SDFFCE extends Node {
    data: SDffe;

    clkIn: Decider;
    dff1: Decider;
    dff2: Decider;
    rstIn: Decider;

    srstInv: Decider;

    constructor(item: SDffe) {
        super(item.connections.Q);
        this.data = item;

        console.assert(item.parameters.SRST_VALUE == 0, "reset value != 0");
        console.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        console.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");
    }

    _connect(getInputNode: nodeFunc) {
        const clk = getInputNode(this.data.connections.CLK);
        const d = getInputNode(this.data.connections.D);
        const en = getInputNode(this.data.connections.EN);
        const srst = getInputNode(this.data.connections.SRST);

        if (!(clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }

        this.clkIn = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        }); // if c + en == 2
        this.rstIn = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        }); // if c + en + srst

        if (d instanceof ConstNode) {
            d.forceCreate(); // lazy
        }
        this.dff1 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 output a
        this.dff2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output b

        // pretty lazy just invert the signal
        if (this.data.parameters.SRST_POLARITY == 0) {
            this.srstInv = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalV
            });
        }

        makeConnection(Color.Red, clk.output(), this.clkIn.input);
        makeConnection(Color.Green, en.output(), this.clkIn.input);

        makeConnection(Color.Red, this.clkIn.output, this.rstIn.input);
        if (this.srstInv) {
            makeConnection(Color.Red, srst.output(), this.srstInv.input);
            makeConnection(Color.Green, this.srstInv.output, this.rstIn.input);
        } else {
            makeConnection(Color.Green, srst.output(), this.rstIn.input);
        }

        makeConnection(Color.Green, this.clkIn.output, this.rstIn.output, this.dff1.input, this.dff2.input);

        makeConnection(Color.Red, d.output(), this.dff1.input);

        makeConnection(Color.Both, this.dff1.output, this.dff2.output);
        makeConnection(Color.Red, this.dff2.output, this.dff2.input);

        return this.dff1.output;
    }

    combs(): Entity[] {
        let ret = [this.clkIn, this.dff1, this.dff2, this.rstIn];
        if (this.srstInv) ret.push(this.srstInv);
        return ret;
    }
}
