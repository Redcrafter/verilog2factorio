import { logger } from "../logger.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Input } from "./Input.js";
import { createTransformer, Node } from "./Node.js";
function arraySame(str, expected) {
    for (let i = 0; i < str.length; i++) {
        if (str[i] !== expected)
            return false;
    }
    return true;
}
export class MemNode extends Node {
    data;
    outputSegments = [];
    entities = [];
    constructor(item) {
        super([]);
        this.data = item;
        let width = this.data.parameters.WIDTH;
        for (let i = 0; i < this.data.parameters.RD_PORTS; i++) {
            let bits = item.connections.RD_DATA.slice(i * width, (i + 1) * width);
            this.outputSegments.push(new MemRead(bits));
        }
        logger.assert(item.parameters.ABITS <= 32, "too many address bits");
        logger.assert(item.parameters.WIDTH <= 32, "cannot store > 32 bit numbers");
        logger.assert(arraySame(item.parameters.INIT, "x"), "memory initialization not implemented");
        // logger.assert(item.parameters.RD_CLK_ENABLE   == ((1 << item.parameters.RD_PORTS) - 1)); // read clock is ignored
        // logger.assert(item.parameters.RD_CLK_POLARITY == ((1 << item.parameters.RD_PORTS) - 1));
        logger.assert(item.parameters.RD_TRANSPARENT == ((1 << item.parameters.RD_PORTS) - 1), "read has to be transparent");
        logger.assert(item.parameters.WR_CLK_ENABLE == 1, "wr_clk has to be set");
        logger.assert(item.parameters.WR_CLK_POLARITY == 1, "invert wr_clk polarity");
        logger.assert(item.parameters.WR_PORTS == 1, "only one write allowed");
        logger.assert(arraySame(item.connections.RD_CLK, item.connections.WR_CLK[0]));
        logger.assert(arraySame(item.connections.RD_EN, "1"));
        logger.assert(arraySame(item.connections.WR_EN, item.connections.WR_EN[0]));
    }
    _connect(getInputNode, getMergeEls) {
        const WR_ADDR = getInputNode(this.data.connections.WR_ADDR);
        const WR_DATA = getInputNode(this.data.connections.WR_DATA);
        const WR_EN = getInputNode([this.data.connections.WR_EN[0]]);
        const WR_CLK = getInputNode(this.data.connections.WR_CLK);
        if (!(WR_CLK instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }
        const SIZE = this.data.parameters.SIZE;
        const RD_PORTS = this.data.parameters.RD_PORTS;
        const OFFSET = this.data.parameters.OFFSET;
        const ABITS = this.data.parameters.ABITS;
        let trans = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.entities.push(trans);
        makeConnection(1 /* Red */, WR_CLK.output(), trans.input);
        makeConnection(2 /* Green */, WR_EN.output(), trans.input);
        let dffOuts = [];
        // create all dffs and write inputs
        for (let i = 0; i < SIZE; i++) {
            let writeEq = new Decider({
                first_signal: signalV,
                constant: i + OFFSET,
                comparator: ComparatorString.EQ,
                copy_count_from_input: true,
                output_signal: signalC,
            });
            makeConnection(1 /* Red */, WR_ADDR.output(), writeEq.input);
            makeConnection(2 /* Green */, trans.output, writeEq.input);
            let decider1 = new Decider({
                first_signal: signalC,
                constant: 1,
                comparator: ComparatorString.EQ,
                copy_count_from_input: true,
                output_signal: signalV
            }); // if c == 1 output a
            let decider2 = new Decider({
                first_signal: signalC,
                constant: 0,
                comparator: ComparatorString.EQ,
                copy_count_from_input: true,
                output_signal: signalV
            }); // if c == 0 output b
            this.entities.push(writeEq, decider1, decider2);
            makeConnection(1 /* Red */, WR_DATA.output(), decider1.input);
            makeConnection(2 /* Green */, writeEq.output, decider1.input, decider2.input);
            makeConnection(2 /* Green */, decider1.output, decider2.output);
            makeConnection(1 /* Red */, decider2.output, decider2.input, decider1.output);
            dffOuts.push(decider1);
        }
        // create read outputs
        for (let i = 0; i < RD_PORTS; i++) {
            let RD_ADDR = getInputNode(this.data.connections.RD_ADDR.slice(i * ABITS, (i + 1) * ABITS));
            let addrTrans = createTransformer(RD_ADDR.output());
            this.entities.push(addrTrans);
            let last;
            for (let j = 0; j < SIZE; j++) {
                let readEq = new Decider({
                    first_signal: signalC,
                    constant: j + OFFSET,
                    comparator: ComparatorString.EQ,
                    copy_count_from_input: true,
                    output_signal: signalV
                });
                this.entities.push(readEq);
                makeConnection(2 /* Green */, dffOuts[j].output, readEq.input);
                makeConnection(1 /* Red */, addrTrans.output, readEq.input);
                if (last)
                    makeConnection(3 /* Both */, last.output, readEq.output);
                last = readEq;
            }
            this.outputSegments[i].endPoint = last.output;
        }
        return null;
    }
    combs() {
        return this.entities;
    }
    output() {
        throw new Error("Method not allowed.");
    }
}
class MemRead extends Node {
    endPoint;
    constructor(bits) {
        super(bits);
    }
    _connect(getInputNode, getMergeEls) {
        return this.endPoint;
    }
    combs() { return []; }
}
