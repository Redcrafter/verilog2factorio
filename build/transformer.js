// nodes
import { Input } from "./nodes/Input.js";
import { Output } from "./nodes/Output.js";
import { optimize } from "./optimization/optimize.js";
import { logger } from "./logger.js";
import { options } from "./options.js";
import { Simulator } from "./sim.js";
function createLayout(combs, ports) {
    logger.log(`Running layout simulation`);
    let simulator = new Simulator();
    // add combinators to simulator
    for (const n of combs) {
        let f = ports.has(n);
        simulator.addNode(f);
    }
    // add connectiosn to simulator
    for (const n of combs) {
        function add(dat) {
            for (const c of dat) {
                simulator.addEdge(n.id - 1, c.entity.id - 1);
            }
        }
        if (n.input) {
            add(n.input.red);
            add(n.input.green);
        }
        add(n.output.red);
        add(n.output.green);
    }
    let errors = 0;
    // run simulator
    simulator.sim((aId, bId) => {
        let a = combs[aId];
        let b = combs[bId];
        // TODO: identify which connection should be changed and add pole
        let cons = [];
        if (a.input.red.has(b.input))
            cons.push([1 /* Red */, a.input, b.input]);
        if (a.input.green.has(b.input))
            cons.push([2 /* Green */, a.input, b.input]);
        if (a.input.red.has(b.output))
            cons.push([1 /* Red */, a.input, b.output]);
        if (a.input.green.has(b.output))
            cons.push([2 /* Green */, a.input, b.output]);
        if (a.output.red.has(b.input))
            cons.push([1 /* Red */, a.output, b.input]);
        if (a.output.green.has(b.input))
            cons.push([2 /* Green */, a.output, b.input]);
        if (a.output.red.has(b.output))
            cons.push([1 /* Red */, a.output, b.output]);
        if (a.output.green.has(b.output))
            cons.push([2 /* Green */, a.output, b.output]);
        // problematic: need two poles in some cases
        // debugger;
        errors++;
    });
    if (errors != 0) {
        logger.error(`${errors} overlong wire(s) have been found after trying to layout the circuit`);
        // process.exit(0);
    }
    // transfer simulation to combinators
    for (let i = 0; i < combs.length; i++) {
        const n = combs[i];
        const p = simulator.nodes[i];
        n.x = Math.floor(p.x) + 0.5;
        n.y = Math.floor(p.y * 2) + n.height / 2;
    }
}
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
    createLayout(combs, ports);
    return combs.map(x => x.toObj()); // return list of entities
}
