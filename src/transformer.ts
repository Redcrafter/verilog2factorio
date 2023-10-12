// nodes
import { Input } from "./nodes/Input.js";
import { Node } from "./nodes/Node.js";
import { Output } from "./nodes/Output.js";

import { optimize } from "./optimization/optimize.js";

import { logger } from "./logger.js";
import { options } from "./options.js";

import { runAnnealing } from "./layout/annealing.js";
import * as chunkAnnealing from "./layout/chunkAnnealing.js";

import { createMatrixLayout } from "./layout/netMatrix.js";
import { generateCircuitGraph } from "./generateCircuitGraph.js";

import { nets } from "./nets.js";

const generators = {
    "annealing": runAnnealing,
    "matrix": createMatrixLayout,
    "chunkAnnealing": chunkAnnealing.runAnnealing
};

function logNodes(nodes: Node[]) {
    let map = new Map<string, any>();
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
        if (combs == undefined) debugger;
        val.comb += combs.length;
    }
    logger.table([...map].map(x => ({
        name: x[0],
        count: x[1].count,
        comb: x[1].comb,
        ratio: Math.round((x[1].comb / x[1].count) * 100) / 100,
    })));
}

export function transform(name: string, nodes: Node[]) {
    if (options.verbose) logNodes(nodes);

    let combs = nodes.flatMap(x => x.combs());
    let ports = new Set(nodes.filter(x => x instanceof Input || x instanceof Output).flatMap(x => x.combs()));

    if (options.debug) generateCircuitGraph(`${name}_pre_opt.dot`, combs);

    logger.log(`Optimizing combinator graph`);
    optimize(combs);

    if (options.debug) generateCircuitGraph(`${name}_post_opt.dot`, combs);

    logger.log(`Placing combinators`);

    let result = generators[options.generator](combs, ports);
    if(options.generator == "annealing" && !result) {
        console.warn("Failde to properly place combinators. try using \"-g chunkAnnealing\"");
        return null;
    }

    // assign entity id's
    for (let i = 0; i < combs.length; i++) {
        combs[i].id = i + 1;
    }

    let i = 1;
    // assign network ids
    for (const n of nets.red)
        n.id = i++;
    for (const n of nets.green)
        n.id = i++;

    return combs.map(x => x.toObj()); // return list of entities
}
