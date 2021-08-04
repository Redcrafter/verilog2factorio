import { logger } from "../logger.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { createLimiter, createTransformer, Node } from "./Node.js";
// https://github.com/YosysHQ/yosys/blob/master/techlibs/common/simlib.v
// s should be one hot encoded. If not errors will occur
export class PMUX extends Node {
    data;
    entities = [];
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }
    _connect(getInputNode, getMergeEls) {
        const a = getInputNode(this.data.connections.A);
        let width = this.data.parameters.WIDTH;
        let s_width = this.data.parameters.S_WIDTH;
        const b = new Array(s_width);
        for (let i = 0; i < s_width; i++) {
            b[i] = getInputNode(this.data.connections.B.slice(i * width, (i + 1) * width));
        }
        const s = getMergeEls(this.data.connections.S);
        let limiter = createLimiter(this.outMask);
        this.entities.push(limiter);
        let def = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        makeConnection(2 /* Green */, a.output(), def.input);
        makeConnection(1 /* Red */, def.output, limiter.input);
        this.entities.push(def);
        let bIndex = 0;
        for (let i = 0; i < s.length; i++) {
            const item = s[i];
            logger.assert(item.start == 0);
            logger.assert(item.start + item.count == item.node.outputBits.length);
            // output might not be connected but idc
            let trans = createTransformer(item.node.output());
            this.entities.push(trans);
            makeConnection(1 /* Red */, trans.output, def.input);
            for (let j = 0; j < item.count; j++) {
                const element = b[bIndex++];
                let comp = new Decider({
                    first_signal: signalC,
                    constant: 1 << j,
                    comparator: ComparatorString.EQ,
                    copy_count_from_input: true,
                    output_signal: signalV
                });
                makeConnection(1 /* Red */, element.output(), comp.input);
                this.entities.push(comp);
                makeConnection(2 /* Green */, trans.output, comp.input);
                makeConnection(1 /* Red */, comp.output, limiter.input);
            }
        }
        return limiter.output;
    }
    combs() {
        return this.entities;
    }
}
