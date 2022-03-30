import { logger } from "../logger.js";
import { options } from "../options.js";

import { Arithmetic } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { Color, Entity, makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";

function eq(a: Entity, b: Entity) {
    if (a instanceof Arithmetic && b instanceof Arithmetic) {
        return a.params.first_signal == b.params.first_signal &&
            a.params.second_signal == b.params.second_signal &&
            a.params.first_constant == b.params.first_constant &&
            a.params.second_constant == b.params.second_constant &&
            a.params.operation == b.params.operation &&
            a.params.output_signal == b.params.output_signal;
    } else if (a instanceof Decider && b instanceof Decider) {
        return a.params.first_signal == b.params.first_signal &&
            a.params.second_signal == b.params.second_signal &&
            a.params.constant == b.params.constant &&
            a.params.comparator == b.params.comparator &&
            a.params.output_signal == b.params.output_signal &&
            a.params.copy_count_from_input == b.params.copy_count_from_input;
    }

    return false;
}

// combines combinators which have the same input do the same thing and have no output neighbors 
export function opt_merge(entities: Entity[]) {
    if (options.verbose) logger.log("Running opt_merge");

    let groups = new Map<string, Entity[]>();
    for (const e of entities) {
        if (e instanceof Pole) continue;

        // collet entities grouped by input networks
        let key = `${e.input.red?.id ?? 0}_${e.input.green?.id ?? 0}`;

        if (groups.has(key)) {
            groups.get(key).push(e);
        } else {
            groups.set(key, [e]);
        }
    }

    // this is O(n^2) could optimize this to O(n) by converting to string representation and doing a dictionary lookup
    let total = 0;
    for (const [key, group] of groups) {
        if (group.length == 1) continue;

        for (let i = 0; i < group.length; i++) {
            let entity = group[i];

            let arNet = entity.output.red;
            let agNet = entity.output.green;

            for (let j = i + 1; j < group.length; j++) {
                let other = group[j];

                if (!eq(entity, other)) continue;

                let orNet = other.output.red;
                let ogNet = other.output.green;

                // check if there are other writers on the output networks
                let doMerge = false;
                if (!arNet && !orNet) { // only green output
                    doMerge = !agNet.hasOtherWriters(entity.output) && !ogNet.hasOtherWriters(other.output);
                } else if (!agNet && !ogNet) { // only red output
                    doMerge = !arNet.hasOtherWriters(entity.output) && !orNet.hasOtherWriters(other.output);
                }

                if (doMerge) {
                    group.splice(j, 1);
                    entities.splice(entities.indexOf(other), 1);
                    j--;

                    makeConnection(Color.Both, entity.output, other.output);

                    other.delete();

                    total++;
                }
            }
        }
    }

    if (options.verbose) logger.log(`Removed ${total} combinators`);
    return total != 0;
}
