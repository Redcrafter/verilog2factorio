import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { allSignals, Color, Entity, makeConnection } from "../entities/Entity.js";
import { extractSignalGroups, GroupCollection } from "./groups.js";
import { extractNets } from "./nets.js";

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
    console.log("Running opt_transform");

    let nets = extractNets(entities);
    let groups = extractSignalGroups(entities, nets);

    let count = 0;
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];

        if (!isNop(e)) continue;

        // TODO: allow for multiple differnt colored outputs when inNet.points.size == 2
        if ((e.input.red.size != 0) == (e.input.green.size != 0) || (e.output.red.size != 0) == (e.output.green.size != 0)) continue;

        let inColor = e.input.red.size != 0 ? Color.Red : Color.Green;
        let outColor = e.output.red.size != 0 ? Color.Red : Color.Green;

        let inNet = nets[inColor == Color.Red ? "red" : "green"].map.get(e.input);
        let outNet = nets[outColor == Color.Red ? "red" : "green"].map.get(e.output);

        if (outNet.hasOtherInputs(e.output) && !inNet.hasOtherOutputs(e.input)) {
            continue;
        }

        let oldSignal = getSignals(e);

        let newColor;
        if (inColor === outColor) {
            newColor = inColor
        } else {
            if (!inNet.hasColor(inColor == Color.Red ? "green" : "red")) {
                newColor = outColor;
            } else if (!outNet.hasColor(outColor == Color.Red ? "green" : "red")) {
                newColor = inColor;
            } else {
                continue;
            }
        }

        entities.splice(i--, 1);
        inNet.points.delete(e.input);
        outNet.points.delete(e.output);

        if (oldSignal.in !== oldSignal.out) {
            let inGroup = groups.get(oldSignal.in).nets.get(inNet);
            let outGroup = groups.get(oldSignal.out).nets.get(outNet);

            let newSignal;
            for (const s of allSignals) {
                if (!inGroup.networkSignals.has(s) && !outGroup.networkSignals.has(s)) {
                    newSignal = s;
                    break;
                }
            }
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

        makeConnection(newColor, ...e.input.red, ...e.input.green, ...e.output.red, ...e.output.green);
        e.delete();

        count++;
    }

    console.log(`Removed ${count} combinators`);
    return count != 0;
}