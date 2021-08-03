import { Color, Entity, makeConnection } from "../entities/Entity.js";
import { extractNets, Network } from "./nets.js";

/** 
 * replaces all wires with wire chains 
*/
export function opt_chain(entities: Entity[]) {
    console.log("Running opt_chain");

    let nets = extractNets(entities);

    function chain(n: Network, color: Color) {
        if (n.points.size <= 2) {
            return;
        }

        const prop: "red" | "green" = color == Color.Red ? "red" : "green";

        // sort((a, b) => a.entity.id - b.entity.id);
        // delete all endpoints
        for (const p of n.points) {
            p[prop] = new Set();
        }

        makeConnection(color, ...n.points);
    }
    nets.red.nets.forEach(x => chain(x, Color.Red));
    nets.green.nets.forEach(x => chain(x, Color.Green));
}
