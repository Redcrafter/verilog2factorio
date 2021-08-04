import { logger } from "../logger.js";
import { makeConnection } from "../entities/Entity.js";
import { extractNets } from "./nets.js";
/**
 * replaces all wires with wire chains
*/
export function opt_chain(entities) {
    logger.log("Running opt_chain");
    let nets = extractNets(entities);
    function chain(n, color) {
        if (n.points.size <= 2) {
            return;
        }
        const prop = color == 1 /* Red */ ? "red" : "green";
        // sort((a, b) => a.entity.id - b.entity.id);
        // delete all endpoints
        for (const p of n.points) {
            p[prop] = new Set();
        }
        makeConnection(color, ...n.points);
    }
    nets.red.nets.forEach(x => chain(x, 1 /* Red */));
    nets.green.nets.forEach(x => chain(x, 2 /* Green */));
}
