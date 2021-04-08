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

export class MergeNode extends Node {
    inputs: MergeEl[];

    constructor(inputs: MergeEl[], outBits: number[]) {
        super(outBits);
        this.inputs = inputs;
    }

    layers: { in: Arithmetic, out: Entity }[] = [];
    all: Entity[] = [];
    out: Entity;

    createComb(): void {
        let offset = 0;
        let constVal = 0;

        for (const n of this.inputs) {
            if (n.node instanceof ConstNode) {
                console.assert(n.start == 0);
                console.assert(n.count == 1);
                constVal |= n.node.value << offset;

                offset += n.count;

                this.layers.push(null);
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

            if (n.start == 0 && (offset == 0 || n.count == n.node.outputBits.length)) { // don't need a limiter
                // if(shiftVal == 0) don't need either but need a separator so signals don't get mixed
                this.layers.push({
                    in: shift,
                    out: shift
                });
                this.all.push(shift);
            } else if (shiftVal == 0) { // don't need shifter
                this.layers.push({
                    in: mask,
                    out: mask
                });
                this.all.push(mask);
            } else {
                this.layers.push({
                    in: shift,
                    out: mask
                });
                this.all.push(shift, mask);
            }

            offset += n.count;
        }

        if (constVal != 0) {
            let c = new Constant({
                count: constVal,
                index: 1,
                signal: signalV
            });
            this.all.push(c);
            this.layers.push({
                in: null,
                out: c
            });
        }

        this.out = this.layers.filter(x => x != null)[0].out;
    }

    connectComb(): void {
        for (let i = 0; i < this.inputs.length; i++) {
            const el = this.layers[i];
            if (el == null) continue;

            makeConnection(Color.Red, this.inputs[i].node.output(), el.in.input);
            if (el.in != el.out) {
                makeConnection(Color.Red, el.in.output, el.out.input);
            }
        }
        let last = null;
        for (const el of this.layers) {
            if (!el) continue;
            if (last) makeConnection(Color.Both, last.out.output, el.out.output);
            last = el;
        }
    }

    output(): Endpoint {
        return this.out.output;
    }

    combs(): Entity[] {
        return this.all;
    }
}
