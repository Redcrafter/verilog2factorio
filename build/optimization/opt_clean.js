import { logger } from "../logger.js";
import { options } from "../options.js";
/** Removes entities which have no output */
export function opt_clean(entities) {
    let count = 0;
    if (options.verbose)
        logger.log("Running opt_clean");
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep)
            continue;
        if (!e.output.red && !e.output.green) { // output is not connected
            e.delete();
            entities.splice(entities.indexOf(e), 1);
            i--;
            count++;
            continue;
        }
    }
    if (options.verbose)
        logger.log(`Removed ${count} combinators`);
    return count != 0;
}
