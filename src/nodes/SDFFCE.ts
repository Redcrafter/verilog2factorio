import { Decider, ComparatorString } from "../entities/Decider.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { createTransformer, Node, nodeFunc } from "./Node.js";
import { Input } from "./Input.js";
import { SDffe } from "../yosys.js";

export class SDFFCE extends Node {
    data: SDffe;

    entities: Entity[];

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

        makeConnection(Color.Red, clk.output(), clkIn.input);
        makeConnection(Color.Green, en.output(), clkIn.input);

        makeConnection(Color.Green, clkIn.output, dff1.input, dff2.input);

        makeConnection(Color.Red, d.output(), dataMask.input);
        makeConnection(Color.Green, rstIn.output, dataMask.input);

        makeConnection(Color.Red, dataMask.output, dff1.input);

        makeConnection(Color.Both, dff1.output, dff2.output);
        makeConnection(Color.Red, dff2.output, dff2.input);

        return dff1.output;
    }

    combs(): Entity[] {
        return this.entities;
    }
}
