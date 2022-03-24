import * as fs from "fs";
import { exec, execSync } from "child_process";

import { Arithmetic } from "./entities/Arithmetic.js";
import { Constant } from "./entities/Constant.js";
import { Decider } from "./entities/Decider.js";
import { Entity } from "./entities/Entity.js";
import { Pole } from "./entities/Pole.js";

import { Input } from "./nodes/Input.js";
import { Output } from "./nodes/Output.js";

function genLabel(ent: Entity) {
    let str = "";

    if (ent instanceof Constant) {
        for (const asdf of ent.params) {
            str += `${asdf.count} ${asdf.signal.name}`;
        }
    } else if (ent instanceof Arithmetic) {
        let params = ent.params;
        str = `${params.first_signal?.name ?? params.first_constant} ${params.operation} ${params.second_signal?.name ?? params.second_constant}\\n${params.output_signal.name}`;
    } else if (ent instanceof Decider) {
        let params = ent.params;
        str = `${params.first_signal.name} ${params.comparator} ${params.second_signal?.name ?? params.constant} \\n ${params.copy_count_from_input ? "copy" : "1"} ${params.output_signal.name}`;
    } else {
        throw new Error("unreachable");
    }

    return str.replace(/\>/g, "\\>").replace(/\</g, "\\<");
}

export function generateCircuitGraph(combs: Entity[]) {
    let dot = `digraph {
    rankdir="LR";
    remincross=true;
    `;

    for (const item of combs) {
        if (item.source instanceof Input) {
            let c = item as Constant;
            dot += `n${item.id} [ shape=diamond, label="${item.source.name}\\n${c.params[0].signal.name}", color="black", fontcolor="black" ];\n`;
        } else if (item.source instanceof Output) {
            dot += `n${item.id} [ shape=diamond, label="${item.source.name}", color="black", fontcolor="black" ];\n`;
        } else if (item instanceof Constant) {
            dot += `n${item.id} [ shape=record, label="{$${item.id}\\n${genLabel(item)}|{<ro> Red|<go> Green}}" ];\n`;
        } else {
            dot += `n${item.id} [ shape=record, label="{{<ri> Red|<gi> Green}|$${item.id}\\n${genLabel(item)}|{<ro> Red|<go> Green}}" ];\n`;
        }
    }
    for (const item of combs) {
        if (item instanceof Constant) continue;

        if (item.input.red) {
            for (const asd of item.input.red.points) {
                if (asd.entity instanceof Pole) continue;

                if (asd == asd.entity.output) {
                    dot += `n${asd.entity.id}:ro:e -> n${item.id}:ri:w [color="red", style="setlinewidth(3)", label=""];\n`;
                }
            }
        }
        if (item.input.green) {
            for (const asd of item.input.green.points) {
                if (asd.entity instanceof Pole) continue;

                if (asd == asd.entity.output) {
                    dot += `n${asd.entity.id}:go:e -> n${item.id}:gi:w [color="green", style="setlinewidth(3)", label=""];\n`;
                }
            }
        }
    }
    dot += "}";

    fs.writeFileSync("graph.dot", dot);
}
