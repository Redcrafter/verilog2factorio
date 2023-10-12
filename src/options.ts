import fs from "fs";
import readline from 'readline';

import { Command } from "commander";

import { logger } from "./logger.js";

export let options: {
    verbose: boolean;
    debug: boolean;
    seed?: string;
    output?: string;
    modules?: string[];
    files?: string[];
    generator: "annealing" | "matrix" | "chunkAnnealing";
} = {
    verbose: false,
    debug: false,
    seed: Math.random().toString(),
    generator: "annealing"
};

export async function parseArgs() {
    const program = new Command("v2f");

    program
        .arguments("<files..>")
        .helpOption("-h, --help", "Display this information.")
        .option("-v, --verbose")
        .option("-d, --debug", "Generate debug information. (A graph of the output circuit.)")
        .option("-s, --seed <seed>", "Specify a seed for the layout generation.")
        .option("-o, --output <file>", "File to output the compiled blueprint to.")
        .option("-m, --modules <names...>", "Verilog modules to output blueprint for. (defaults to all).")
        .option("-f, --files <files...>", "List of Verilog files to compile. (only has to be explicitly specified after -m).")
        .option("-g, --generator [type]", "Layout generator to use. annealing(default),matrix,chunkAnnealing");

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
            let res = await new Promise<string>(res => rl.question(`${options.output} already exists. Overwrite? [y/n] `, res));
            if (res.toLowerCase() !== "y") {
                process.exit(0);
            }
        }

        rl.close();
    }

    if (options.generator != "annealing" && options.generator != "matrix" && options.generator != "chunkAnnealing") {
        logger.log(`Unknown layout generator: ${options.generator}`);
        process.exit(0);
    }
}
