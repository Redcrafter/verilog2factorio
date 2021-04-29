import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Endpoint, Entity, signalC, signalV } from "../entities/Entity.js";

type func = (n: number[]) => Node;

export function createTransformer() {
    return new Arithmetic({
        first_signal: signalV,
        second_constant: 0,
        operation: ArithmeticOperations.Or,
        output_signal: signalC
    });
}

export function createLimiter(mask: number) {
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
        console.assert(bits.length <= 31, `Wire width too big: ${bits.length}`); // factorio uses 32bit signed integers so for now only safely support 31 bits
        this.outputBits = bits;
        this.outMask = (1 << bits.length) - 1;
    }

    connect(getInputNode: func, getMergeEls) { }

    abstract createComb(): void;
    abstract connectComb(): void;
    abstract output(): Endpoint;
    abstract combs(): Entity[];
}
