import * as fs from "fs";
import { exec } from "child_process";
import { logger } from "./logger.js";
export function genNetlist(files) {
    for (const file of files) {
        if (!fs.existsSync(file)) {
            logger.log(`error: file ${file} not found`);
        }
    }
    const commands = "proc; flatten; wreduce; opt; fsm; opt; memory -nomap -nordff; opt; muxpack; peepopt; async2sync; wreduce; opt -mux_bool";
    const proc = exec(`yosys -p "${commands}" -o temp.json "${files.join('" "')}"`);
    return new Promise(res => {
        proc.stderr.on("data", (data) => {
            logger.log(data);
        });
        proc.on("exit", (code) => {
            if (code != 0) {
                logger.log("An error occurred while yosys tried to compile your code.");
                process.exit(code);
            }
            const data = JSON.parse(fs.readFileSync("./temp.json", 'utf8'));
            fs.unlinkSync("temp.json");
            res(data);
        });
    });
}
