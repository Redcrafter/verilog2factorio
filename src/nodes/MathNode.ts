import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Color, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { BinaryCell } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { createLimiter, createTransformer, Node } from "./Node.js";

// TODO: add support for chained operations?

const needsLimiter = new Set([
    ArithmeticOperations.Mul,
    ArithmeticOperations.Add,
    ArithmeticOperations.Pow,
    ArithmeticOperations.LShift
]);

export class MathNode extends Node {
    data: BinaryCell;
    method: ArithmeticOperations;

    a: Node;
    b: Node;

    transformer: Arithmetic;
    calculator: Arithmetic;
    limiter: Arithmetic;

    constructor(data: BinaryCell, method: ArithmeticOperations, negate = false) {
        super(data.connections.Y);
        this.data = data;
        this.method = method;

        // TODO: implement negate output only required for xnor?
        if (negate) {
            // throw new Error("not implemented");
            console.assert(false, "Math negate not implemented");
        }

        // add has custom node
        console.assert(method != ArithmeticOperations.Add);
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
    }

    createComb(): void {
        if (this.a instanceof ConstNode && this.b instanceof Constant) {
            throw new Error("Unnecessary operation");
        }

        if (this.a instanceof ConstNode) {
            this.calculator = new Arithmetic({
                first_constant: this.a.value,
                second_signal: signalV,
                operation: this.method,
                output_signal: signalV
            });
        } else if (this.b instanceof ConstNode) {
            this.calculator = new Arithmetic({
                first_signal: signalV,
                second_constant: this.b.value,
                operation: this.method,
                output_signal: signalV
            });
        } else {
            this.transformer = createTransformer();
            this.calculator = new Arithmetic({
                first_signal: signalV,
                second_signal: signalC,
                operation: this.method,
                output_signal: signalV
            });
        }

        if (needsLimiter.has(this.method)) {
            this.limiter = createLimiter(this.outMask);
        }
    }

    connectComb(): void {
        if (this.a instanceof ConstNode) {
            makeConnection(Color.Red, this.b.output(), this.calculator.input);
        } else if (this.b instanceof ConstNode) {
            makeConnection(Color.Red, this.a.output(), this.calculator.input);
        } else {
            makeConnection(Color.Red, this.b.output(), this.transformer.input);
            makeConnection(Color.Green, this.a.output(), this.calculator.input);
            makeConnection(Color.Red, this.transformer.output, this.calculator.input);
        }

        if (this.limiter) {
            makeConnection(Color.Red, this.calculator.output, this.limiter.input);
        }
    }

    output(): Endpoint {
        return (this.limiter ?? this.calculator).output;
    }

    combs(): Entity[] {
        let res = [];

        if (this.transformer) res.push(this.transformer);
        res.push(this.calculator);
        if (this.limiter) res.push(this.limiter);

        return res;
    }
}