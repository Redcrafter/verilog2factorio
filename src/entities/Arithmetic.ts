import { Entity, SignalID, RawEntity } from "./Entity.js";
import { dir, objEqual } from "../parser.js";

export const enum ArithmeticOperations {
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
        this.output.type = 2;
        this.params = params;
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
                "1": {
                    red: this.input.red,
                    green: this.input.green
                },
                "2": {
                    red: this.output.red,
                    green: this.output.green
                }
            }
        };
    }

    eq(other: RawEntity) {
        if (!(other instanceof Arithmetic))
            return false;

        return objEqual(this.params, other.params);
    }
}
