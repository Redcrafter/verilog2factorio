import { Entity, SignalID, createEndpoint, convertEndpoint, dir } from "./Entity.js";

export enum ArithmeticOperations {
    Mul = "*",
    Div = "/",
    Add = "+",
    Sub = "-",
    Mod = "%",
    Pow = "^",
    LShift = "<<",
    RShift = ">>",
    And = "AND",
    Or = "OR",
    Xor = "XOR"
}

interface ArithmeticCombinatorParameters {
    first_signal?: SignalID,
    second_signal?: SignalID;
    first_constant?: number;
    second_constant?: number;

    operation: ArithmeticOperations;
    output_signal: SignalID;
}

export class Arithmetic extends Entity {
    params: ArithmeticCombinatorParameters;

    constructor(params: ArithmeticCombinatorParameters) {
        super(1, 2);
        this.params = params;

        this.input = createEndpoint(this, 1);
        this.output = createEndpoint(this, 2);

        console.assert(params.first_signal ? params.first_constant === undefined : params.first_constant !== undefined);
        console.assert(params.second_signal ? params.second_constant === undefined : params.second_constant !== undefined);
    }

    toObj() {
        if (this.input.red.length == 0 && this.input.green.length == 0 || this.output.red.length == 0 && this.output.green.length == 0) {
            throw new Error("Unconnected Arithmetic");
        }

        return {
            entity_number: this.id,
            name: "arithmetic-combinator",
            position: { x: this.x, y: this.y },
            direction: dir,
            control_behavior: {
                arithmetic_conditions: this.params
            },
            connections: {
                "1": convertEndpoint(this.input),
                "2": convertEndpoint(this.output)
            }
        };
    }
}
