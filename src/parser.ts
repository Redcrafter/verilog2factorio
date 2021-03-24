// nodes
import { ADD } from "./nodes/ADD.js";
import { ConstNode } from "./nodes/ConstNode.js";
import { DFF } from "./nodes/DFF.js";
import { Input } from "./nodes/Input.js";
import { MathNode } from "./nodes/MathNode.js";
import { MergeNode, MergeEl } from "./nodes/MergeNode.js";
import { MUX } from "./nodes/MUX.js";
import { Node } from "./nodes/Node.js";
import { Output } from "./nodes/Output.js";
import { PMUX } from "./nodes/PMUX.js";
// entities
import { Endpoint, Connection, Entity, RawEntity, SignalID } from "./entities/Entity.js";
import { ArithmeticOperations } from "./entities/Arithmetic.js";
import { ComparatorString } from "./entities/Decider";

import { Simulator } from "./sim.js";
import { LogicNode } from "./nodes/LogicNode.js";

export const enum Color {
    Red = 1,
    Green = 2,
    Both = Red | Green
}

export const signalV: SignalID = {
    type: "virtual",
    name: "signal-V"
};
export const signalC: SignalID = {
    type: "virtual",
    name: "signal-C"
};

interface Blueprint {
    /** String, the name of the item that was saved ("blueprint" in vanilla). */
    item: string;
    /** String, the name of the blueprint set by the user. */
    label?: string;
    /** The color of the label of this blueprint. */
    label_color?: any;
    /** The actual content of the blueprint. */
    entities: RawEntity[];
    /** The tiles included in the blueprint. */
    tiles?: any[];
    /** The icons of the blueprint set by the user. */
    icons: any[];
    /** The schedules for trains in this blueprint. */
    schedules?: any[];
    /** The map version of the map the blueprint was created in. */
    version: number;
}

