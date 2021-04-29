import { RawEntity } from "./entities/Entity.js";
interface Blueprint {
    index?: number;
    blueprint: {
        /** String, the name of the item that was saved ("blueprint" in vanilla). */
        item: string;
        /** String, the name of the blueprint set by the user. */
        label?: string;
        /** The color of the label of this blueprint. */
        label_color?: any;
        /** The actual content of the blueprint. */
        entities: RawEntity[];
        /** The tiles included in the blueprint. */
        tiles?: any[];
        /** The icons of the blueprint set by the user. */
        icons: any[];
        /** The schedules for trains in this blueprint. */
        schedules?: any[];
        /** The map version of the map the blueprint was created in. */
        version: number;
    }
}

export function createBlueprintBook(blueprints: Blueprint[]) {

    for (let i = 0; i < blueprints.length; i++) {
        blueprints[i].index = i
    }
    
    return {
        blueprint_book: {
            item: "blueprint-book",
            blueprints: blueprints,
            active_index: 0,
            version: 281479273447424
        }
    }
}

export function createBlueprint(entityList): Blueprint {
    return {
    blueprint: {
            icons: [
                {
                    signal: {
                        type: "item",
                        name: "decider-combinator"
                    },
                    index: 1
                },
                {
                    signal: {
                        type: "item",
                        name: "constant-combinator"
                    },
                    index: 2
                }
            ],
            entities: entityList,
            item: "blueprint",
            version: 281479273447424
        }
    }
}
