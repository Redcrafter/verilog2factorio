import { exec } from "child_process";
import * as fs from "fs";
import * as zlib from "zlib";
import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";

function genNetlist(files: string[]): Promise<any> {
    for (const file of files) {
        if (!fs.existsSync(file)) {
            throw new Error("File not found");
        }
    }
    const commands = "proc; flatten; wreduce; opt; fsm; opt; memory; opt; peepopt; async2sync; wreduce; opt";
    const proc = exec(`yosys -p "${commands}" -o temp.json "${files.join('" "')}"`);

    return new Promise(res => {
        proc.stderr.on("data", (data) => {
            console.log(data);
        });
        proc.on("exit", (code) => {
            if(code != 0) {
                console.log("An error occurred while yosys tried to compile your code.")
                process.exit(code);
            }
            const data = JSON.parse(fs.readFileSync("./temp.json", 'utf8'));
            fs.unlinkSync("temp.json");

            res(data);
        });
    })
}

function compress(data: any) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

async function main() {
    console.log("Generating netlist");
    const data = await genNetlist(process.argv.slice(2));

    let modules = [];

    for (const name in data.modules) {
        console.log(`Building graph for ${name}`);
        const graph = buildGraph(data.modules[name]);

        console.log(`Translating graph to combinators`);
        const print = transform(graph.nodes);
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
        };

    process.stdout.write(compress(el));
    process.stdout.write("\n");
}

main();
