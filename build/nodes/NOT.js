import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { makeConnection, signalV } from "../entities/Entity.js";
import { Node } from "./Node.js";
// ~x == x^(1 << n - 1)
export class NOT extends Node {
    data;
    inverter;
    constructor(data) {
        super(data.connections.Y);
        this.data = data;
    }
    _connect(getInputNode) {
        const a = getInputNode(this.data.connections.A);
        this.inverter = new Arithmetic({
            first_signal: signalV,
            second_constant: a.outMask,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });
        makeConnection(1 /* Red */, a.output(), this.inverter.input);
        return this.inverter.output;
    }
    combs() {
        return [this.inverter];
    }
}