function arraysEqual(a: any[], b: any[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true
}

export function objEqual(a: any, b: any) {
    for (const key in a) {
        let ae = a[key];
        let be = b[key];

        if (!be) {
            return false;
        }
        if (typeof ae === "object") {
            if (typeof be !== "object") {
                return false;
            }
            return objEqual(ae, be);
        }
        if (typeof be === "object") {
            return false;
        }

        if (ae !== be) return false;
    }

    return true;
}

function createNode(item: any) {
    switch (item.type) {
        case "$add": return new ADD(item);
        case "$dff": return new DFF(item);
        case "$mux": return new MUX(item);
        case "$and": return new MathNode(item, ArithmeticOperations.And);
        case "$or": return new MathNode(item, ArithmeticOperations.Or);
        case "$xor": return new MathNode(item, ArithmeticOperations.Xor);
        case "$eq": return new LogicNode(item, ComparatorString.EQ);
        case "$ge": return new LogicNode(item, ComparatorString.GE);
        case "$reduce_or": // reduce or is the same as != 0
            item.connections.B = ["0"];
            return new LogicNode(item, ComparatorString.NEQ);
        case "$logic_not": // same as == 0
            item.connections.B = ["0"];
            return new LogicNode(item, ComparatorString.EQ);
        case "$not": // ~x == x^(2**n - 1)
            item.connections.B = new Array(item.connections.Y.length).fill("1");
            return new MathNode(item, ArithmeticOperations.Xor);
        case "$pmux": return new PMUX(item);
        default:
            console.error(`Unknown node type ${item.type}`);
            break;
    }

    return null;
}

function arrMatch<T>(a: T[], b: T[]) {
    let start = -1;
    for (let i = 0; i < a.length; i++) {
        if (a[i] === b[0]) {
            start = i;
            break;
        }
    }

    if (start == -1) {
        return null;
    }

    let i = 1;
    while (i < a.length && i < b.length) {
        if (a[start + i] !== b[i]) {
            break;
        }
        i++;
    }

    return [start, i];
}

function buildGraph(mod) {
    let ports = new Map();

    let nodes: Node[] = [];
    let knownWires = new Set<number>();

    function matchSection(arr: number[]): MergeEl {
        let current = [0, 0];
        let best: Node = null;

        for (const n of nodes) {
            let match = arrMatch(n.outputBits, arr);
            if (!match) continue;
            if (match[1] > current[1]) {
                current = match;
                best = n;
            }
        }

        if (!best) return null;
        return {
            start: current[0],
            count: current[1],
            node: best
        };
    }

    function getInputNode(bits: (number | string)[]) {
        let isConst = true;
        let hasConst = false;

        for (const bit of bits) {
            if (typeof bit === "string") {
                hasConst = true;
            } else {
                isConst = false;
            }
        }

        if (isConst) {
            let value = 0;
            for (let i = 0; i < bits.length; i++) {
                if (bits[i] === "1") {
                    value |= 1 << i;
                }
            }

            // TODO: if value == 0 can be optimized away since 0 is default
            let n = new ConstNode(value, bits.length);
            nodes.push(n);
            return n;
        } else if (hasConst) {
            // if the extra bits are at the end and all 0 they can be ignored
            let valid = true;
            for (let i = bits.length - 1; i >= 0; i--) {
                const bit = bits[i];

                if (typeof bit === "string") {
                    if (bit === "1") {
                        valid = false;
                        break;
                    }
                } else {
                    break;
                }
            }

            if (!valid) {
                throw "Not implemented";
            } else {
                let copy = bits.slice();
                for (let i = bits.length - 1; i >= 0; i--) {
                    if (typeof bits[i] === "string") {
                        copy.splice(i, 1);
                    }
                }
                bits = copy;
            }
        }

        for (const node of nodes) {
            if (arraysEqual(node.outputBits, bits)) {
                return node;
            }
        }

        // search for every possible subset
        let sub: MergeEl[] = [];

        let rest = bits.slice() as number[];
        while (rest.length != 0) {
            // all wires are non existent/can be ignored
            if (rest.every(x => !knownWires.has(x))) break;

            for (let i = rest.length; i > 0; i--) {
                let sect = matchSection(rest);
                if (sect) {
                    rest.splice(0, sect.count);
                    sub.push(sect);
                    break;
                }
            }
        }

        let node = new MergeNode(sub, bits as number[]);
        nodes.push(node);
        return node;
    }

    for (const name in mod.ports) {
        const item = mod.ports[name];

        let node: Node;
        if (item.direction == "input") {
            node = new Input(item.bits);

            for (const b of item.bits) {
                knownWires.add(b);
            }
        } else {
            node = new Output(item.bits);
        }
        nodes.push(node);
        ports.set(name, node);
    }

    for (const key in mod.cells) {
        const item = mod.cells[key];

        let node = createNode(item);
        nodes.push(node);
        for (const n of node.outputBits) {
            knownWires.add(n);
        }
    }

    for (const item of nodes) {
        item.connect(getInputNode);
    }

    return {
        ports,
        nodes
    }
}

export function makeConnection(c: Color, a: Endpoint, b: Endpoint) {
    if (c & Color.Red) {
        a.red.push({
            entity_id: b.id,
            circuit_id: b.type
        });
        b.red.push({
            entity_id: a.id,
            circuit_id: a.type
        });
    }

    if (c & Color.Green) {
        a.green.push({
            entity_id: b.id,
            circuit_id: b.type
        });
        b.green.push({
            entity_id: a.id,
            circuit_id: a.type
        });
    }
}

export const dir = 4;

function transform(nodes: Node[]): Blueprint {
    // create all combinators (could do this in constructor?)
    for (const node of nodes) {
        node.createComb();
    }

    // assign entity id's
    let combs: Entity[] = [];
    let ports = new Set<Entity>();

    for (const node of nodes) {
        if (node instanceof Input) {
            ports.add(node.constant);
        } if (node instanceof Output) {
            ports.add(node.pole);
        }

        let sub = node.combs();
        for (const item of sub) {
            item.id = combs.length + 1;
            combs.push(item);
        }
    }

    // connect nodes
    for (const node of nodes) {
        node.connectComb();
    }

    // TODO: remove duplicate
    // optimize(combs);

    createLayout(combs, ports);

    // create entities
    let entities = combs.map(x => x.toObj());

    return {
        icons: [
            {
                signal: {
                    type: "item",
                    name: "decider-combinator"
                },
                index: 1
            },
            {
                signal: {
                    type: "item",
                    name: "constant-combinator"
                },
                index: 2
            }
        ],
        entities,
        item: "blueprint",
        version: 281479273447424
    }
}

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
        function add(dat: Connection[]) {
            for (const c of dat) {
                simulator.addEdge(n.id - 1, c.entity_id - 1);
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
    simulator.sim((a, b) => {
        let an = combs[a];
        let bn = combs[b];

        // TODO: identify which connection should be changed and add pole
        // debugger;
        errors++;
    });
    if (errors != 0) {
        console.error(`${errors} error(s) occurred while trying to layout the circuit`);
        // process.exit(0);
    }

    // transfer simulation to combinators
    for (let i = 0; i < combs.length; i++) {
        const n = combs[i];
        const p = simulator.nodes[i];

        n.x = Math.floor(p.x);
        n.y = Math.floor(p.y * 2) + n.height / 2;
    }
}

export {
    buildGraph,
    transform,
    Node
}
