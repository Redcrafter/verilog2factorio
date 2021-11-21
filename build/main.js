import fs from "fs";
import { Command } from "commander";
import readline from 'readline';
import { createBlueprint, createBpString } from "./blueprint.js";
import { logger } from "./logger.js";
import { options } from './options.js';
import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";
import { genNetlist } from "./yosys.js";
{ // parse command line options
    const program = new Command("v2f");
    program
        .arguments("<files..>")
        .helpOption("-h, --help", "Display this information.")
        .option("-v, --verbose")
        // .option("-s, --seed <seed>", "Specify a seed for the layout generation.")
        .option("-o, --output <file>", "File to output the compiled blueprint to.")
        .option("-m, --modules <names...>", "Verilog modules to output blueprint for. (defaults to all).")
        .option("-f, --files <files...>", "List of Verilog files to compile. (only has to be explicitly specified after -m).")
        .option("-r, --retry", "Retry until there are no longer layout errors.")
        .option("-g, --generator [type]", "Layout generator to use. annealing(default),matrix");
    program.parse();
    let _options = program.opts();
    for (const key in _options) {
        // @ts-ignore
        options[key] = _options[key];
    }
    // merge default and file options
    options.files = options.files ?? [];
    options.files.push(...program.args);
    if (options.files.length == 0) {
        logger.log("error: no input files");
        if (options.modules) {
            logger.log("did you forget -f for files?");
        }
        process.exit(0);
    }
    if (options.output) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        if (fs.existsSync(options.output)) {
            let res = await new Promise(res => rl.question(`${options.output} already exists. Overwrite? [y/n] `, res));
            if (res.toLowerCase() !== "y") {
                process.exit(0);
            }
        }
        rl.close();
    }
    if (options.generator != "annealing" && options.generator != "matrix") {
        logger.log(`Unknown layout generator: ${options.generator}`);
        process.exit(0);
    }
}
const data = await genNetlist(options.files);
const modules = [];
let keys = new Set(options.modules ?? Object.keys(data.modules));
for (const key of keys) {
    let module = data.modules[key];
    if (!module) {
        logger.log(`error: Module ${key} not found`);
        throw new Error();
    }
    logger.log(`Building graph for ${key}`);
    const graph = buildGraph(module);
    logger.log(`Translating graph to combinators`);
    const entities = transform(graph.nodes);
    modules.push(createBlueprint(entities, key));
}
const string = createBpString(modules);
if (options.output) {
    fs.writeFileSync(options.output, string);
}
else {
    logger.log(string);
}
