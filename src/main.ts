import { exec } from "child_process";
import * as fs from "fs";
import * as parser from "./parser.js";
import * as zlib from "zlib";

function genNetlist(file: string): Promise<any> {
    if (!fs.existsSync(file)) {
        throw new Error("File not found");
    }
    const commands = "proc; flatten; wreduce; opt; fsm; opt; memory; opt; peepopt; async2sync; wreduce; opt"
    const proc = exec(`yosys -p "${commands}" -o temp.json ${file}`);

    return new Promise(res => {
        proc.on("exit", () => {
            const data = JSON.parse(fs.readFileSync("./temp.json", 'utf8'));
            fs.unlinkSync("temp.json");

            res(data);
        });
    })
}

function compress(data: any) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

async function compileFile(path: string) {
    console.log("Generating netlist");
    const data = await genNetlist(path);

    let modules = [];

    for (const name in data.modules) {
        console.log(`Building graph for ${name}`);
        const graph = parser.buildGraph(data.modules[name]);

        console.log(`Translating graph to combinators`);
        const print = parser.transform(graph.nodes);
        print.label = name;

        modules.push(print);
    }

    const el = modules.length === 1 ?
        {
            blueprint: modules[0]
        } :
        {
            "blueprint-book": {
                item: "blueprint-book",
                blueprints: modules.map((x, i) => ({ index: i, blueprint: x })),
                active_index: 0,
                version: 281479273447424
            }
        }

    console.log(compress(el));
}

async function main() {
    const args = process.argv.slice(2);

    for (const file of args) {
        // have to wait for compilation because of potential problems with temp.json being overwritten
        await compileFile(file);
    }
}
main();
