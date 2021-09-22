import { extractSignalGroups, GroupCollection } from "./groups.js";
import { logger } from "../logger.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { allSignals, Entity, makeConnection } from "../entities/Entity.js";

import { options } from "../options.js";

function getSignals(e: Entity) {
    if (e instanceof Arithmetic || e instanceof Decider) {
        return {
            in: e.params.first_signal,
            out: e.params.output_signal
        };
    }
    throw new Error("unreachable");
}

function isNop(e: Entity) {
    if (e instanceof Arithmetic) {
        return (e.params.second_constant == 0 && (
            e.params.operation == ArithmeticOperations.Add ||
            e.params.operation == ArithmeticOperations.LShift ||
            e.params.operation == ArithmeticOperations.Or ||
            e.params.operation == ArithmeticOperations.RShift ||
            e.params.operation == ArithmeticOperations.Sub ||
            e.params.operation == ArithmeticOperations.Xor)) ||
            (e.params.operation == ArithmeticOperations.And && e.params.second_constant == -1);
    }
    return false;
}

export function opt_transform(entities: Entity[]) {
    if (options.verbose) logger.log("Running opt_transform");

    let groups = extractSignalGroups(entities);

    let count = 0;
    let filter1 = 0;
    let filter2 = 0;
    let filter3 = 0;
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];

        if (!isNop(e)) continue;

        // TODO: allow for multiple differnt colored outputs when inNet.points.size == 2
        if ((!!e.input.red == !!e.input.green) || (!!e.output.red == !!e.output.green)) {
            filter1++;
            continue;
        }

        let inNet = e.input.red ?? e.input.green;
        let outNet = e.output.red ?? e.output.green;

        if (outNet.hasOtherInputs(e.output) && !inNet.hasOtherOutputs(e.input)) {
            filter2++;
            continue;
        }

        let oldSignal = getSignals(e);

        let newColor;
        if (inNet.color === outNet.color) {
            newColor = inNet.color
        } else {
            if (!inNet.hasColor(inNet.color)) {
                newColor = outNet.color;
            } else if (!outNet.hasColor(outNet.color)) {
                newColor = inNet.color;
            } else {
                filter3++;
                continue;
            }
        }

        entities.splice(i--, 1);

        if (oldSignal.in !== oldSignal.out) {
            let inGroup = groups.get(oldSignal.in).nets.get(inNet);
            let outGroup = groups.get(oldSignal.out).nets.get(outNet);

            let newSignal = allSignals.find(s => !inGroup.networkSignals.has(s) && !outGroup.networkSignals.has(s));
            if (!newSignal) throw new Error("graph coloring failed");

            inGroup.points.delete(e.input);
            outGroup.points.delete(e.output);

            groups.get(oldSignal.in).changeSignal(inGroup, oldSignal.in, newSignal);
            groups.get(oldSignal.out).changeSignal(outGroup, oldSignal.out, newSignal);

            let newGroup = groups.get(newSignal)
            if (!newGroup) {
                newGroup = new GroupCollection();
                groups.set(newSignal, newGroup);
            }
            newGroup.merge(inGroup, outGroup);
        }

        makeConnection(newColor, e.input, e.output);
        e.delete();

        count++;
    }

    if (options.verbose) {
        logger.log(`Filter: ${filter1}, ${filter2}, ${filter3}`);
        logger.log(`Removed ${count} combinators`);
    }
    return count != 0;
}
