import * as fs from "fs";

import { Arithmetic } from "./entities/Arithmetic.js";
import { Constant } from "./entities/Constant.js";
import { Decider } from "./entities/Decider.js";
import { Entity } from "./entities/Entity.js";

import { Input } from "./nodes/Input.js";
import { Output } from "./nodes/Output.js";
import { Node } from "./nodes/Node.js";

function repl(str: string) {
    return str.replace(/\>/g, "&gt;").replace(/\</g, "&lt;");
}

function genLabel(ent: Entity) {
    let str = "";

    if (ent instanceof Constant) {
        for (const asdf of ent.params) {
            str += `${asdf.count} ${asdf.signal.name}\\n`;
        }
    } else if (ent instanceof Arithmetic) {
        let params = ent.params;
        str = repl(`${params.first_signal?.name ?? params.first_constant} ${params.operation} ${params.second_signal?.name ?? params.second_constant}`) + "<br/>" +
            repl(`${params.output_signal.name}`);
    } else if (ent instanceof Decider) {
        let params = ent.params;
        str = repl(`${params.first_signal.name} ${params.comparator} ${params.second_signal?.name ?? params.constant}`) + "<br/>" +
            repl(`${params.copy_count_from_input ? "copy" : "1"} ${params.output_signal.name}`);
    } else {
        throw new Error("unreachable");
    }

    return str;
}

export function generateCircuitGraph(filename: string, combs: Entity[]) {
    let dot = `digraph G {\nrankdir="LR";\n`;

    let groups = new Map<Node, Entity[]>();

    let id = 0;
    for (const item of combs) {
        item.id = id++;
        if (!groups.has(item.source)) {
            groups.set(item.source, [item]);
        } else {
            groups.get(item.source).push(item);
        }
    }

    let i = 0;
    for (const [key, val] of groups) {
        let isIo = key instanceof Input || key instanceof Output;
        if (!isIo) dot += `subgraph cluster_${i++} { label="${key?.data?.type}"\n`;

        for (const item of val) {
            if (item.source instanceof Input) {
                let c = item as Constant;
                dot += `n${item.id} [ shape=diamond, label="${item.source.name}\\n${c.params[0].signal.name}", color="black", fontcolor="black" ];\n`;
            } else if (item.source instanceof Output) {
                dot += `n${item.id} [ shape=diamond, label="${item.source.name}", color="black", fontcolor="black" ];\n`;
            } else if (item instanceof Constant) {
                dot += `n${item.id} [ shape=record, label="{$${item.id}\\n${genLabel(item)}|{<ro>r|<go>g}}" ];\n`;
            } else {
                dot += `n${item.id} [ shape=plaintext label=< <table BORDER="0" CELLBORDER="1" CELLSPACING="0"><tr><td PORT="ri">r</td> <td ROWSPAN="2">$${item.id}<br/>${genLabel(item)}</td> <td port="ro">r</td></tr> <tr><td port="gi">g</td><td port="go">g</td></tr></table> > ];\n`;
            }
        }

        if (!isIo) dot += "}\n";
    }

    function getEnd(ent: Entity, color: string) {
        if (ent.source instanceof Input || ent.source instanceof Output)
            return `n${ent.id}`
        else
            return `n${ent.id}:${color}`
    }
    function makeEdge(from: Entity, to: Entity, color: "r" | "g") {
        dot += `${getEnd(from, color + "o")}:e -> ${getEnd(to, color + "i")}:w [color="${color == "r" ? "red" : "green"}", style="setlinewidth(3)"];\n`;
    }

    for (const comb of combs) {
        if (comb instanceof Constant) continue;

        if (comb.input.red) {
            for (const other of comb.input.red.points) {
                if (other.entity.source instanceof Output) continue;

                if (other == other.entity.output)
                    makeEdge(other.entity, comb, "r");
            }
        }
        if (comb.input.green) {
            for (const other of comb.input.green.points) {
                if (other.entity.source instanceof Output) continue;

                if (other == other.entity.output)
                    makeEdge(other.entity, comb, "g");
            }
        }
    }
    dot += "}";

    fs.writeFileSync(filename, dot);
}
