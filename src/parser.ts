import { logger } from "./logger.js";
import * as yosys from "./yosys.js";

// entities
import { ArithmeticOperations } from "./entities/Arithmetic.js";
import { ComparatorString } from "./entities/Decider.js";

// nodes
import { Node } from "./nodes/Node.js";

import { Input } from "./nodes/Input.js";
import { Output } from "./nodes/Output.js";

import { ConstNode } from "./nodes/ConstNode.js";

import { MathNode } from "./nodes/MathNode.js";
import { LogicNode } from "./nodes/LogicNode.js";
import { ADD } from "./nodes/ADD.js";
import { NOT } from "./nodes/NOT.js";
import { XNOR } from "./nodes/XNOR.js";
import { ReduceOr } from "./nodes/ReduceOr.js";
import { SHR } from "./nodes/SHR.js";
import { SSHR } from "./nodes/SSHR.js";

import { MergeNode, MergeEl } from "./nodes/MergeNode.js";

import { MUX } from "./nodes/MUX.js";
import { PMUX } from "./nodes/PMUX.js";

import { MemNode } from "./nodes/Mem.js";
import { DFF } from "./nodes/DFF.js";
import { SDFF } from "./nodes/SDFF.js";
import { SDFFE } from "./nodes/SDFFE.js";
import { SDFFCE } from "./nodes/SDFFCE.js";

import { resetNets } from "./optimization/nets.js";

function arraysEqual<T>(a: T[], b: T[]) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true
}

function createNode(item: yosys.Cell): Node {
    switch (item.type) {
        case "$not": return new NOT(item);
        // TODO: case "$pos":
        // TODO: case "$neg":

        case "$reduce_and": // reduce and is the same as == (1 << n) - 1
            // @ts-ignore
            item.connections.B = new Array(item.connections.A.length).fill("1");
            // @ts-ignore
            item.parameters.B_SIGNED = 0;
            // @ts-ignore
            return new LogicNode(item, ComparatorString.EQ);
        case "$reduce_or": return new ReduceOr(item);
        // TODO: case "$reduce_xor":
        // TODO: case "$reduce_xnor":

        case "$reduce_bool": return new ReduceOr(item);

        case "$and": return new MathNode(item, ArithmeticOperations.And);
        case "$or": return new MathNode(item, ArithmeticOperations.Or);
        case "$xor": return new MathNode(item, ArithmeticOperations.Xor);
        case "$xnor": return new XNOR(item);
        case "$shl":
        case "$sshl": return new MathNode(item, ArithmeticOperations.LShift);
        case "$shr": return new SHR(item);
        case "$sshr": return new SSHR(item);

        case "$logic_not": // same as == 0
            // @ts-ignore
            item.connections.B = ["0"];
            // @ts-ignore
            item.parameters.B_SIGNED = 0;
            // @ts-ignore
            return new LogicNode(item, ComparatorString.EQ);
        case "$logic_and":
            logger.assert(item.connections.A.length == 1, "logic_and a width");
            logger.assert(item.connections.B.length == 1, "logic_and b width");
            return new MathNode(item, ArithmeticOperations.And);
        case "$logic_or":
            logger.assert(item.connections.A.length == 1);
            logger.assert(item.connections.B.length == 1);
            return new MathNode(item, ArithmeticOperations.Or);

        case "$lt": return new LogicNode(item, ComparatorString.LT);
        case "$le": return new LogicNode(item, ComparatorString.LE);
        case "$eqx":
        case "$eq": return new LogicNode(item, ComparatorString.EQ);
        case "$nex":
        case "$ne": return new LogicNode(item, ComparatorString.NE);
        case "$ge": return new LogicNode(item, ComparatorString.GE);
        case "$gt": return new LogicNode(item, ComparatorString.GT);

        case "$add": return new ADD(item);
        case "$sub": return new MathNode(item, ArithmeticOperations.Sub);
        case "$mul": return new MathNode(item, ArithmeticOperations.Mul);
        case "$div": return new MathNode(item, ArithmeticOperations.Div);
        case "$mod": return new MathNode(item, ArithmeticOperations.Mod);
        // TODO: case "$divfloor":
        // TODO: case "$modfloor":
        case "$pow": return new MathNode(item, ArithmeticOperations.Pow);

        case "$mux": return new MUX(item);
        case "$pmux": return new PMUX(item);

        // TODO: case "$sr"
        case "$dff": return new DFF(item);
        // TODO: case "$adff"
        case "$sdff": return new SDFF(item);
        // TODO: case "$dffsr":

        case "$dffe": return new DFF(item);
        // TODO: case "$adffe":
        case "$sdffe": return new SDFFE(item);
        case "$sdffce": return new SDFFCE(item);
        // TODO: case "$dffsre":

        case "$mem_v2": return new MemNode(item);

        default:
            logger.error(`Unknown node type ${item.type}`);
            break;
    }

    return null;
}

function arrMatch<T>(a: T[], b: T[]): [number, number] {
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

export function buildGraph(mod: yosys.Module) {
    resetNets();

    let ports = new Map();

    let nodes: Node[] = [];
    let knownWires = new Set<number>();

    function matchSection(arr: number[]): MergeEl {
        let current = [0, 0];
        let best: Node = null;

        for (const n of nodes) {
            if (n instanceof MergeNode)
                continue;

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
                let c = new ConstNode(bit === "1" ? 1 : 0);
                sub.push({ start: 0, count: 1, node: c });
                continue;
            }
            if (!knownWires.has(bit)) {
                throw new Error("Unknown wire");
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
            let n = new ConstNode(value);
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

    function addNode(node: Node) {
        nodes.push(node);
        for (const n of node.outputBits) {
            knownWires.add(n);
        }
    }

    for (const name in mod.ports) {
        const item = mod.ports[name];

        let node: Node;
        if (item.direction === "input") {
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

        for (const key in item.parameters) {
            //@ts-ignore
            let val = item.parameters[key];

            if (typeof val === "string" && val.match(/^[01]+$/)) {
                let num =  parseInt(val, 2);
                logger.assert(Number.isSafeInteger(num), "exceeded safe integer range");

                //@ts-ignore
                item.parameters[key] = val;
            }
        }

        let node = createNode(item);
        if (!node) {
            err = true;
            continue;
        }
        addNode(node);
        if (node instanceof MemNode) {
            for (const rdPort of node.outputSegments) {
                addNode(rdPort);
            }
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