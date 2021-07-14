import { SignalID } from "./blueprint.js";
import { Arithmetic } from "./entities/Arithmetic.js";
import { Constant } from "./entities/Constant.js";
import { Decider } from "./entities/Decider.js";
import { Entity, Endpoint, makeConnection, Color } from "./entities/Entity.js";

function delCon(e: Entity, cons: Endpoint[]) {
    function filter(cons: Endpoint[]) {
        return cons.filter(x => x.entity !== e);
    }

    for (const c of cons) {
        let n = c.entity;

        // TODO: could use n.type?
        if (n.input) {
            n.input.red.filter(x => x.entity != e);
            n.input.red = filter(n.input.red);
            n.input.green = filter(n.input.green);
        }
        n.output.red = filter(n.output.red);
        n.output.green = filter(n.output.green);
    }
}
function del(entity: Entity) {
    if (entity.input) {
        delCon(entity, entity.input.red);
        delCon(entity, entity.input.green);
    }
    delCon(entity, entity.output.red);
    delCon(entity, entity.output.green);
}

/** Removes entities which have no effect */
function opt_clean(entities: Entity[]) {
    let count = 0;

    console.log("Running opt_clean");

    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep) continue;

        if (e instanceof Constant) {
            if (e.params[0].count == 0) {
                // constant with 0 output
                del(e);
                entities.splice(entities.indexOf(e), 1);
                i--;
                count++;
            }

            continue;
        }

        if (e.input.red.length + e.input.green.length == 0) {
            // not constant and input is not connected
            del(e);
            entities.splice(entities.indexOf(e), 1);
            i--;
            count++;

            continue;
        }

        if (e.output.red.length + e.output.green.length == 0) {
            // output is not connected
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
            p[prop] = [];
        }

        makeConnection(color, ...n.points);
    }
    nets.red.nets.forEach(x => chain(x, Color.Red));
    nets.green.nets.forEach(x => chain(x, Color.Green));
}

interface Network {
    points: Endpoint[];
    signal: SignalID;
    neighbors: Network[];
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

function getOutputSignal(p: Endpoint) {
    let ent = p.entity;

    if (ent instanceof Arithmetic || ent instanceof Decider) {
        if (ent.output == p)
            return ent.params.output_signal;
    } else if(ent instanceof Constant) {
        return ent.params[0].signal;
    }

    return null;
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

    function addEntity(entity: Entity) {
        function addEndpoint(endpoint: Endpoint) {
            let signal = getOutputSignal(endpoint);

            function addColor(color: "red" | "green") {
                let other = endpoint[color];
                if (other.length == 0) return null;

                let fuck = networks[color];
                let nets = new Set<Network>(other.map(x => fuck.map.get(x)));
                nets.delete(undefined);

                let net: Network;
                if (nets.size == 0) {
                    // make new
                    net = { points: [endpoint], signal, neighbors: [] };
                    fuck.map.set(endpoint, net);
                    fuck.nets.add(net);
                } else if (nets.size == 1) {
                    // add
                    net = nets.values().next().value;
                    if (!net.signal) net.signal = signal;

                    console.assert(net.signal == signal)

                    net.points.push(endpoint);
                    fuck.map.set(endpoint, net);
                } else {
                    let points: Endpoint[] = [endpoint];
                    let neighbors: Network[] = [];
                    // merge

                    for (const n of nets) {
                        if (!signal) {
                            signal = n.signal;
                        } else if (n.signal && n.signal !== signal) {
                            // Should not be reachable
                            throw new Error("Nerwork signal mismatch");
                        }

                        points.push(...n.points);
                        neighbors.push(...n.neighbors);
                        fuck.nets.delete(n);
                    }

                    net = { points, signal, neighbors };
                    for (const p of points) {
                        fuck.map.set(p, net);
                    }
                    fuck.nets.add(net);
                }

                return net;
            }

            let a = addColor("red");
            let b = addColor("green");

            if (a && b) {
                a.neighbors.push(b);
                b.neighbors.push(a);
            }
        }

        addEndpoint(entity.input);
        if (entity.output != entity.input) addEndpoint(entity.output);
    }

    // insert entities and assign entity id's
    for (let i = 0; i < entities.length; i++) {
        addEntity(entities[i]);
        entities[i].id = i + 1;
    }
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
