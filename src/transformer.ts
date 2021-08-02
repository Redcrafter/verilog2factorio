// nodes
import { Input } from "./nodes/Input.js";
import { Node } from "./nodes/Node.js";
import { Output } from "./nodes/Output.js";

// entities
import { Endpoint, Entity } from "./entities/Entity.js";

import { Simulator } from "./sim.js";
import { optimize } from "./optimization/optimize.js";

function createLayout(combs: Entity[], ports: Set<Entity>) {
    console.log(`Running layout simulation`);
    let simulator = new Simulator();

    // add combinators to simulator
    for (const n of combs) {
        let f = ports.has(n);
        simulator.addNode(f);
    }

    // add connectiosn to simulator
    for (const n of combs) {
        function add(dat: Set<Endpoint>) {
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
        // debugger;
        errors++;
    });
    if (errors != 0) {
        console.error(`${errors} overlong wire(s) have been found after trying to layout the circuit`);
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

export function transform(nodes: Node[]) {
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
