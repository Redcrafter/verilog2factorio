import { Entity } from "../entities/Entity.js";
import { options } from "../main.js";

import { opt_chain } from "./opt_chain.js";
import { opt_clean } from "./opt_clean.js";
import { opt_merge } from "./opt_merge.js";
import { opt_transform } from "./opt_transform.js";

export function optimize(entities: Entity[]) {
    opt_clean(entities);

    if (options.experimental) {
        opt_transform(entities);
        opt_merge(entities);
    }

    opt_chain(entities);
}
