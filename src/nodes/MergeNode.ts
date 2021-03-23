import { Endpoint, Entity } from "../entities/Entity.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Node } from "./Node.js";
import { signalV, makeConnection, Color } from "../parser.js";
import { Pole } from "../entities/Pole.js";

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

    layers: { in: Arithmetic, out: Arithmetic }[] = [];
    all: Entity[] = [];
    out: Entity;

    createComb(): void {
        let offset = this.outputBits.length;
        for (const n of this.inputs) {
            offset -= n.count;

            let shiftVal = offset - (n.node.outputBits.length - (n.start + n.count));
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
        }

        if (this.inputs.length == 1) {
            this.out = this.layers[0].out;
        } else {
            let pole = new Pole();
            this.out = pole;
            this.all.push(pole);
        }
    }

    connectComb(): void {
        for (let i = 0; i < this.layers.length; i++) {
            const el = this.layers[i];
            makeConnection(Color.Red, this.inputs[i].node.output(), el.in.input);
            if (el.in != el.out) {
                makeConnection(Color.Red, el.in.output, el.out.input);
            }
        }
        if (this.inputs.length > 1) {
            for (const el of this.layers) {
                makeConnection(Color.Both, el.out.output, this.out.input);
            }
        }
    }

    output(): Endpoint {
        return this.out.output;
    }

    combs(): Entity[] {
        return this.all;
    }
}
