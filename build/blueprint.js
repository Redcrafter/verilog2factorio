import * as zlib from "zlib";
import * as fs from "fs";
export function createBlueprint(entityList, name) {
    return {
        item: "blueprint",
        label: name,
        icons: [
            {
                signal: {
                    type: "item",
                    name: "decider-combinator"
                },
                index: 1
            },
            {
                signal: {
                    type: "item",
                    name: "constant-combinator"
                },
                index: 2
            }
        ],
        entities: entityList,
        version: 281479273447424
    };
}
function createBlueprintBook(blueprints) {
    return {
        item: "blueprint-book",
        blueprints: blueprints.map((blueprint, index) => ({ index, blueprint })),
        active_index: 0,
        version: 281479273447424
    };
}
function compress(data) {
    let str = JSON.stringify(data);
    fs.writeFileSync("./test/test.json", str);
    return "0" + zlib.deflateSync(str, { level: 9 }).toString("base64");
}
export function createBpString(blueprints) {
    let el;
    if (blueprints.length == 1) {
        el = { blueprint: blueprints[0] };
    }
    else {
        el = { blueprint_book: createBlueprintBook(blueprints) };
    }
    return compress(el);
}
