import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, each, signalC, signalGreen, signalGrey, signalV } from "../entities/Entity.js";
import { createTransformer, Node } from "./Node.js";
export class SHR extends Node {
    data;
    entities;
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
        logger.assert(item.parameters.B_SIGNED == 0);
    }
    _connect(getInputNode) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);
        let trans = createTransformer(b.output());
        if (this.data.parameters.A_WIDTH == 32 && this.data.parameters.A_SIGNED == 0) {
            // factorios numbers are signed so if a number is 32 bits and we use shift it does an arithmetic shift instead of a logic shift
            // a >>> b = ((a + (int)0x80000000) >> b) + (0x40000000 >> b) * 2 + (b >> b) + (b == 31 ? 1 : 0)
            let constant = new Constant({
                index: 1,
                signal: signalV,
                count: 0x80000000 | 0
            }, {
                index: 2,
                signal: signalGreen,
                count: 0x40000000
            }, {
                index: 3,
                signal: signalGrey,
                count: 0x40000000
            });
            let shift = new Arithmetic({
                first_signal: each,
                second_signal: signalC,
                operation: ArithmeticOperations.RShift,
                output_signal: signalV
            });
            let fix = new Decider({
                first_signal: signalC,
                constant: 31,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalV
            });
            this.entities = [trans, constant, shift, fix];
            makeConnection(1 /* Red */, a.output(), shift.input);
            makeConnection(2 /* Green */, trans.output, constant.output, fix.input, shift.input);
            if (this.data.parameters.B_WIDTH > Math.floor(Math.log2(this.data.parameters.A_WIDTH))) {
                throw new Error("not implemented");
            }
            else {
                makeConnection(3 /* Both */, shift.output, fix.output);
                return shift.output;
            }
        }
        else {
            let calculator = new Arithmetic({
                first_signal: signalV,
                second_signal: signalC,
                operation: ArithmeticOperations.RShift,
                output_signal: signalV
            });
            this.entities = [trans, calculator];
            makeConnection(2 /* Green */, trans.output, calculator.input);
            makeConnection(1 /* Red */, a.output(), calculator.input);
            return calculator.output;
        }
    }
    combs() {
        return this.entities;
    }
}
