import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Endpoint, Entity, signalC, signalV } from "../entities/Entity.js";
import { MergeEl } from "./MergeNode.js";

export type nodeFunc = (n: (number | string)[]) => Node;
export type mergeFunc = (n: (number | string)[]) => MergeEl[];

export function createTransformer() {
    return new Arithmetic({
        first_signal: signalV,
        second_constant: 0,
        operation: ArithmeticOperations.Or,
        output_signal: signalC
    });
}

export function createLimiter(mask: number) {
    if(mask == -1) throw new Error("not implemented: mask can be ignored");

    return new Arithmetic({
        first_signal: signalV,
        second_constant: mask,
        operation: ArithmeticOperations.And,
        output_signal: signalV
    });
}

export abstract class Node {
    outputBits: number[];
    outMask: number;

    constructor(bits: number[]) {
        console.assert(bits.length <= 32, `Wire width too big: ${bits.length}`);

        this.outputBits = bits;
        this.outMask = bits.length == 32 ? -1 : (((1 << bits.length) - 1) | 0);
    }

    // find input nodes using given functions and creat internal combinators
    connect(getInputNode: nodeFunc, getMergeEls: mergeFunc) { }

    abstract connectComb(): void;
    abstract output(): Endpoint;
    abstract combs(): Entity[];
}
