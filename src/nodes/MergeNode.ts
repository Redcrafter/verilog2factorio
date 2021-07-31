import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { createLimiter, Node } from "./Node.js";
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

    entities: Entity[] = [];

    _connect() {
        let offset = 0;
        let constVal = 0;

        let last: Endpoint;

        for (let i = 0; i < this.inputs.length; i++) {
            const n = this.inputs[i];

            if (n.node instanceof ConstNode) {
                // count absolute constant value to merge it into one
                console.assert(n.start == 0);
                console.assert(n.count == 1);
                constVal |= n.node.value << offset;

                offset += n.count;
                continue;
            }

            if (n.count == 1) {
                let j = i + 1;
                for (; j < this.inputs.length; j++) {
                    let next = this.inputs[j];
                    if (!(next.node == n.node && next.count == 1 && next.start == n.start)) {
                        break;
                    }
                }

                let count = j - i;
                if (count > 1) {
                    let prev = n.node.output();
                    if(n.start != 0) { // need a shift
                        let shift = new Arithmetic({
                            first_signal: signalV,
                            second_constant: n.start,
                            operation: ArithmeticOperations.RShift,
                            output_signal: signalV
                        });
                        this.entities.push(shift);
                        makeConnection(Color.Red, prev, shift.input);
                        prev = shift.output;
                    }
                    if(n.start + n.count != n.node.outputBits.length || n.node.outputBits.length == 32) {
                        let mask = createLimiter(1);
                        this.entities.push(mask);
                        makeConnection(Color.Red, prev, mask.input);
                        prev = mask.output;
                    }

                    let mul = new Arithmetic({
                        first_signal: signalV,
                        second_constant: (((2 ** count) - 1) | 0) << offset,
                        operation: ArithmeticOperations.Mul,
                        output_signal: signalV
                    });

                    makeConnection(Color.Red, prev, mul.input);
                    this.entities.push(mul);

                    if (last) makeConnection(Color.Both, mul.output, last);
                    last = mul.output;

                    i += count - 1;
                    offset += count;
                    continue;
                }
            }

            let shiftVal = offset - n.start;
            let op = shiftVal > 0 ? ArithmeticOperations.LShift : ArithmeticOperations.RShift;

            let shift = new Arithmetic({
                first_signal: signalV,
                second_constant: Math.abs(shiftVal),
                operation: op,
                output_signal: signalV
            });
            let mask = createLimiter(((2 ** n.count) - 1) << offset);

            let inp;
            let out;

            const noLowMask = n.start == 0 || n.start + shiftVal <= 0;
            const noHeighMask = n.start + n.count == n.node.outputBits.length || n.start + n.count + shiftVal >= 32;
            const arithShift = n.node.outputBits.length == 32 && shiftVal < 0;

            if (noLowMask && noHeighMask && !arithShift) { // don't need a limiter
                // if(shiftVal == 0) don't need either but need a separator so signals don't get mixed
                inp = out = shift;
                this.entities.push(shift);
            } else if (shiftVal == 0) { // don't need shifter
                inp = out = mask;
                this.entities.push(mask);
            } else {
                inp = shift;
                out = mask;
                makeConnection(Color.Red, shift.output, mask.input);
                this.entities.push(shift, mask);
            }

            makeConnection(Color.Red, n.node.output(), inp.input);
            if (last) makeConnection(Color.Both, out.output, last);
            last = out.output;

            offset += n.count;
        }

        // if merged constant != 0 add one with all values combined
        if (constVal != 0) {
            let c = Constant.simple(constVal);
            this.entities.push(c);
            makeConnection(Color.Both, c.output, last);
            last = c.output;
        }

        return last;
    }

    combs(): Entity[] {
        return this.entities;
    }
}
