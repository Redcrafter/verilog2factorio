import { logger } from "../logger.js";
import { options } from "../options.js";
import { opt_clean } from "./opt_clean.js";
import { opt_const } from "./opt_const.js";
import { opt_merge } from "./opt_merge.js";
import { opt_transform } from "./opt_transform.js";
import { opt_user } from "./opt_user.js";
export function optimize(entities) {
    opt_user();
    let changed = true;
    while (changed) {
        changed = false;
        // somehow ||= does not work?
        if (opt_const(entities))
            changed = true;
        if (opt_clean(entities))
            changed = true;
        if (opt_merge(entities))
            changed = true;
        if (opt_transform(entities))
            changed = true;
        if (options.verbose)
            logger.log("");
    }
}
