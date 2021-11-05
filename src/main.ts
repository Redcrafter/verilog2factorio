import fs from "fs";

import { Blueprint, createBlueprint, createBpString } from "./blueprint.js";
import { logger } from "./logger.js";
import { options, parseOptions } from './options.js';
import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";
import { genNetlist } from "./yosys.js";

await parseOptions();

const data = await genNetlist(options.files);
const modules: Blueprint[] = [];

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
} else {
    logger.log(string);
}
