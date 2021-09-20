import { ConnectionPoint, EntityBase } from "../blueprint.js";

import { Endpoint, Entity } from "./Entity.js";

export interface MediumElectricPole extends EntityBase {
    name: "medium-electric-pole";
    connections: {
        "1": ConnectionPoint
    };
}

export class Pole extends Entity {
    constructor() {
        super(1, 1);
        this.input = this.output = new Endpoint(this, 1);
    }

    toObj(): MediumElectricPole {
        if (!this.input.red && !this.input.green && !this.output.red && !this.output.green) {
            throw new Error("Unconnected Pole");
        }

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
