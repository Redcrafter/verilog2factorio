import * as zlib from "zlib";
import { buildGraph } from "./parser.js";
import { transform } from "./transformer.js";
import { genNetlist } from "./genNetlist.js";
import { createBlueprint, createBlueprintBook } from "./createBlueprints.js"

function compress(data: any) {
    return "0" + zlib.deflateSync(JSON.stringify(data), { level: 9 }).toString("base64");
}

async function main() {
    console.log("Generating netlist");
    const data = await genNetlist(process.argv.slice(2));

    const modules = [];

    for (const name in data.modules) {
        console.log(`Building graph for ${name}`);
        const graph = buildGraph(data.modules[name]);

        console.log(`Translating graph to combinators`);
        const bp = createBlueprint(transform(graph.nodes));
        bp.blueprint.label = name;

        modules.push(bp);
    }

    if (modules.length === 1) {
        console.log(compress(modules[0]))
    } else {
        console.log(compress(createBlueprintBook(modules)))
    }
}

main();
