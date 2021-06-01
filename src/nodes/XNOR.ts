import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Color, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { BinaryCell } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { Node, nodeFunc } from "./Node.js";

// reduces overhead by replacing the converter with an inverter because ~(x ^ y) = ~x ^ y
export class XNOR extends Node {
    data: BinaryCell;

    a: Node;
    b: Node;

    inverter: Arithmetic;
    calculator: Arithmetic;

    constructor(data: BinaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(data.type == "$xnor", "only xnor allowed");

        console.assert(parseInt(data.parameters.A_SIGNED, 2) == 0, "Only unsigned values allowed");
        console.assert(parseInt(data.parameters.B_SIGNED, 2) == 0, "Only unsigned values allowed");
    }

    connect(getInputNode: nodeFunc) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    createComb(): void {
        if (this.a instanceof ConstNode || this.b instanceof Constant) {
            throw new Error("Unnecessary operation");
        }

        this.inverter = new Arithmetic({
            first_signal: signalV,
            second_constant: this.a.outMask,
            operation: ArithmeticOperations.Xor,
            output_signal: signalC
        });
        this.calculator = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });
    }

    connectComb(): void {
        makeConnection(Color.Red, this.a.output(), this.inverter.input);
        makeConnection(Color.Red, this.b.output(), this.calculator.input);
        makeConnection(Color.Green, this.inverter.output, this.calculator.input);
    }

    output(): Endpoint {
        return this.calculator.output;
    }

    combs(): Entity[] {
        return [this.inverter, this.calculator];
    }
}