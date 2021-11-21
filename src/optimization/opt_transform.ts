import { extractSignalGroups, GroupCollection } from "./groups.js";
import { logger } from "../logger.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { allSignals, Entity, makeConnection } from "../entities/Entity.js";

import { options } from "../options.js";
import { nets, Network } from "./nets.js";

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

        if (outNet.hasOtherWriters(e.output) && inNet.hasOtherReaders(e.input)) {
            filter2++;
            continue;
        }

        let oldSignal = getSignals(e);

        let newColor;
        if (inNet.color === outNet.color) {
            newColor = inNet.color;
        } else {
            if (!inNet.hasOtherColor()) {
                newColor = outNet.color; // inNet can be changed to other color
            } else if (!outNet.hasOtherColor()) {
                newColor = inNet.color;  // outNet can be changed to other color
            } else {
                filter3++;
                continue;
            }
        }

        entities.splice(i--, 1);

        let inGroup = groups.get(oldSignal.in, inNet);
        let outGroup = groups.get(oldSignal.out, outNet);

        if (oldSignal.in !== oldSignal.out) {
            let newSignal = allSignals.find(s => !inGroup.hasSignal(s) && !outGroup.hasSignal(s));
            if (!newSignal) throw new Error("graph coloring failed");

            // change signals
            inGroup.changeSignal(oldSignal.in, newSignal);
            outGroup.changeSignal(oldSignal.out, newSignal);
        }

        // delete combinator
        inGroup.remove(e.input);
        outGroup.remove(e.output);

        // merge groups and nets
        let g = groups.merge(inGroup, outGroup);
        g.nets.delete(inNet);
        g.nets.delete(outNet);

        g.parent.nets.delete(inNet);
        g.parent.nets.delete(outNet);

        let net = new Network(newColor);
        { // merge disregarding color
            for (const p of inNet.points) {
                p[inNet.color] = null;
                net.add(p);
            }
            for (const p of outNet.points) {
                p[outNet.color] = null;
                net.add(p);
            }

            inNet.points.clear();
            outNet.points.clear();
            nets[inNet.color].delete(inNet);
            nets[outNet.color].delete(outNet);
        }

        g.nets.add(net);
        g.parent.nets.set(net, g);

        e.delete();

        count++;
    }

    if (options.verbose) {
        logger.log(`Filter: ${filter1}, ${filter2}, ${filter3}`);
        logger.log(`Removed ${count} combinators`);
    }
    return count != 0;
}
