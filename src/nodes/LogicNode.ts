import { logger } from "../logger.js";
import { BinaryCell } from "../yosys.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js"
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";

import { createTransformer, Node, nodeFunc } from "./Node.js";

export class LogicNode extends Node {
    data: BinaryCell;
    method: ComparatorString;

    entities: Entity[];

    constructor(data: BinaryCell, method: ComparatorString) {
        super(data.connections.Y);
        this.data = data;
        this.method = method;

        logger.assert(data.parameters.A_SIGNED === data.parameters.B_SIGNED, "compare sign has to be the same");

        logger.assert(this.outputBits.length == 1);
    }

    _connect(getInputNode: nodeFunc) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);

        if (this.method == ComparatorString.LT || this.method == ComparatorString.LE || this.method == ComparatorString.GT || this.method == ComparatorString.GE) {
            if (this.data.parameters.A_WIDTH == 32 && this.data.parameters.A_SIGNED == 0) {
                // a < b == (a ^ (0x80000000 | 0)) < (b ^ (0x80000000 | 0));
                logger.assert(this.data.parameters.A_WIDTH == this.data.parameters.B_WIDTH);

                let mask = 1 << (this.data.parameters.A_WIDTH - 1);

                let invA = new Arithmetic({
                    first_signal: signalV,
                    second_constant: mask,
                    operation: ArithmeticOperations.Xor,
                    output_signal: signalV
                });
                let invB = new Arithmetic({
                    first_signal: signalV,
                    second_constant: mask,
                    operation: ArithmeticOperations.Xor,
                    output_signal: signalC
                });
                let out = new Decider({
                    first_signal: signalV,
                    second_signal: signalC,
                    comparator: this.method,
                    copy_count_from_input: false,
                    output_signal: signalV
                });
                this.entities = [invA, invB, out];

                makeConnection(Color.Red, a.output(), invA.input);
                makeConnection(Color.Red, b.output(), invB.input);
                makeConnection(Color.Red, invA.output, invB.output, out.input);

                return out.output;
            }

            if (this.data.parameters.A_WIDTH < 32 && this.data.parameters.A_SIGNED == 1) {
                // same idea as before?
                throw new Error("not implemented");
            }
        }

        let t = createTransformer(b.output());
        let out = new Decider({
            first_signal: signalV,
            second_signal: signalC,
            comparator: this.method,
            copy_count_from_input: false,
            output_signal: signalV
        });
        this.entities = [t, out];

        makeConnection(Color.Red, a.output(), out.input);
        makeConnection(Color.Green, t.output, out.input);

        return out.output;
    }

    combs(): Entity[] {
        return this.entities;
    }
}