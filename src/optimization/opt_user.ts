import { nets } from "./nets.js";
import { options } from "../options.js";
import { logger } from "../logger.js";

// todo: check for each signal?

// removes networks which are never used as inputs
export function opt_user() {
    if (options.verbose) logger.log("Running opt_user");

    let count = 0;
    for (const n of [...nets.red, ...nets.green]) {
        if (!n.hasOtherReaders(null) || !n.hasWriter()) {
            n.delete();
            count++;
        }
    }

    if (options.verbose) logger.log(`Removed ${count} networks`);
    return count != 0;
}
