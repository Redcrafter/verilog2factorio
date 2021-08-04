import { logger } from "../logger.js";
import { BinaryCell } from "../yosys.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, each, Entity, makeConnection, signalC, signalGreen, signalGrey, signalV } from "../entities/Entity.js";

import { createLimiter, createTransformer, Node, nodeFunc } from "./Node.js";

// TODO: optimize constant subtraction

const needsLimiter = new Set([
    ArithmeticOperations.Mul,
    ArithmeticOperations.Add,
    ArithmeticOperations.Pow,
    ArithmeticOperations.LShift
]);

export class MathNode extends Node {
    data: BinaryCell;
    method: ArithmeticOperations;

    entities: Entity[];

    constructor(data: BinaryCell, method: ArithmeticOperations) {
        super(data.connections.Y);
        this.data = data;
        this.method = method;

        logger.assert(data.parameters.A_SIGNED == data.parameters.B_SIGNED);

        if (method == ArithmeticOperations.Div || method == ArithmeticOperations.Mod) { // sign only matters for division and modulo
            logger.assert(data.parameters.A_WIDTH == data.parameters.B_WIDTH);

            if (data.parameters.A_WIDTH == 32) {
                logger.assert(data.parameters.A_SIGNED == 1, `${method}: Only 32-bit signed values allowed`);
                logger.assert(data.parameters.B_SIGNED == 1, `${method}: Only 32-bit signed values allowed`);
            } else {
                logger.assert(data.parameters.A_SIGNED == 0, `${method}: Only unsigned values allowed`);
                logger.assert(data.parameters.B_SIGNED == 0, `${method}: Only unsigned values allowed`);
            }
        }

        // add has custom node
        logger.assert(method != ArithmeticOperations.Add);
    }

    _connect(getInputNode: nodeFunc) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);

        if (this.method == ArithmeticOperations.RShift && this.data.parameters.A_WIDTH == 32 && this.data.parameters.A_SIGNED == 0) {
            // factorios numbers are signed so if a number is 32 bits and we use shift it does an arithmetic shift instead of a logic shift

            // a >>> b = ((a + (int)0x80000000) >> b) + (0x40000000 >> b) * 2 + (b >> b) + (b == 31 ? 1 : 0)

            let trans = createTransformer(b.output());
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

            makeConnection(Color.Red, a.output(), shift.input);

            makeConnection(Color.Green, trans.output, constant.output, fix.input, shift.input);

            if (this.data.parameters.B_WIDTH > Math.floor(Math.log2(this.data.parameters.A_WIDTH))) {
                throw new Error("not implemented");
            } else {
                makeConnection(Color.Both, shift.output, fix.output);
                return shift.output;
            }
        }

        let transformer = createTransformer(a.output());
        let calculator = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: this.method,
            output_signal: signalV
        });
        this.entities = [transformer, calculator];

        makeConnection(Color.Green, transformer.output, calculator.input);
        makeConnection(Color.Red, b.output(), calculator.input);

        if (needsLimiter.has(this.method) && this.outMask != -1) {
            let limiter = createLimiter(this.outMask);
            makeConnection(Color.Red, calculator.output, limiter.input);
            this.entities.push(limiter);

            return limiter.output;
        }

        return calculator.output;
    }

    combs(): Entity[] {
        return this.entities;
    }
}