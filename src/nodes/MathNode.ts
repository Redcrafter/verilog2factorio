import { logger } from "../logger.js";
import { BinaryCell } from "../yosys.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";

import { createLimiter, createTransformer, Node, nodeFunc } from "./Node.js";

// TODO: optimize constant subtraction

const needsLimiter = new Set([
    ArithmeticOperations.Mul,
    ArithmeticOperations.Sub,
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
            if (data.parameters.A_WIDTH == data.parameters.B_WIDTH)
                logger.warn("mismatching div width");

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

        let transformer = createTransformer(b.output());
        let calculator = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: this.method,
            output_signal: signalV
        });
        this.entities = [transformer, calculator];

        makeConnection(Color.Green, transformer.output, calculator.input);
        makeConnection(Color.Red, a.output(), calculator.input);

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