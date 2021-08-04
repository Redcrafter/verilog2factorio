import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { createTransformer, Node } from "./Node.js";
export class SSHR extends Node {
    data;
    entities;
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
        logger.assert(item.parameters.A_SIGNED == 1);
        logger.assert(item.parameters.B_SIGNED == 0);
        logger.assert(item.type == "$sshr", "Only add allowed");
    }
    _connect(getInputNode) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);
        if (this.data.parameters.A_WIDTH == 32) {
            // same as normal shift
            let trans = createTransformer(a.output());
            let shift = new Arithmetic({
                first_signal: signalV,
                second_signal: signalC,
                operation: ArithmeticOperations.RShift,
                output_signal: signalV
            });
            this.entities = [trans, shift];
            makeConnection(2 /* Green */, trans.output, shift.input);
            makeConnection(1 /* Red */, b.output(), shift.input);
            return shift.output;
        }
        else {
            throw new Error("arithemtic right shift not implemented for < 32 bits");
        }
    }
    combs() {
        return this.entities;
    }
}
