// nodes
import { Input } from "./nodes/Input.js";
import { Node } from "./nodes/Node.js";
import { Output } from "./nodes/Output.js";

import { optimize } from "./optimization/optimize.js";

import { logger } from "./logger.js";
import { options } from "./options.js";

import { runAnnealing } from "./layout/annealing.js";
import { createMatrixLayout } from "./layout/netMatrix.js";
import { generateCircuitGraph } from "./generateCircuitGraph.js";

import { Entity } from "./entities/Entity.js";

const generators = {
    "annealing": runAnnealing,
    "matrix": createMatrixLayout
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

function assignId(combs: Entity[]) {
    // assign entity id's
    for (let i = 0; i < combs.length; i++) {
        combs[i].id = i + 1;
    }
}

export function transform(nodes: Node[]) {
    if (options.verbose) logNodes(nodes);

    let combs = nodes.flatMap(x => x.combs());
    let ports = new Set(nodes.filter(x => x instanceof Input || x instanceof Output).flatMap(x => x.combs()));

    assignId(combs);
    optimize(combs);
    assignId(combs);

    if (options.debug) generateCircuitGraph(combs);

    generators[options.generator](combs, ports);

    assignId(combs);

    return combs.map(x => x.toObj()); // return list of entities
}
