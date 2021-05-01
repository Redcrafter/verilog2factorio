import { Arithmetic } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js"
import { Constant } from "../entities/Constant.js";
import { Color, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { ConstNode } from "./ConstNode.js";
import { createTransformer, Node, nodeFunc } from "./Node.js";
import { BinaryCell } from "../yosys.js";

// TODO: add support for chained operations?

export class LogicNode extends Node {
    data: BinaryCell;
    method: ComparatorString;

    a: Node;
    b: Node;

    transformer: Arithmetic;
    calculator: Decider;

    constructor(data: BinaryCell, method: ComparatorString) {
        super(data.connections.Y);
        this.data = data;
        this.method = method;

        console.assert(this.outputBits.length == 1);
    }

    connect(getInputNode: nodeFunc) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    createComb(): void {
        if (this.a instanceof ConstNode && this.b instanceof Constant) {
            throw new Error("Unnecessary operation");
        }

        if (this.a instanceof ConstNode) {
            this.calculator = new Decider({
                first_signal: signalV,
                constant: this.a.value,
                comparator: this.method,
                copy_count_from_input: false,
                output_signal: signalV
            });
        } else if (this.b instanceof ConstNode) {
            this.calculator = new Decider({
                first_signal: signalV,
                constant: this.b.value,
                comparator: this.method,
                copy_count_from_input: false,
                output_signal: signalV
            });
        } else {
            this.transformer = createTransformer();
            this.calculator = new Decider({
                first_signal: signalV,
                second_signal: signalC,
                comparator: this.method,
                copy_count_from_input: false,
                output_signal: signalV
            });
        }
    }

    connectComb(): void {
        if (this.a instanceof ConstNode) {
            makeConnection(Color.Red, this.b.output(), this.calculator.input);
        } else if (this.b instanceof ConstNode) {
            makeConnection(Color.Red, this.a.output(), this.calculator.input);
        } else {
            makeConnection(Color.Red, this.b.output(), this.transformer.input);

            makeConnection(Color.Red, this.a.output(), this.calculator.input);
            makeConnection(Color.Red, this.transformer.output, this.calculator.input);
        }
    }

    output(): Endpoint {
        return this.calculator.output;
    }

    combs(): Entity[] {
        let res = [];

        if (this.transformer) res.push(this.transformer);
        res.push(this.calculator);

        return res;
    }
}