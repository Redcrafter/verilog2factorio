import { ConnectionPoint, EntityBase } from "../blueprint.js";
import { Endpoint, Entity } from "./Entity.js";

export interface Substation_ extends EntityBase {
    name: "substation";
    connections: {
        "1": ConnectionPoint
    };
    neighbours: number[];
}

export class Substation extends Entity {
    neighbours: Set<Entity> = new Set();

    constructor() {
        super();
        this.input = this.output = new Endpoint(this, 1);
    }

    get width(): number { return 2; }
    get height(): number { return 2; }

    toObj(): Substation_ {
        return {
            entity_number: this.id,
            name: "substation",
            position: { x: this.x, y: this.y },
            connections: {
                "1": this.input.convert()
            },
            neighbours: [...this.neighbours].map(x => x.id)
        };
    }
}
