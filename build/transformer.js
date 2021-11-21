// nodes
import { Input } from "./nodes/Input.js";
import { Output } from "./nodes/Output.js";
import { optimize } from "./optimization/optimize.js";
import { logger } from "./logger.js";
import { options } from "./options.js";
import { runAnnealing } from "./layout/annealing.js";
import { createMatrixLayout } from "./layout/netMatrix.js";
const generators = {
    "annealing": runAnnealing,
    "matrix": createMatrixLayout
};
function logNodes(nodes) {
    let map = new Map();
    for (const c of nodes) {
        let name = c.constructor.name;
        let val = map.get(name);
        if (!val) {
            val = {
                count: 0,
                comb: 0
            };
            map.set(name, val);
        }
        val.count++;
        let combs = c.combs();
        if (combs == undefined)
            debugger;
        val.comb += combs.length;
    }
    logger.table([...map].map(x => ({
        name: x[0],
        count: x[1].count,
        comb: x[1].comb,
        ratio: Math.round((x[1].comb / x[1].count) * 100) / 100,
    })));
}
export function transform(nodes) {
    if (options.verbose)
        logNodes(nodes);
    let combs = nodes.flatMap(x => x.combs());
    let ports = new Set(nodes.filter(x => x instanceof Input || x instanceof Output).flatMap(x => x.combs()));
    optimize(combs);
    // assign entity id's
    for (let i = 0; i < combs.length; i++) {
        combs[i].id = i + 1;
    }
    generators[options.generator](combs, ports);
    // assign entity id's
    for (let i = 0; i < combs.length; i++) {
        combs[i].id = i + 1;
    }
    return combs.map(x => x.toObj()); // return list of entities
}
