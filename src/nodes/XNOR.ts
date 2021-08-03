import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { BinaryCell } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { Node, nodeFunc } from "./Node.js";

// reduces overhead by replacing the converter with an inverter because ~(x ^ y) = ~x ^ y
export class XNOR extends Node {
    data: BinaryCell;

    inverter: Arithmetic;
    calculator: Arithmetic;

    constructor(data: BinaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(data.type == "$xnor", "only xnor allowed");

        console.assert(data.parameters.A_SIGNED == 0, "XNOR: Only unsigned values allowed");
        console.assert(data.parameters.B_SIGNED == 0, "XNOR: Only unsigned values allowed");
    }

    _connect(getInputNode: nodeFunc) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);

        this.inverter = new Arithmetic({
            first_signal: signalV,
            second_constant: a.outMask,
            operation: ArithmeticOperations.Xor,
            output_signal: signalC
        });
        this.calculator = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });

        makeConnection(Color.Red, a.output(), this.inverter.input);
        makeConnection(Color.Red, b.output(), this.calculator.input);
        makeConnection(Color.Green, this.inverter.output, this.calculator.input);

        return this.calculator.output;
    }

    combs(): Entity[] {
        return [this.inverter, this.calculator];
    }
}