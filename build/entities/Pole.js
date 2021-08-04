import { convertEndpoint, createEndpoint, Entity } from "./Entity.js";
export class Pole extends Entity {
    constructor() {
        super(1, 1);
        this.input = this.output = createEndpoint(this, 1);
    }
    toObj() {
        if (this.input.red.size == 0 && this.input.green.size == 0 && this.output.red.size == 0 && this.output.green.size == 0) {
            throw new Error("Unconnected Pole");
        }
        return {
            entity_number: this.id,
            name: "steel-chest",
            position: { x: this.x, y: this.y },
            connections: {
                "1": convertEndpoint(this.input)
            }
        };
    }
}
