// nodes
import { ADD } from "./nodes/ADD.js";
import { ConstNode } from "./nodes/ConstNode.js";
import { DFF } from "./nodes/DFF.js";
import { Input } from "./nodes/Input.js";
import { LogicNode } from "./nodes/LogicNode.js";
import { MathNode } from "./nodes/MathNode.js";
import { MergeNode, MergeEl } from "./nodes/MergeNode.js";
import { MUX } from "./nodes/MUX.js";
import { Node } from "./nodes/Node.js";
import { Output } from "./nodes/Output.js";
import { PMUX } from "./nodes/PMUX.js";
import { SDFFE } from "./nodes/SDFFE.js";
import { SDFFCE } from "./nodes/SDFFCE.js";

// entities
import { ArithmeticOperations } from "./entities/Arithmetic.js";
import { ComparatorString } from "./entities/Decider.js";

interface IDict<T> {
    [i: string]: T;
}

interface IdkItem {
    hide_name: boolean;
    type: string;
    parameters: IDict<string>;
    attributes: { src?: string, full_case?: string };
    port_directions: IDict<"input" | "output">;
    connections: IDict<(number | string)[]>;
}

function arraysEqual(a: any[], b: any[]) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true
}

function createNode(item: IdkItem): Node {
    switch (item.type) {
        case "$add": return new ADD(item);
        case "$sub": return new MathNode(item, ArithmeticOperations.Sub);
        case "$dff": return new DFF(item);
        case "$dffe": return new DFF(item);
        case "$sdffe": return new SDFFE(item);
        case "$sdffce": return new SDFFCE(item);
        case "$mux": return new MUX(item);
        case "$mul": return new MathNode(item, ArithmeticOperations.Mul);
        case "$and": return new MathNode(item, ArithmeticOperations.And);
        case "$or": return new MathNode(item, ArithmeticOperations.Or);
        case "$xor": return new MathNode(item, ArithmeticOperations.Xor);
        case "$xnor": return new MathNode(item, ArithmeticOperations.Xor, true)
        case "$eq": return new LogicNode(item, ComparatorString.EQ);
        case "$ne": return new LogicNode(item, ComparatorString.NEQ);
        case "$ge": return new LogicNode(item, ComparatorString.GE);
        case "$reduce_or": // reduce or is the same as != 0
        case "$reduce_bool":
            item.connections.B = ["0"];
            return new LogicNode(item, ComparatorString.NEQ);
        case "$reduce_and": // reduce and is the same as == (1 << n) - 1
            item.connections.B = new Array(item.connections.A.length).fill("1");
            return new LogicNode(item, ComparatorString.EQ);
        case "$logic_not": // same as == 0
            item.connections.B = ["0"];
            return new LogicNode(item, ComparatorString.EQ);
        case "$logic_or":
            console.assert(item.connections.A.length == 1);
            console.assert(item.connections.B.length == 1);
            return new MathNode(item, ArithmeticOperations.Or);
        case "$logic_and":
            console.assert(item.connections.A.length == 1);
            console.assert(item.connections.B.length == 1);
            return new MathNode(item, ArithmeticOperations.And);
        case "$not": // ~x == x^(1 << n - 1)
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

export function buildGraph(mod) {
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

    function findMergeList(bits: (number | string)[]) {
        let sub: MergeEl[] = [];

        let offset = 0;
        while (offset < bits.length) {
            let bit = bits[offset];

            if (typeof bit == "string") {
                offset++;
                let c = new ConstNode(bit === "1" ? 1 : 0, 1);
                sub.push({ start: 0, count: 1, node: c });
                continue;
            }
            if (!knownWires.has(bit)) {
                // throw new Error("Unknown wire");
                offset++;
                let c = new ConstNode(0, 1);
                sub.push({ start: 0, count: 1, node: c });
                continue;
            }

            let sect = matchSection(bits.slice(offset) as number[]);
            if (!sect) throw new Error("Unreachable"); // should be covered by knownWires

            offset += sect.count;
            sub.push(sect);
        }

        return sub;
    }

    function getInputNode(bits: (number | string)[]) {
        let allConst = true;
        let value = 0;

        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];

            if (typeof bit === "string") {
                if (bit === "1") value |= 1 << i;
            } else {
                allConst = false;
            }
        }

        if (allConst) {
            let n = new ConstNode(value, bits.length);
            nodes.push(n);
            return n;
        }

        for (const node of nodes) {
            if (arraysEqual(node.outputBits, bits)) {
                return node;
            }
        }

        let sub = findMergeList(bits);

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

    let err = false;
    for (const key in mod.cells) {
        const item = mod.cells[key];

        let node = createNode(item);
        if (!node) {
            err = true;
            continue;
        }
        nodes.push(node);
        for (const n of node.outputBits) {
            knownWires.add(n);
        }
    }
    if (err) {
        throw new Error("Unknown nodes encountered");
    }

    for (const item of nodes) {
        item.connect(getInputNode, findMergeList);
    }

    return {
        ports,
        nodes
    }
}