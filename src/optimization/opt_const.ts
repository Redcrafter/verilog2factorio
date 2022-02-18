import { SignalID } from "../blueprint.js";
import { logger } from "../logger.js";

import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, each, Entity, isSpecial } from "../entities/Entity.js";

import { Network } from "./nets.js";
import { options } from "../options.js";

//returns the number of constant combinators whit a given signal on the given network
//return null if there are active writers or in there is an input
function constNetwork(net: Network, s: SignalID) {
    if (!net || !net.signals.has(s)) return 0;

    let val = 0;

    for (const end of net.points) {
        if (end.outSignals.has(s)) {
            if (end.entity.keep) return null;
            if (!(end.entity instanceof Constant)) return null;

            val += end.entity.getValue(s);
        }
    }

    return val;
}

// TODO: check bit width
function calcConstArith(comb: Arithmetic) {
    let a = comb.params.first_constant;
    let b = comb.params.second_constant;

    switch (comb.params.operation) {
        case ArithmeticOperations.Mul: return a * b;
        case ArithmeticOperations.Div: return Math.floor(a / b);
        case ArithmeticOperations.Add: return a + b;
        case ArithmeticOperations.Sub: return a - b;
        case ArithmeticOperations.Mod: return a % b;
        case ArithmeticOperations.Pow: return a ** b;
        case ArithmeticOperations.LShift: return a << b;
        case ArithmeticOperations.RShift: return a >> b;
        case ArithmeticOperations.And: return a & b;
        case ArithmeticOperations.Or: return a | b;
        case ArithmeticOperations.Xor: return a ^ b;
    }

    throw new Error("unreachable");
}

function calcConstDecider(comb: Decider, a: number) {
    let b = comb.params.constant;

    switch (comb.params.comparator) {
        case ComparatorString.LT: return a < b;
        case ComparatorString.LE: return a <= b;
        case ComparatorString.GT: return a > b;
        case ComparatorString.GE: return a >= b;
        case ComparatorString.EQ: return a == b;
        case ComparatorString.NE: return a != b;
    }

    throw new Error("unreachable");
}

function flipOperator(op: ComparatorString) {
    switch (op) {
        case ComparatorString.LT: return ComparatorString.GT;
        case ComparatorString.LE: return ComparatorString.GE;
        case ComparatorString.GT: return ComparatorString.LT;
        case ComparatorString.GE: return ComparatorString.LE;
    }

    return op;
}

//constant folding
export function opt_const(entities: Entity[]) {
    if (options.verbose) logger.log("Running opt_const");

    let deleted = 0;
    let changed = 0;

    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep) continue;

        const rNet = e.input.red;
        const gNet = e.input.green;

        function del() { //delete current entity
            e.delete();
            entities.splice(entities.indexOf(e), 1);
            i--;
            deleted++;
        }
        function delN(s: SignalID) { //disconnect connection if the signal type is not present
            if (rNet && !rNet.signals.has(s)) e.delCon(e.input, Color.Red);
            if (gNet && !gNet.signals.has(s)) e.delCon(e.input, Color.Green);
        }

        // let signals = new Set([...rNet.signals, ...gNet.signals]);

        if (e instanceof Constant) {
            //delete constant combinator with no output
            if (e.params.every(x => x.count == 0)) {
                del();
            }
        } else if (e instanceof Arithmetic) {
            // TODO: don't skip each
            if (e.params.first_signal && e.params.first_signal !== each) {
                //move constant input into combinator for the first signal
                let rVal = constNetwork(rNet, e.params.first_signal);
                let gVal = constNetwork(gNet, e.params.first_signal);

                if (rVal !== null && gVal !== null) {
                    e.params.first_signal = undefined;
                    e.params.first_constant = rVal + gVal;
                    changed++;

                    delN(e.params.second_signal);
                }
            }

            if (e.params.second_signal && e.params.second_signal !== each) {
                //move constant input into combinator for the second signal
                let rVal = constNetwork(rNet, e.params.second_signal);
                let gVal = constNetwork(gNet, e.params.second_signal);

                if (rVal !== null && gVal !== null) {
                    e.params.second_signal = undefined;
                    e.params.second_constant = rVal + gVal;
                    changed++;

                    delN(e.params.first_signal);
                }
            }

            if (e.params.first_constant !== undefined && e.params.second_constant !== undefined) {
                //if combinator has no active parameter then replace it whit a constant combinator
                //or nothing if the result is zero
                if(isSpecial(e.params.output_signal)) {
                    debugger;
                    continue;
                }
                let val = calcConstArith(e);

                if (val == 0) {
                    del();
                } else {
                    // replace with constant
                    let c = new Constant({
                        index: 1,
                        count: val,
                        signal: e.params.output_signal
                    });
                    e.output.red?.add(c.output);
                    e.output.green?.add(c.output);

                    e.delete();
                    entities[i] = c;
                    changed++;
                }
            }
        } else if (e instanceof Decider) {
            if (e.params.copy_count_from_input) {
                //if copy input count is checked skip al other optimizations
                if(isSpecial(e.params.output_signal)) {
                    // debugger;
                } else {
                    let rVal = constNetwork(rNet, e.params.output_signal);
                    let gVal = constNetwork(gNet, e.params.output_signal);
    
                    //delete if the out put signal doesn't exist on the network
                    if (rVal !== null && gVal !== null && rVal + gVal == 0) {
                        del();
                    }
                }

                // TODO: don't skip copy
                continue;
            }

            if (e.params.second_signal) {
                let rVal = constNetwork(rNet, e.params.second_signal);
                let gVal = constNetwork(gNet, e.params.second_signal);

                //move constants inside combinator
                if (rVal !== null && gVal !== null) {
                    e.params.second_signal = undefined;
                    e.params.constant = rVal + gVal;
                    changed++;

                    delN(e.params.first_signal);
                }
            }

            let rVal = constNetwork(rNet, e.params.first_signal);
            let gVal = constNetwork(gNet, e.params.first_signal);

            if (rVal === null || gVal === null) continue;

            if (e.params.second_signal) {
                //if second signal is constant switch them and move it into the combinator
                e.params.first_signal = e.params.second_signal;
                e.params.second_signal = undefined;
                e.params.constant = rVal + gVal;
                e.params.comparator = flipOperator(e.params.comparator);
                changed++;

                delN(e.params.first_signal);
            } else {
                debugger;

                if (calcConstDecider(e, rVal + gVal)) {
                    //TODO: replace with passthrough
                    debugger;
                } else {
                    del();
                }
            }
        }
    }

    if (options.verbose) {
        logger.log(`Removed ${deleted} combinators`);
        logger.log(`Changed ${changed} combinators`);
    }

    return deleted != 0 || changed != 0;
}
