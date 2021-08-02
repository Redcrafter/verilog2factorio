import { Arithmetic } from "../entities/Arithmetic.js";
import { Decider } from "../entities/Decider.js";
import { Color, Entity, makeConnection } from "../entities/Entity.js";
import { Pole } from "../entities/Pole.js";
import { extractNets } from "./nets.js";

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

export function opt_merge(entities: Entity[]) {
    console.log("Running opt_merge");

    let nets = extractNets(entities);
    // let asd = extractSignalGroups(entities, nets);

    let groups = new Map<string, Entity[]>();
    for (const e of entities) {
        if (e instanceof Pole) continue;

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
        } else {
            groups.set(key, [e]);
        }
    }

    let valid = [...groups.values()].filter(x => x.length > 1);

    let total = 0;
    // for (const [key, n] of groups) {
    //     if (n.length == 1) continue;
    for (const group of valid) {

        for (let i = 0; i < group.length; i++) {
            let entity = group[i];

            let arNet = nets.red.map.get(entity.output);
            let agNet = nets.green.map.get(entity.output);

            for (let j = i + 1; j < group.length; j++) {
                let other = group[j];

                let orNet = nets.red.map.get(other.output);
                let ogNet = nets.green.map.get(other.output);

                if (!eq(entity, other)) continue;

                let doMerge = false;
                if (!arNet && !orNet) { // only green output
                    doMerge = !agNet.hasOtherInputs(entity.output) && !ogNet.hasOtherInputs(other.output);
                } else if (!agNet && !ogNet) { // only red output
                    doMerge = !arNet.hasOtherInputs(entity.output) && !orNet.hasOtherInputs(other.output);
                } else {
                    debugger;
                }

                if (doMerge) {
                    group.splice(j, 1);
                    entities.splice(entities.indexOf(other), 1);
                    j--;

                    other.delete();
                    makeConnection(Color.Red, entity.output, ...other.output.red);
                    makeConnection(Color.Green, entity.output, ...other.output.green);

                    total++;
                }

            }
        }
    }

    console.log(`Removed ${total} combinators\n`);
}
