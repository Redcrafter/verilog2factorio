import { ComparatorString, Decider } from "../entities/Decider.js";
import { UnaryCell } from "../yosys.js";
import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { createLimiter, mergeFunc, Node, nodeFunc } from "./Node.js";

export class ReduceOr extends Node {
    data: UnaryCell;

    entities: Entity[] = [];

    constructor(data: UnaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(data.parameters.A_SIGNED == 0, "ReduceOr: Only unsigned values allowed");
        console.assert(data.connections.Y.length == 1);
    }

    _connect(_: nodeFunc, getMergeEls: mergeFunc) {
        let els = getMergeEls(this.data.connections.A);
        // inputs that don't require masking
        let good: typeof els = [];
        // inputs that require masking
        let bad: typeof els = [];
        for (const el of els) {
            if (el.start == 0 && el.count == el.node.outputBits.length) {
                good.push(el);
            } else {
                bad.push(el);
            }
        }
        // console.log(a.length, b.length);

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

            makeConnection(Color.Red, a.node.output(), comb.input);
            if(b) makeConnection(Color.Green, b.node.output(), comb.input);
            
            if(last) makeConnection(Color.Red, last.output, comb.output);
            last = comb;
        }

        let maxVal = Math.ceil(good.length / 2);
        for (const item of bad) {
            let mask = ((1 << item.count) - 1) << item.start;
            maxVal += mask;

            let comb = createLimiter(mask);
            this.entities.push(comb);
        
            makeConnection(Color.Red, item.node.output(), comb.input);

            if(last) makeConnection(Color.Red, last.output, comb.output);
            last = comb;
        }

        let maxBits = Math.floor(Math.log2(maxVal)) + 1;
        console.assert(maxBits < 32, "Reduce or overflow");

        if (this.entities.length > 1 || bad.length > 0) {
            let out = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.NE,
                copy_count_from_input: false,
                output_signal: signalV
            });
            this.entities.push(out);
            makeConnection(Color.Red, last.output, out.input);

            return out.output;
        }
        return last.output;
    }
    combs(): Entity[] {
        return this.entities;
    }
}
