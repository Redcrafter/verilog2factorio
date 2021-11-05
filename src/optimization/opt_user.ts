import { nets, Network } from "./nets.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { options } from "../options.js";
import { logger } from "../logger.js";

// removes networks which are never used as inputs
export function opt_user() {
    if (options.verbose) logger.log("Running opt_user");

    let count = 0;
    for (const n of [...nets.red, ...nets.green]) {
        if(!n.hasOtherReaders(null)) {
            n.delete();
            count++;
        }
    }

    if (options.verbose) logger.log(`Removed ${count} networks`);
    return count != 0;
}
