import { createBpFromFiles } from './driver.js';

import { Command } from 'commander';
import readline from 'readline';
import fs from "fs";


const program = new Command("v2f");

program
    .arguments("<files..>")
    // .option("-v, --verbose")
    .helpOption("-h, --help", "Display this information.")
    .option("-s, --seed <seed>", "Specify a seed for the layout generation.")
    .option("-o, --output <file>", "File to output the compiled blueprint to.")
    .option("-m, --modules <names...>", "Verilog modules to output blueprint for. (defaults to all).")
    .option("-f, --files <files...>", "List of Verilog files to compile. (only has to be explicitly specified after -m).")
    .option("-r, --retry", "Retry until there are no longer layout errors.");
program.parse(process.argv);

export type optionsType = {
    seed?: string;
    output?: string;
    modules?: string[];
    files?: string[];
    retry?: Boolean;
}
export const options: optionsType = program.opts();
// options.seed

// merge default and file options
options.files = options.files ?? [];
options.files.push(...program.args);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

if (options.files.length == 0) {
    console.log("error: no input files");
    if (options.modules) {
        console.log("did you forget -f for files?");
    }
    process.exit(0);
}

if (options.output) {
    if (fs.existsSync(options.output)) {
        let res = await new Promise<string>(res => rl.question(`${options.output} already exists. Overwrite? [y/n] `, res));
        if (res.toLowerCase() !== "y") {
            process.exit(0);
        }
    }
}

rl.close();

const string = await createBpFromFiles(options);

if (options.output) {
    fs.writeFileSync(options.output, string);
} else {
    console.log(string);
}