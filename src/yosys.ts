import * as fs from "fs";
import { exec } from "child_process";

interface IDict<T> {
    [index: string]: T;
}

export interface Port {
    direction: "input" | "output";
    bits: number[];
}

export interface Cell {
    hide_name: number;
    type: string;
    parameters: IDict<string>;
    attributes: {
        src?: string;
        full_case?: string;
    };
    port_directions: IDict<"input" | "output">;
    connections: IDict<(number | string)[]>;
}

export interface Module {
    attributes: IDict<string>;
    parameter_default_values?: IDict<string>;

    ports: IDict<Port>;
    cells: IDict<Cell>;
    netnames: IDict<Object>;

}

export interface YosysData {
    creator: string;
    modules: IDict<Module>;
}

export function genNetlist(files: string[]): Promise<YosysData> {
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.log(`error: file ${file} not found`);
        }
    }
    const commands = "proc; flatten; wreduce; opt; fsm; opt; memory; opt; peepopt; async2sync; wreduce; opt";
    const proc = exec(`yosys -p "${commands}" -o temp.json "${files.join('" "')}"`);

    return new Promise(res => {
        proc.stderr.on("data", (data) => {
            console.log(data);
        });
        proc.on("exit", (code) => {
            if (code != 0) {
                console.log("An error occurred while yosys tried to compile your code.")
                process.exit(code);
            }
            const data = JSON.parse(fs.readFileSync("./temp.json", 'utf8'));
            fs.unlinkSync("temp.json");

            res(data);
        });
    })
}
