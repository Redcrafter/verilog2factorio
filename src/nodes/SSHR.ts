import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { BinaryCell } from "../yosys.js";
import { createTransformer, Node, nodeFunc } from "./Node.js";

export class SSHR extends Node {
    data: BinaryCell;
    entities: Entity[];

    constructor(item: BinaryCell) {
        super(item.connections.Y);
        this.data = item;

        console.assert(item.parameters.A_SIGNED == 1);
        console.assert(item.parameters.B_SIGNED == 0);
        console.assert(item.type == "$sshr", "Only add allowed");
    }

    _connect(getInputNode: nodeFunc) {
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

            makeConnection(Color.Green, trans.output, shift.input);
            makeConnection(Color.Red, b.output(), shift.input);

            return shift.output;
        } else {
            throw new Error("arithemtic right shift not implemented for < 32 bits");
        }
    }

    combs(): Entity[] {
        return this.entities;
    }
}
