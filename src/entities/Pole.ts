import { convertEndpoint, createEndpoint, Entity, RawEntity } from "./Entity.js";

export class Pole extends Entity {
    constructor() {
        super(1, 1);
        this.input = this.output = createEndpoint(this, 1);
    }

    toObj(): RawEntity {
        if (this.input.red.length == 0 && this.input.green.length == 0 && this.output.red.length == 0 && this.output.green.length == 0) {
            throw new Error("Unconnected Arithmetic");
        }

        return {
            entity_number: this.id,
            name: "medium-electric-pole",
            position: { x: this.x, y: this.y },
            connections: {
                "1": convertEndpoint(this.input)
            }
        };
    }
}
