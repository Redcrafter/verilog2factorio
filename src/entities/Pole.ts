import { ConnectionPoint, EntityBase } from "../blueprint.js";
import { logger } from "../logger.js";

import { Endpoint, Entity } from "./Entity.js";

export interface MediumElectricPole extends EntityBase {
    name: "medium-electric-pole";
    connections: {
        "1": ConnectionPoint
    };
}

export class Pole extends Entity {
    constructor() {
        super();
        this.input = this.output = new Endpoint(this, 1);
    }

    get width() { return 1; }
    get height() { return 1; }

    toObj(): MediumElectricPole {
        logger.assert(this.input.redP.size != 0 || this.input.greenP.size != 0, "Unconnected Pole")

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
