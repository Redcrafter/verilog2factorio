import { Endpoint, Entity } from "../entities/Entity.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { createLimiter, Node } from "./Node.js";
import { signalV, makeConnection, Color } from "../parser.js";

export class SplitNode extends Node {
    input: Node;

    constructor(input: Node, bits: number[]) {
        super(bits);

        this.input = input;
    }

    shifter: Arithmetic;
    limiter: Arithmetic;
    createComb(): void {
        if (this.outputBits.length != 1) {
            throw new Error("Method not implemented.");
        }

        let shift = this.input.outputBits.indexOf(this.outputBits[0]);
        this.shifter = new Arithmetic({
            first_signal: signalV,
            second_constant: shift,
            operation: ArithmeticOperations.RShift,
            output_signal: signalV
        });
        this.limiter = createLimiter(this.outMask);
    }
    connectComb(): void {
        makeConnection(Color.Red, this.input.output(), this.shifter.input);
        makeConnection(Color.Red, this.shifter.output, this.limiter.input);
    }
    output(): Endpoint {
        return (this.limiter ?? this.shifter).output;
    }
    combs(): Entity[] {
        if (this.limiter)
            return [this.limiter, this.shifter];
        else
            return [this.shifter];
    }
}
