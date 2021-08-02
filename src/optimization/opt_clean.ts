import { Constant } from "../entities/Constant.js";
import { Entity } from "../entities/Entity.js";

/** Removes entities which have no effect */
export function opt_clean(entities: Entity[]) {
    let count = 0;

    console.log("Running opt_clean");

    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep) continue;

        if ((e instanceof Constant && e.params[0].count == 0) || // constant with 0 output
            (e.input.red.size + e.input.green.size == 0) || //  input is not connected
            (e.output.red.size + e.output.green.size == 0)) { // output is not connected

            e.delete();
            entities.splice(entities.indexOf(e), 1);
            i--;
            count++;

            continue;
        }
    }

    console.log(`Removed ${count} combinators\n`);
}
