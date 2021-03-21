import { Endpoint, Entity } from "../entities/Entity.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Node } from "./Node.js";
import { signalV, makeConnection, Color } from "../parser.js";

export interface MergeEl {
    shift: number;
    n: Node;
}

// TODO: merge MergeNode and SplitNode
export class MergeNode extends Node {
    inputs: MergeEl[];

    constructor(inputs: MergeEl[], outBits: number[]) {
        super(outBits);
        this.inputs = inputs;
    }

    comb: Entity[];
    out: Arithmetic;
    createComb(): void {
        this.out = new Arithmetic({
            first_signal: signalV,
            second_constant: this.outMask,
            operation: ArithmeticOperations.And,
            output_signal: signalV
        });
        this.comb = [];
        for (const item of this.inputs) {
            this.comb.push(new Arithmetic({
                first_signal: signalV,
                second_constant: item.shift,
                operation: ArithmeticOperations.LShift,
                output_signal: signalV
            }));
        }
    }
    connectComb(): void {
        for (let i = 0; i < this.inputs.length; i++) {
            let n = this.comb[i];
            makeConnection(Color.Red, this.inputs[i].n.output(), n.input);
            makeConnection(Color.Red, n.output, this.out.input);
        }
    }
    output(): Endpoint {
        return this.out.output;
    }
    combs(): Entity[] {
        return [...this.comb, this.out];
    }
}
