import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Endpoint, Entity } from "../entities/Entity.js";
import { Color, makeConnection, signalC, signalV } from "../parser.js";
import { Node } from "./Node.js";

export class XOR extends Node {
    a: Node;
    b: Node;

    data: any;

    constructor(item: any) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    transformer: Arithmetic;
    calc: Arithmetic;
    createComb(): void {
        this.transformer = new Arithmetic({
            first_signal: signalV,
            second_constant: 0,
            operation: ArithmeticOperations.Add,
            output_signal: signalC
        });
        this.calc = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: ArithmeticOperations.Xor,
            output_signal: signalV
        });
    }
    connectComb(): void {
        makeConnection(Color.Red, this.a.output(), this.transformer.input);

        makeConnection(Color.Red, this.b.output(), this.calc.input);
        makeConnection(Color.Green, this.transformer.output, this.calc.input);
    }
    output(): Endpoint { return this.calc.output; }
    combs(): Entity[] {
        return [this.transformer, this.calc];
    }
}
