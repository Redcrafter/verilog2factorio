import { Command } from "commander";
import fs from "fs";
import readline from 'readline';
import { logger } from "./logger.js";

export let options: {
    verbose: boolean;
    // seed?: string;
    output?: string;
    modules?: string[];
    files?: string[];
    retry?: boolean;
    generator: "annealing" | "matrix";
} = {
    verbose: false,
    generator: "annealing"
};

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
        let res = await new Promise<string>(res => rl.question(`${options.output} already exists. Overwrite? [y/n] `, res));
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
