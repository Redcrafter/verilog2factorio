import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { Node } from "./Node.js";
// reduces overhead by replacing the converter with an inverter because ~(x ^ y) = ~x ^ y
export class XNOR extends Node {
    data;
    inverter;
    calculator;
    constructor(data) {
        super(data.connections.Y);
        this.data = data;
        logger.assert(data.type == "$xnor", "only xnor allowed");
        logger.assert(data.parameters.A_SIGNED == 0, "XNOR: Only unsigned values allowed");
        logger.assert(data.parameters.B_SIGNED == 0, "XNOR: Only unsigned values allowed");
    }
    _connect(getInputNode) {
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
        makeConnection(1 /* Red */, a.output(), this.inverter.input);
        makeConnection(1 /* Red */, b.output(), this.calculator.input);
        makeConnection(2 /* Green */, this.inverter.output, this.calculator.input);
        return this.calculator.output;
    }
    combs() {
        return [this.inverter, this.calculator];
    }
}
