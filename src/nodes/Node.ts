import { logger } from "../logger.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Color, createEndpoint, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";

import { MergeEl } from "./MergeNode.js";

export type nodeFunc = (n: (number | string)[]) => Node;
export type mergeFunc = (n: (number | string)[]) => MergeEl[];

export function createTransformer(input?: Endpoint) {
    let trans = new Arithmetic({
        first_signal: signalV,
        second_constant: 0,
        operation: ArithmeticOperations.Or,
        output_signal: signalC
    });

    if (input) makeConnection(Color.Red, input, trans.input);

    return trans;
}

export function createLimiter(mask: number) {
    if (mask == -1) {
        return new Arithmetic({
            first_signal: signalV,
            second_constant: 0,
            operation: ArithmeticOperations.Or,
            output_signal: signalV
        });
    } else {
        return new Arithmetic({
            first_signal: signalV,
            second_constant: mask,
            operation: ArithmeticOperations.And,
            output_signal: signalV
        });
    }
}

export abstract class Node {
    outputBits: number[];
    outMask: number;
    outputPlaceholder: Endpoint;

    constructor(bits: number[]) {
        logger.assert(bits.length <= 32, `Wire width too big: ${bits.length}`);

        this.outputBits = bits;
        this.outMask = bits.length == 32 ? -1 : (((1 << bits.length) - 1) | 0);

        this.outputPlaceholder = createEndpoint(null, -1);
    }

    public connect(getInputNode: nodeFunc, getMergeEls: mergeFunc) {
        let e = this._connect(getInputNode, getMergeEls);
        if (!e) {
            if (this.outputPlaceholder.red.size != 0 || this.outputPlaceholder.green.size != 0)
                throw new Error("missing output endpoint");
            this.outputPlaceholder = null;
        } else {
            this._setOutput(e);
        }
    }

    // find input nodes using given functions and creat internal combinators
    abstract _connect(getInputNode: nodeFunc, getMergeEls: mergeFunc): Endpoint;

    protected _setOutput(e: Endpoint) {
        for (const n of this.outputPlaceholder.red) {
            n.red.delete(this.outputPlaceholder);
            n.red.add(e);
            e.red.add(n);
        }
        for (const n of this.outputPlaceholder.green) {
            n.green.delete(this.outputPlaceholder);
            n.green.add(e);
            e.green.add(n);
        }

        this.outputPlaceholder = e;
    }
    public output(): Endpoint {
        return this.outputPlaceholder;
    }
    abstract combs(): Entity[];
}
