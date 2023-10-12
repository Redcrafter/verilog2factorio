import { ConnectionPoint, EntityBase } from "../blueprint.js";

import { Endpoint, Entity } from "./Entity.js";

export interface SteelChest_ extends EntityBase {
    name: "steel-chest";
    connections: {
        "1": ConnectionPoint
    };
}

export class SteelChest extends Entity {
    constructor() {
        super();
        this.input = this.output = new Endpoint(this, 1);
    }

    get width() { return 1; }
    get height() { return 1; }

    toObj(): SteelChest_ {
        return {
            entity_number: this.id,
            name: "steel-chest",
            position: { x: this.x, y: this.y },
            connections: {
                "1": this.input.convert()
            }
        };
    }
}
