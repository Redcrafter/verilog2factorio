import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Endpoint, makeConnection, signalC, signalV } from "../entities/Entity.js";
export function createTransformer(input, sig = signalC) {
    let trans = new Arithmetic({
        first_signal: signalV,
        second_constant: 0,
        operation: ArithmeticOperations.Or,
        output_signal: sig
    });
    if (input)
        makeConnection(1 /* Red */, input, trans.input);
    return trans;
}
export function createLimiter(mask) {
    if (mask == -1) {
        return new Arithmetic({
            first_signal: signalV,
            second_constant: 0,
            operation: ArithmeticOperations.Or,
            output_signal: signalV
        });
    }
    else {
        return new Arithmetic({
            first_signal: signalV,
            second_constant: mask,
            operation: ArithmeticOperations.And,
            output_signal: signalV
        });
    }
}
export class Node {
    outputBits;
    outMask;
    outputPlaceholder;
    constructor(bits) {
        logger.assert(bits.length <= 32, `Wire width too big: ${bits.length}`);
        this.outputBits = bits;
        this.outMask = bits.length == 32 ? -1 : (((1 << bits.length) - 1) | 0);
        this.outputPlaceholder = new Endpoint(null, -1);
    }
    connect(getInputNode, getMergeEls) {
        let e = this._connect(getInputNode, getMergeEls);
        if (!e) {
            if (this.outputPlaceholder.red || this.outputPlaceholder.green)
                throw new Error("missing output endpoint");
            this.outputPlaceholder = null;
        }
        else {
            this._setOutput(e);
        }
    }
    _setOutput(e) {
        if (this.outputPlaceholder.red) {
            makeConnection(1 /* Red */, e, this.outputPlaceholder);
            this.outputPlaceholder.red.remove(this.outputPlaceholder);
        }
        if (this.outputPlaceholder.green) {
            makeConnection(2 /* Green */, e, this.outputPlaceholder);
            this.outputPlaceholder.green.remove(this.outputPlaceholder);
        }
        this.outputPlaceholder = e;
    }
    output() {
        return this.outputPlaceholder;
    }
}
