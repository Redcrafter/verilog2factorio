import { logger } from "../logger.js";
import { options } from "../options.js";

import { Entity } from "../entities/Entity.js";

import { opt_clean } from "./opt_clean.js";
import { opt_const } from "./opt_const.js";
import { opt_merge } from "./opt_merge.js";
import { opt_nop } from "./opt_nop.js";
import { opt_user } from "./opt_user.js";

export function optimize(entities: Entity[]) {
    let changed = true;
    while (changed) {
        changed = false;

        if (opt_user()) changed = true;
        if (opt_const(entities)) changed = true;
        if (opt_clean(entities)) changed = true;
        if (opt_merge(entities)) changed = true;
        // if (opt_nop(entities)) changed = true;

        if (options.verbose) logger.log("");
    }
}
