import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { UnaryCell } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { Node, nodeFunc } from "./Node.js";

// ~x == x^(1 << n - 1)
export class NOT extends Node {
    data: UnaryCell;
    a: Node;

    inverter: Arithmetic;

    constructor(data: UnaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(parseInt(data.parameters.A_SIGNED, 2) == 0, "Only unsigned values allowed");
    }

    connect(getInputNode: nodeFunc) {
        this.a = getInputNode(this.data.connections.A);
        if (this.a instanceof ConstNode)
            throw new Error("unnecessary operation");
    }
    createComb(): void {
        this.inverter = new Arithmetic({
            first_signal: signalV,
            second_constant: this.a.outMask,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });
    }
    connectComb(): void {
        makeConnection(Color.Red, this.a.output(), this.inverter.input);
    }
    output(): Endpoint {
        return this.inverter.output;
    }
    combs(): Entity[] {
        return [this.inverter];
    }
}
