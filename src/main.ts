import { spawn } from "child_process";
import * as fs from "fs";
import * as parser from "./parser.js";
import * as zlib from "zlib";

function genNetlist(file: string): any {
    let proc = spawn("./yosys/yosys.exe");

    proc.stdin.write(
        `design -reset
read_verilog ${file}
proc; opt; fsm; opt; memory; opt
write_json temp.json
exit
`);

    // proc.stdout.on("data", data => {
    //     console.log(`${data}`);
    // });

    return new Promise(res => {
        proc.on("exit", () => {
            let dat = JSON.parse(fs.readFileSync("./temp.json").toString());
            fs.unlinkSync("temp.json");

            res(dat);
        });
    })
}

function compress(data: any) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

async function compileFile(path) {
    console.log("Generating netlist");
    let data = await genNetlist(path);

    let modules = [];

    for (const name in data.modules) {
        console.log(`Building graph for ${name}`);
        let graph = parser.buildGraph(data.modules[name]);

        console.log(`Translating graph to combinators`);
        let print = parser.transform(graph.nodes);
        print.label = name;

        modules.push(print);
    }

    let el;
    if(modules.length == 1) {
        el = {
            blueprint: modules[0]
        };
    } else {
        el = {
            "blueprint-book": {
                item: "blueprint-book",
                blueprints: modules,
                active_index: 0,
                version: 281479273447424
            }
        }
    }

    console.log(compress(el));
}

let args = process.argv.slice(2);
for (const file of args) {
    compileFile(file);    
}
