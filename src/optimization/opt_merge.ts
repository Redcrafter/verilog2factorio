import { logger } from "../logger.js";
import { options } from "../options.js";

import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { Color, Entity, makeConnection } from "../entities/Entity.js";
import { nets } from "../nets.js";
import { SignalID } from "../blueprint.js";

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
    } else if (a instanceof Constant && b instanceof Constant) {
        debugger;
    }

    return false;
}

function a(signal: SignalID) {
    if (!signal) return "n";
    else return signal.name;
}

// combines combinators which have the same input do the same thing and have no output neighbors 
export function opt_merge(entities: Entity[]) {
    if (options.verbose) logger.log("Running opt_merge");

    {
        let i = 1;
        for (const net of nets.red)
            net.id = i++;
        for (const net of nets.green)
            net.id = i++;
    }

    let groups = new Map<string, Entity[]>();
    for (const e of entities) {
        if (e.keep) continue;

        if (e.output.red?.hasOtherWriters?.(e.output)) continue;
        if (e.output.green?.hasOtherWriters?.(e.output)) continue;

        // collet entities grouped by input networks
        let key = `${e.input.red?.id ?? 0}_${e.input.green?.id ?? 0}`;

        if (e instanceof Arithmetic) {
            key += `_${a(e.params.first_signal)}_${a(e.params.second_signal)}_${e.params.first_constant}_${e.params.second_constant}_${e.params.operation}_${a(e.params.output_signal)}`;
        } else if (e instanceof Decider) {
            key += `_${a(e.params.first_signal)}_${a(e.params.second_signal)}_${e.params.constant}_${e.params.comparator}_${a(e.params.output_signal)}_${e.params.copy_count_from_input}`;
        } else if (e instanceof Constant) {
            continue;
        }

        if (groups.has(key)) {
            groups.get(key).push(e);
        } else {
            groups.set(key, [e]);
        }
    }

    let total = 0;
    for (const [key, group] of groups) {
        const entity = group[0];
        for (let j = 1; j < group.length; j++) {
            const other = group[j];

            entities.splice(entities.indexOf(other), 1);

            if (!entity.output.red && !other.output.red) { // only green output
                makeConnection(Color.Green, entity.output, other.output);
            } else if (!entity.output.green && !other.output.green) { // only red output
                makeConnection(Color.Red, entity.output, other.output);
            } else {
                makeConnection(Color.Both, entity.output, other.output);
            }

            other.delete();

            total++;
        }
    }

    if (options.verbose) logger.log(`Removed ${total} combinators`);
    return total != 0;
}
