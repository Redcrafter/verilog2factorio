import { logger } from "../logger.js";
import { Entity, createEndpoint, convertEndpoint, dir } from "./Entity.js";
export var ArithmeticOperations;
(function (ArithmeticOperations) {
    ArithmeticOperations["Mul"] = "*";
    ArithmeticOperations["Div"] = "/";
    ArithmeticOperations["Add"] = "+";
    ArithmeticOperations["Sub"] = "-";
    ArithmeticOperations["Mod"] = "%";
    ArithmeticOperations["Pow"] = "^";
    ArithmeticOperations["LShift"] = "<<";
    ArithmeticOperations["RShift"] = ">>";
    ArithmeticOperations["And"] = "AND";
    ArithmeticOperations["Or"] = "OR";
    ArithmeticOperations["Xor"] = "XOR";
})(ArithmeticOperations || (ArithmeticOperations = {}));
export class Arithmetic extends Entity {
    params;
    constructor(params) {
        super(1, 2);
        this.params = params;
        this.input = createEndpoint(this, 1);
        this.output = createEndpoint(this, 2, params.output_signal);
        logger.assert(params.first_signal ? params.first_constant === undefined : params.first_constant !== undefined);
        logger.assert(params.second_signal ? params.second_constant === undefined : params.second_constant !== undefined);
    }
    toObj() {
        if (this.input.red.size == 0 && this.input.green.size == 0 || this.output.red.size == 0 && this.output.green.size == 0) {
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
