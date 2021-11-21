import { logger } from "../logger.js";
import { Endpoint, Entity } from "./Entity.js";
export class Pole extends Entity {
    constructor() {
        super(1, 1);
        this.input = this.output = new Endpoint(this, 1);
    }
    toObj() {
        logger.assert(this.input.redP.size != 0 || this.input.greenP.size != 0, "Unconnected Pole");
        return {
            entity_number: this.id,
            name: "medium-electric-pole",
            position: { x: this.x, y: this.y },
            connections: {
                "1": this.input.convert()
            }
        };
    }
}
