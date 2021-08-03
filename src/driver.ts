import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";
import { genNetlist, Module } from "./yosys.js";
import { Blueprint, createBlueprint, createBpString } from "./blueprint.js";

import { optionsType } from './main';

export async function createBpFromFiles(optionsParam: optionsType) {
    const data = await genNetlist(optionsParam.files);
    const modules: Blueprint[] = [];
    
    let keys = new Set(optionsParam.modules ?? Object.keys(data.modules));
    
    for (const key of keys) {
        let module = data.modules[key];
        if (!module) {
            console.log(`error: Module ${key} not found`);
            throw new Error();
        }
        modules.push(pipeline(key, module));
    }
    
    const string = createBpString(modules);

    return string;
}

function pipeline(name: string, module: Module) {
    console.log(`Building graph for ${name}`);
    const graph = buildGraph(module);

    console.log(`Translating graph to combinators`);
    const entities = transform(graph.nodes);

    return createBlueprint(entities, name);
}