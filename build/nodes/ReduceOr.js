import { logger } from "../logger.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalV } from "../entities/Entity.js";
import { createLimiter, Node } from "./Node.js";
export class ReduceOr extends Node {
    data;
    entities = [];
    constructor(data) {
        super(data.connections.Y);
        this.data = data;
        logger.assert(data.parameters.A_SIGNED == 0, "ReduceOr: Only unsigned values allowed");
        logger.assert(data.connections.Y.length == 1);
    }
    _connect(_, getMergeEls) {
        let els = getMergeEls(this.data.connections.A);
        // inputs that don't require masking
        let good = [];
        // inputs that require masking
        let bad = [];
        for (const el of els) {
            if (el.start == 0 && el.count == el.node.outputBits.length) {
                good.push(el);
            }
            else {
                bad.push(el);
            }
        }
        // logger.log(a.length, b.length);
        let last;
        for (let i = 0; i < good.length;) {
            const a = good[i++];
            const b = good[i++];
            let comb = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.NE,
                copy_count_from_input: false,
                output_signal: signalV
            });
            this.entities.push(comb);
            makeConnection(1 /* Red */, a.node.output(), comb.input);
            if (b)
                makeConnection(2 /* Green */, b.node.output(), comb.input);
            if (last)
                makeConnection(1 /* Red */, last.output, comb.output);
            last = comb;
        }
        let maxVal = Math.ceil(good.length / 2);
        for (const item of bad) {
            let mask = ((1 << item.count) - 1) << item.start;
            maxVal += mask;
            let comb = createLimiter(mask);
            this.entities.push(comb);
            makeConnection(1 /* Red */, item.node.output(), comb.input);
            if (last)
                makeConnection(1 /* Red */, last.output, comb.output);
            last = comb;
        }
        let maxBits = Math.floor(Math.log2(maxVal)) + 1;
        logger.assert(maxBits < 32, "Reduce or overflow");
        if (this.entities.length > 1 || bad.length > 0) {
            let out = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.NE,
                copy_count_from_input: false,
                output_signal: signalV
            });
            this.entities.push(out);
            makeConnection(1 /* Red */, last.output, out.input);
            return out.output;
        }
        return last.output;
    }
    combs() {
        return this.entities;
    }
}
