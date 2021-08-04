import { logger } from "../logger.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
import { extractNets } from "./nets.js";
function eq(a, b) {
    if (a instanceof Arithmetic && b instanceof Arithmetic) {
        return a.params.first_signal == b.params.first_signal &&
            a.params.second_signal == b.params.second_signal &&
            a.params.first_constant == b.params.first_constant &&
            a.params.second_constant == b.params.second_constant &&
            a.params.operation == b.params.operation &&
            a.params.output_signal == b.params.output_signal;
    }
    else if (a instanceof Decider && b instanceof Decider) {
        return a.params.first_signal == b.params.first_signal &&
            a.params.second_signal == b.params.second_signal &&
            a.params.constant == b.params.constant &&
            a.params.comparator == b.params.comparator &&
            a.params.output_signal == b.params.output_signal &&
            a.params.copy_count_from_input == b.params.copy_count_from_input;
    }
    return false;
}
export function opt_merge(entities) {
    logger.log("Running opt_merge");
    let nets = extractNets(entities);
    // let asd = extractSignalGroups(entities, nets);
    for (const n of nets.red.nets) {
        let constants = [...n.points].filter(x => x.entity instanceof Constant);
        if (constants.length > 1)
            debugger;
    }
    let groups = new Map();
    for (const e of entities) {
        if (e instanceof Pole)
            continue;
        let rNet = nets.red.map.get(e.input);
        let gNet = nets.green.map.get(e.input);
        /*if (rNet?.hasOtherInputs(e.output) || gNet?.hasOtherInputs(e.output)) {
            if (e instanceof Arithmetic && e.params.operation == ArithmeticOperations.Or && e.params.second_constant == 0) {
                debugger;
            }
            continue;
        }*/
        let key = `${rNet?.id ?? 0}_${gNet?.id ?? 0}`;
        if (groups.has(key)) {
            groups.get(key).push(e);
        }
        else {
            groups.set(key, [e]);
        }
    }
    let total = 0;
    for (const [key, group] of groups) {
        if (group.length == 1)
            continue;
        for (let i = 0; i < group.length; i++) {
            let entity = group[i];
            let arNet = nets.red.map.get(entity.output);
            let agNet = nets.green.map.get(entity.output);
            for (let j = i + 1; j < group.length; j++) {
                let other = group[j];
                if (!eq(entity, other))
                    continue;
                let orNet = nets.red.map.get(other.output);
                let ogNet = nets.green.map.get(other.output);
                let doMerge = false;
                if (!arNet && !orNet) { // only green output
                    doMerge = !agNet.hasOtherInputs(entity.output) && !ogNet.hasOtherInputs(other.output);
                }
                else if (!agNet && !ogNet) { // only red output
                    doMerge = !arNet.hasOtherInputs(entity.output) && !orNet.hasOtherInputs(other.output);
                }
                if (doMerge) {
                    group.splice(j, 1);
                    entities.splice(entities.indexOf(other), 1);
                    j--;
                    // input networks are the same but we have to connect the individual enpoints to preven networks being split in half
                    makeConnection(1 /* Red */, ...other.input.red, entity.input);
                    makeConnection(2 /* Green */, ...other.input.green, entity.input);
                    makeConnection(1 /* Red */, entity.output, ...other.output.red);
                    makeConnection(2 /* Green */, entity.output, ...other.output.green);
                    other.delete();
                    total++;
                }
            }
        }
    }
    logger.log(`Removed ${total} combinators`);
    return total != 0;
}
