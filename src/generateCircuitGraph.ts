import { Entity } from "./entities/Entity.js";
import { rm, writeFile } from "fs";
import { Constant } from "./entities/Constant.js";
import { Arithmetic } from "./entities/Arithmetic.js";
import { Decider } from "./entities/Decider.js";
import { Pole } from "./entities/Pole.js";
import { exec } from "child_process";
import { logger } from "./logger.js";

function genLabel(comb:Entity):string{
        if(comb instanceof Constant)
        {
            let data = "";
            comb.params.forEach((d)=>{
                data += d.signal.name+d.count+"\n";
            });
            return `${comb.id} [label="constant\n${data}",shape="cylinder"]\n`
        }
        else if(comb instanceof Arithmetic)
        {
            let first = comb.params.first_constant ?? comb.params.first_signal.name;
            let second = comb.params.second_constant ?? comb.params.second_signal.name;
            return `${comb.id} [label="${first} ${comb.params.operation} ${second}\n${comb.params.output_signal.name}",shape="box"]\n`
        }
        else if(comb instanceof Decider)
        {
            let first = comb.params.first_signal.name;
            let second = comb.params.constant ?? comb.params.second_signal.name;
            let out = comb.params.output_signal.name + (comb.params.copy_count_from_input ? " copy" : "");
            return `${comb.id} [label="${first} ${comb.params.comparator} ${second}\n${out}",shape="ellipse"]\n`
        }
        else if(comb instanceof Pole)
        {
            return `${comb.id} [label="pole",shape="diamond"]\n`
        }
        throw Error("unreachable")
}


export function generateCircuitGraph(combs:Entity[],outFileName:string){
    let gv = 
    `digraph {
        rankdir="LR"`;
    for (const comb of combs) {

        gv += genLabel(comb);

        comb.output?.red?.points?.forEach((e)=>{
            if(e.entity === comb)
                return;
            if(e.type == 2)
                return;
            gv+=`${comb.id}->${e.entity.id}[color=red]\n` 
        });
        comb.output?.green?.points?.forEach((e)=>{
            if(e.entity === comb)
                return;
            if(e.type == 2)
                return;
            gv+=`${comb.id}->${e.entity.id}[color=green]\n` 
        });
    }
    gv += "}\n";
    writeFile("tmp.gv",gv,async(e)=>{
        exec(`dot -Tsvg -o ${outFileName} tmp.gv`,(err,stdout,stderr)=>{
            if(err)
                logger.error("failed to generate graph");
            rm("tmp.gv",()=>{});
        });
    });
}