import { SignalID } from "./blueprint.js";
import { Arithmetic } from "./entities/Arithmetic.js";
import { Constant } from "./entities/Constant.js";
import { Decider } from "./entities/Decider.js";
import { Entity, Endpoint, makeConnection, Color } from "./entities/Entity.js";


function del(entity: Entity) {
    function delCon(e: Endpoint, color: "red" | "green") {
        for (const c of e[color]) {
            let n = c.entity;

            if (n.input) {
                n.input[color].delete(e);
            }
            n.output[color].delete(e);
        }
    }

    if (entity.input) {
        delCon(entity.input, "red");
        delCon(entity.input, "green");
    }
    delCon(entity.output, "red");
    delCon(entity.output, "green");
}

/** Removes entities which have no effect */
function opt_clean(entities: Entity[]) {
    let count = 0;

    console.log("Running opt_clean");

    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep) continue;

        if ((e instanceof Constant && e.params[0].count == 0) || // constant with 0 output
            (e.input.red.size + e.input.green.size == 0) || // not constant and input is not connected
            (e.output.red.size + e.output.green.size == 0)) { // output is not connected

            del(e);
            entities.splice(entities.indexOf(e), 1);
            i--;
            count++;

            continue;
        }
    }

    console.log(`Removed ${count} combinators`);
}

/** 
 * replaces all node outputs with wire chains 
*/
function opt_chain(nets: Networks) {
    console.log("Running opt_chain");

    function chain(n: Network, color: Color) {
        if (n.points.length <= 2) {
            return;
        }

        const prop: "red" | "green" = color == Color.Red ? "red" : "green";

        // delete all endpoints
        for (const p of n.points) {
            p[prop] = new Set();
        }

        makeConnection(color, ...n.points);
    }
    nets.red.nets.forEach(x => chain(x, Color.Red));
    nets.green.nets.forEach(x => chain(x, Color.Green));
}

// TODO: add functions to get neibours/signals
class Network {
    points: Endpoint[];

    constructor(points: Endpoint[]) {
        this.points = points;
    }
}

interface Networks {
    red: {
        nets: Set<Network>;
        map: Map<Endpoint, Network>
    };
    green: {
        nets: Set<Network>;
        map: Map<Endpoint, Network>
    };
}

function extractNets(entities: Entity[]): Networks {
    let networks = {
        red: {
            nets: new Set<Network>(),
            map: new Map<Endpoint, Network>()
        },
        green: {
            nets: new Set<Network>(),
            map: new Map<Endpoint, Network>()
        }
    }

    function addColor(endpoint: Endpoint, color: "red" | "green"): void {
        const other = endpoint[color];
        if (other.size == 0) return null;

        let colorNet = networks[color];
        let connected = new Set<Network>([...other].map(x => colorNet.map.get(x)));
        connected.delete(undefined);

        let net: Network;
        if (connected.size == 0) {
            // make new
            net = new Network([endpoint]);
            colorNet.map.set(endpoint, net);
            colorNet.nets.add(net);
        } else if (connected.size == 1) {
            // add
            net = connected.values().next().value;

            net.points.push(endpoint);
            colorNet.map.set(endpoint, net);
        } else {
            let points: Endpoint[] = [endpoint];

            for (const n of connected) {
                points.push(...n.points);
                // neighbors.push(...n.neighbors);
                colorNet.nets.delete(n);
            }

            net = new Network(points);
            for (const p of points) {
                colorNet.map.set(p, net);
            }
            colorNet.nets.add(net);
        }
    }

    // insert entities and assign entity id's
    for (let i = 0; i < entities.length; i++) {
        let entity = entities[i];

        addColor(entity.input, "red");
        addColor(entity.input, "green");

        if (entity.output != entity.input) {
            addColor(entity.output, "red");
            addColor(entity.output, "green");
        };

        entities[i].id = i + 1;
    }
    // sort networks points
    for (const n of [...networks.red.nets, ...networks.green.nets]) {
        n.points.sort((a, b) => a.entity.id - b.entity.id);
    }

    return networks;
}

export function optimize(entities: Entity[]) {
    opt_clean(entities);
    let nets = extractNets(entities);
    opt_chain(nets);
}
