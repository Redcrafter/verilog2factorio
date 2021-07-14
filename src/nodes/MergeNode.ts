import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Node } from "./Node.js";
import { ConstNode } from "./ConstNode.js";
import { Constant } from "../entities/Constant.js";

export interface MergeEl {
    node: Node;
    start: number;
    count: number;
}

function groupBy<T, K>(arr: T[], keyGetter: (a: T) => K) {
    let map = new Map<K, T[]>();
    for (const item of arr) {
        const key = keyGetter(item);
        const sub = map.get(key);
        if (!sub) {
            map.set(key, [item]);
        } else {
            sub.push(item);
        }
    }
    return map;
}

export class MergeNode extends Node {
    inputs: MergeEl[];

    constructor(inputs: MergeEl[], outBits: number[]) {
        super(outBits);
        this.inputs = inputs;
    }

    layers: {
        source: Node;

        in: Arithmetic;
        out: Entity;
    }[] = [];
    all: Entity[] = [];

    connect(): void {
        let offset = 0;
        let constVal = 0;

        for (const n of this.inputs) {
            if (n.node instanceof ConstNode) {
                // count absolute constant value to merge it into one
                console.assert(n.start == 0);
                console.assert(n.count == 1);
                constVal |= n.node.value << offset;

                offset += n.count;
                continue;
            }

            let shiftVal = offset - n.start;
            let op = shiftVal > 0 ? ArithmeticOperations.LShift : ArithmeticOperations.RShift;

            let shift = new Arithmetic({
                first_signal: signalV,
                second_constant: Math.abs(shiftVal),
                operation: op,
                output_signal: signalV
            });
            let mask = new Arithmetic({
                first_signal: signalV,
                second_constant: ((1 << n.count) - 1) << offset,
                operation: ArithmeticOperations.And,
                output_signal: signalV
            });

            if ((n.start == 0 || n.start + shiftVal <= 0) && n.start + n.count == n.node.outputBits.length) { // don't need a limiter
                // if(shiftVal == 0) don't need either but need a separator so signals don't get mixed
                this.layers.push({
                    source: n.node,
                    in: shift,
                    out: shift
                });
                this.all.push(shift);
            } else if (shiftVal == 0) { // don't need shifter
                this.layers.push({
                    source: n.node,
                    in: mask,
                    out: mask
                });
                this.all.push(mask);
            } else {
                this.layers.push({
                    source: n.node,
                    in: shift,
                    out: mask
                });
                makeConnection(Color.Red, shift.output, mask.input);
                this.all.push(shift, mask);
            }

            offset += n.count;
        }

        // if merged constant != 0 add one with all values combined
        if (constVal != 0) {
            let c = new Constant({
                count: constVal,
                index: 1,
                signal: signalV
            });
            this.all.push(c);
            this.layers.push({
                source: null,
                in: null,
                out: c
            });
        }
    }

    connectComb(): void {
        let out = this.layers[0].out.output;

        for (const l of this.layers) {
            if (l.source) makeConnection(Color.Red, l.source.output(), l.in.input);
            makeConnection(Color.Both, l.out.output, out);
        }
    }

    output(): Endpoint {
        // use last as output so constant combinator can potentially extend path
        return this.layers[0].out.output;
    }

    combs(): Entity[] {
        return this.all;
    }
}
