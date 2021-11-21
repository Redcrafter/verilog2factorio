import { buildGraph } from "./build/parser.js";
import { transform } from "./build/transformer.js";
import { logger, setLogger } from "./build/logger.js";
import { changeTab, consoleTab } from "./tabs.js";
import { options } from "./build/options.js";

options.verbose = true;

const consoleEl = document.getElementById("console");

setLogger({
    log(message) {
        if (message == "") message = " ";
        let div = document.createElement("div");
        div.textContent = message;
        consoleEl.append(div);

        div.scrollIntoView();
    },
    assert(condition, message) {
        console.assert(condition, message);

        if (!condition) {
            let div = document.createElement("div");
            div.classList.add("error");
            if (message == "") {
                div.textContent = "Assertion failed";
            } else {
                div.textContent = `Assertion failed: ${message}`;
            }
            consoleEl.append(div);

            div.scrollIntoView();
        }
    },
    table(tabularData, properties) {
        // TODO:
        console.table(tabularData, properties);
    },
    error(message) {
        if (message == "") message = " ";

        console.error(message);

        let div = document.createElement("div");
        div.classList.add("error");
        div.textContent = message;
        consoleEl.append(div);

        div.scrollIntoView();
    }
});

let collatz = `
module collatz(input clk, input start, input [15:0] data, output reg [15:0] val);
    always @(posedge clk) begin
        if(start)
            val <= data; else if(!(val & 1'b1)) val <=val>> 1;
        else
            val <= val * 16'd3 + 16'd1; 
        end 
endmodule
`;

let editor = ace.edit("input");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/verilog");
window.editor = editor;

if (localStorage.getItem("verilog")) {
    editor.setValue(localStorage.getItem("verilog"));
} else {
    editor.setValue(collatz);
}
editor.selection.clearSelection();


editor.session.on("change", (data) => {
    localStorage.setItem("verilog", editor.getValue());
});

function createBlueprint(entityList, name) {
    return {
        item: "blueprint",
        label: name,
        icons: [{
            signal: {
                type: "item",
                name: "decider-combinator"
            },
            index: 1
        }, {
            signal: {
                type: "item",
                name: "constant-combinator"
            },
            index: 2
        }],
        entities: entityList,
        version: 281479273447424
    }
}

function createBlueprintBook(blueprints) {
    return {
        item: "blueprint-book",
        blueprints: blueprints.map((blueprint, index) => ({
            index,
            blueprint
        })),
        active_index: 0,
        version: 281479273447424
    }
}

document.getElementById("compile").addEventListener("click", () => {
    changeTab(consoleTab);
    compile();
});
const output = document.getElementById("output");

YosysJS.load_viz();

async function compile() {
    function printYosys() {
        logger.log(ys.print_buffer);
        if (ys.errmsg) {
            logger.error(ys.errmsg);
            throw new Error(ys.errmsg);
        }
    }

    let ys;
    await new Promise(res => ys = YosysJS.create("", res));

    ys.write_file("test.sv", editor.getValue());

    ys.run("design -reset; design -reset-vlog");
    printYosys();

    ys.run("read_verilog -sv test.sv");
    printYosys();

    ys.run("proc; flatten; wreduce; opt; fsm; opt; memory -nomap -nordff; opt; muxpack; peepopt; async2sync; wreduce; opt -mux_bool");
    printYosys();

    ys.run("write_json temp.json");
    printYosys();

    ys.run("show");
    printYosys();

    var dot = ys.read_file('show.dot');
    if (dot) YosysJS.dot_into_svg(dot, 'svg');

    var data = JSON.parse(ys.read_file('temp.json'));

    let blueprints = [];
    for (const key in data.modules) {
        const module = data.modules[key];
        let graph = buildGraph(module);

        const entities = transform(graph.nodes);
        blueprints.push(createBlueprint(entities, key));
    }

    let el;
    if (blueprints.length == 1) {
        el = {
            blueprint: blueprints[0]
        };
    } else {
        el = {
            blueprint_book: createBlueprintBook(blueprints)
        };
    }

    output.textContent = "0" + btoa(String.fromCharCode.apply(null, pako.deflate(JSON.stringify(el))));
}
