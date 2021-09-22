import { logger } from "../logger.js";
import { options } from "../options.js";
import { nets, Network } from "./nets.js";

import { Color, Entity } from "../entities/Entity.js";

/** 
 * replaces all wires with wire chains 
*/
export function opt_chain(entities: Entity[]) {
    if (options.verbose) logger.log("Running opt_chain");

    // assign entity id's
    for (let i = 0; i < entities.length; i++) {
        entities[i].id = i + 1;
    }

    function chain(n: Network, color: Color) {
        const prop: "redP" | "greenP" = color == Color.Red ? "redP" : "greenP";

        let arr = [...n.points];
        arr.sort((a, b) => a.entity.id - b.entity.id);

        for (let i = 0; i < arr.length; i++) {
            let s = arr[i][prop];
            if (i > 0) s.add(arr[i - 1]);
            if (i + 1 < arr.length) s.add(arr[i + 1]);
        }
    }
    nets.red.forEach(x => chain(x, Color.Red));
    nets.green.forEach(x => chain(x, Color.Green));
}
