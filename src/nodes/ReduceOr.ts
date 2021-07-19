import { ComparatorString, Decider } from "../entities/Decider.js";
import { UnaryCell } from "../yosys.js";
import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { createLimiter, mergeFunc, Node, nodeFunc } from "./Node.js";

export class ReduceOr extends Node {
    data: UnaryCell;

    elements: {
        comb: Entity;
        a: Node;
        b: Node;
    }[] = [];
    out: Entity;

    constructor(data: UnaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(data.parameters.A_SIGNED == 0, "ReduceOr: Only unsigned values allowed");
        console.assert(data.connections.Y.length == 1);
    }

    connect(_: nodeFunc, getMergeEls: mergeFunc) {
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

            this.elements.push({ comb, a: a?.node, b: b?.node });
        }

        let maxVal = Math.ceil(good.length / 2);
        for (const item of bad) {
            let mask = ((1 << item.count) - 1) << item.start;
            maxVal += mask;

            this.elements.push({
                comb: createLimiter(mask),
                a: item.node,
                b: undefined
            });
        }

        let maxBits = Math.floor(Math.log2(maxVal)) + 1;
        console.assert(maxBits < 32, "Reduce or overflow");

        if (this.elements.length > 1) {
            this.out = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.NE,
                copy_count_from_input: false,
                output_signal: signalV
            });

            for (let i = 0; i < this.elements.length; i++) {
                makeConnection(Color.Red, this.elements[i].comb.output, this.out.input);
            }
        } else {
            this.out = this.elements[0].comb;
        }
    }

    connectComb(): void {
        for (const el of this.elements) {
            makeConnection(Color.Red, el.a.output(), el.comb.input);
            if (el.b) makeConnection(Color.Green, el.b.output(), el.comb.input);
        }
    }
    output(): Endpoint {
        return this.out.output;
    }
    combs(): Entity[] {
        let ret = this.elements.map(x => x.comb);
        if (this.elements.length > 1) ret.push(this.out);
        return ret;
    }
}
