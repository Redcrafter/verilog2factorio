import { UnaryCell } from "../yosys.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Color, Entity, makeConnection, signalV } from "../entities/Entity.js";

import { Node, nodeFunc } from "./Node.js";

// ~x == x^(1 << n - 1)
export class NOT extends Node {
    data: UnaryCell;

    inverter: Arithmetic;

    constructor(data: UnaryCell) {
        super(data.connections.Y);
        this.data = data;
    }

    _connect(getInputNode: nodeFunc) {
        const a = getInputNode(this.data.connections.A);

        this.inverter = new Arithmetic({
            first_signal: signalV,
            second_constant: a.outMask,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });

        makeConnection(Color.Red, a.output(), this.inverter.input);

        return this.inverter.output;
    }
    combs(): Entity[] {
        return [this.inverter];
    }
}
