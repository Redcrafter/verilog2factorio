import * as zlib from "zlib";
import * as fs from 'fs';
import * as commandLineArgs from "command-line-args" // commonjs
import * as commandLineUsage from "command-line-usage" // commonjs

import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";
import { genNetlist } from "./genNetlist.js";
import { createBlueprint, createBlueprintBook } from "./createBlueprints.js"
import { seedRNG } from "./sim.js"

const optionDefinitions = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this message.'
    },
    {
        name: 'seed',
        alias: 's',
        type: String,
        description: 'Specify a seed for the PRNG. The seed is random by default.'
    },
    {
        name: 'files',
        alias: 'f',
        type: String,
        multiple: true,
        defaultOption: true,
        description: 'List of input files.',
        typeLabel: '<files>'
    },
    {
        name: 'output',
        alias: 'o',
        description: 'File to output the compiled blueprint to(stdout by default)',
        typeLabel: '<filePath>'
    },
]

const options = commandLineArgs.default(optionDefinitions)

if (options.help || Object.keys(options).length === 0 ) {
    const usage = commandLineUsage.default([{
            header: 'Usage:',
            optionList: optionDefinitions
        }])
    console.log(usage);
    process.exit();
} else {
    validateArgs(options);
}

function validateArgs(args) {
    if (args.help) {
        throw ('this should never happen')
    } else if (args.output) {
        if (fs.existsSync(args.output)) {
            throw (`file "${args.output}" already exists- not overwriting`)
        }
    }
    if (!args.files || args.files.length === 0) {
        throw('no input verilog files specified')        
    } else {
        for(const file of args.files) {
            if (!fs.existsSync(file)) {
                throw(`file "${file}" not found`);
            }            
        }
    }
}

function compress(data: any) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

async function main() {
    console.log("seeding RNG");
    seedRNG(options.seed);

    console.log("Generating netlist");
    const data = await genNetlist(options.files);

    const modules = [];

    for (const name in data.modules) {
        console.log(`Building graph for ${name}`);
        const graph = buildGraph(data.modules[name]);

        console.log(`Translating graph to combinators`);
        const bp = createBlueprint(transform(graph.nodes));
        bp.blueprint.label = name;

        modules.push(bp);
    }

    const bpstring = modules.length === 1 ? 
        compress(modules[0]) : 
        compress(createBlueprintBook(modules))
    
    if (options.output) {
        console.log(`writing blueprint to file "${options.output}"`)
        fs.writeFileSync(options.output, bpstring + '\n')
    } else {
        console.log(bpstring);
    }
}

main();
