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
import { SplitNode } from "./nodes/SplitNode.js";
// entities
import { Endpoint, Connection, Entity, RawEntity, SignalID } from "./entities/Entity.js";
import { ArithmeticOperations } from "./entities/Arithmetic.js";
import { ComparatorString } from "./entities/Decider";

import { Simulator } from "./sim.js";
import { LogicNode } from "./nodes/LogicNode.js";

export const enum Color {
    Red,
    Green
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

function buildGraph(mod) {
    let ports = new Map();

    let nodes: Node[] = [];
    let knownWires = new Set<number>();

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
                    if(typeof bits[i] === "string") {
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

        // TODO: make this better
        if (bits.length == 1) {
            let bit = bits[0] as number;
            let n: Node;

            for (const node of nodes) {
                if (node.outputBits.includes(bit)) {
                    n = node;
                    break;
                }
            }

            let split = new SplitNode(n, bits as number[]);
            nodes.push(split);
            return split;
        }

        // search for every possible subset
        // too lazy just search for single signals could cause unnecessary split nodes to appear
        let sub: MergeEl[] = [];
        for (let i = 0; i < bits.length; i++) {
            let bit = bits[i] as number;
            if (!knownWires.has(bit)) {
                continue;
            }

            let n = getInputNode([bits[i]]);

            sub.push({
                n,
                shift: i
            });
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
    let col = c == Color.Red ? "red" : "green";

    a[col].push({
        entity_id: b.id,
        circuit_id: b.type
    });
    b[col].push({
        entity_id: a.id,
        circuit_id: a.type
    });
}

export const dir = 4;

function transform(nodes: Node[]): Blueprint {
    // create all combinators (could do this in constructor?)
    for (const node of nodes) {
        node.createComb();
    }

    // assign entity id's
    let combs: Entity[] = [];
    let ports: Entity[] = [];

    for (const node of nodes) {
        if (node instanceof Input) {
            ports.push(node.constant);
        } if (node instanceof Output) {
            ports.push(node.pole);
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
    /*for (const n1 of nodes) {
        for (const n2 of nodes) {
            if (n1 == n2) continue;

            if (n1.eq(n2)) { }
        }
    }*/

    // position entities
    {
        // position based on dependency
        let next = [];
        for (let i = 0; i < ports.length; i++) {
            let el = ports[i];
            el.x = i;
            el.y = 0;

            next.push(...el.output.red.map(x => x.entity_id));
            next.push(...el.output.green.map(x => x.entity_id));
        }

        let y = 1;
        while (next.length != 0) {
            let temp = [];
            let x = 0;
            for (let i = 0; i < next.length; i++) {
                let el = combs[next[i] - 1];

                if (el.x != -1) {
                    // already set position
                    continue;
                }

                el.x = x++;
                el.y = y + 0.5;

                temp.push(...el.output.red.map(x => x.entity_id));
                temp.push(...el.output.green.map(x => x.entity_id));
            }
            next = temp;
            y += 2;
        }

        // position using graphing algorithm
        console.log(`Running layout simulation`);
        let simulator = new Simulator();
        for (const n of combs) {
            let f = ports.includes(n);

            simulator.addNode(n.x, n.y, n.width, n.height, f);
        }
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

        simulator.sim();

        for (let i = 0; i < combs.length; i++) {
            const n = combs[i];
            const p = simulator.nodes[i];

            n.x = Math.floor(p.x);
            n.y = Math.floor(p.y) + n.height / 2;
        }

        let errors = 0;
        // check if all connections lengths are < 9
        for (const n of combs) {
            function checkCon(dat: Connection[]) {
                for (const c of dat) {
                    let ent = combs[c.entity_id - 1];
                    let dist = Math.sqrt((n.x - ent.x) ** 2 + (n.y - ent.y) ** 2);

                    if (dist > 9) {
                        errors++;
                    }
                }
            }
            if (n.input) {
                checkCon(n.input.red);
                checkCon(n.input.green);
            }
            checkCon(n.output.red);
            checkCon(n.output.green);
        }
        if (errors != 0) {
            console.error(`${errors} error(s) occurred while trying to layout the circuit`);
            process.exit(0);
        }
    }

    // create entities
    let dat = combs.map(x => x.toObj());

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
        entities: dat,
        item: "blueprint",
        version: 281479273447424
    }
}

export {
    buildGraph,
    transform,
    Node
}
