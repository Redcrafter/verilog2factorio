import * as fs from "fs";
import { exec } from "child_process";

interface IDict<T> {
    [index: string]: T;
}

export interface Port {
    direction: "input" | "output";
    bits: number[];
}

type Conn = (number | string)[];

interface CellBase {
    hide_name: number;
    type: string;
    parameters: IDict<number>;
    attributes: {
        src: string;
        full_case?: string;
    };
    port_directions: IDict<"input" | "output">;
    connections: any;
}
export interface UnaryCell extends CellBase {
    type: "$not" | "$pos" | "$neg" | "$reduce_and" | "$reduce_or" | "$reduce_xor" | "$reduce_xnor" | "$reduce_bool" | "$logic_not";
    parameters: {
        A_SIGNED: number;
        A_WIDTH: number;
        Y_WIDTH: number;
    };
    connections: {
        A: Conn;
        Y: number[];
    };
}
export interface BinaryCell extends CellBase {
    type: "$and" | "$or" | "$xor" | "$xnor" | "$shl" | "$shr" | "$sshl" | "$sshr" | "$logic_and" | "$logic_or" | "$eqx" | "$nex" | "$lt" | "$le" | "$eq" | "$ne" | "$ge" | "$gt" | "$add" | "$sub" | "$mul" | "$div" | "$mod" | "$pow";
    parameters: {
        A_SIGNED: number;
        A_WIDTH: number;
        B_SIGNED: number;
        B_WIDTH: number;
        Y_WIDTH: number;
    };
    port_directions: {
        A: "input";
        B: "input";
        Y: "output";
    };
    connections: {
        A: Conn;
        B: Conn;
        Y: number[];
    };
}

// == Multiplexers ==
export interface Mux extends CellBase {
    type: "$mux";
    parameters: {
        WIDTH: number;
    };
    connections: {
        A: Conn;
        B: Conn;
        S: Conn;
        Y: number[];
    };
}

export interface PMux extends CellBase {
    type: "$pmux";
    parameters: {
        WIDTH: number;
        S_WIDTH: number;
    };
    connections: {
        A: Conn;
        B: Conn;
        S: Conn;
        Y: number[];
    };
}

// == Registers ==
export interface SR extends CellBase {
    type: "$sr";
    parameters: {
        WIDTH: number;
        SET_POLARITY: number;
        CLR_POLARITY: number;
    };
    connections: {
        SET: Conn;
        CLR: Conn;
        Q: number[];
    };
}
export interface Dff extends CellBase {
    type: "$dff";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        Q: number[];
    };
}
export interface ADff extends CellBase {
    type: "$adff";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        ARST_POLARITY: number;
        ARST_VALUE: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        ARST: Conn;
        Q: number[];
    };
}
export interface SDff extends CellBase {
    type: "$sdff";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        SRST_POLARITY: number;
        SRST_VALUE: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        SRST: Conn;
        Q: number[];
    };
}
export interface Dffsr extends CellBase {
    type: "$dffsr";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        SET_POLARITY: number;
        CLR_POLARITY: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        SET: Conn;
        CLR: Conn;
        Q: number[];
    };
}

// same as the ones before but with added enable
export interface Dffe extends CellBase {
    type: "$dffe";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        EN_POLARITY: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        EN: Conn;
        Q: number[];
    };
}
export interface ADffe extends CellBase {
    type: "$adffe";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        EN_POLARITY: number;
        ARST_POLARITY: number;
        ARST_VALUE: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        EN: Conn;
        ARST: Conn;
        Q: number[];
    };
}
export interface SDffe extends CellBase {
    type: "$sdffe" | "$sdffce";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        EN_POLARITY: number;
        SRST_POLARITY: number;
        SRST_VALUE: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        EN: Conn;
        SRST: Conn;
        Q: number[];
    };
}
export interface Dffsre extends CellBase {
    type: "$dffsre";
    parameters: {
        WIDTH: number;
        CLK_POLARITY: number;
        EN_POLARITY: number;
        SET_POLARITY: number;
        CLR_POLARITY: number;
    };
    connections: {
        CLK: Conn;
        D: Conn;
        EN: Conn;
        SET: Conn;
        CLR: Conn;
        Q: number[];
    };
}

export type Cell = UnaryCell | BinaryCell |
    Mux | PMux |
    SR | Dff  | ADff  | SDff  | Dffsr |
         Dffe | ADffe | SDffe | Dffsre;

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
    const commands = "proc; flatten; wreduce; opt; fsm; opt; memory; opt; peepopt; async2sync; wreduce; opt -full";
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
