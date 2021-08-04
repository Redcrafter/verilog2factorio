import { logger } from "../logger.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { each } from "../entities/Entity.js";
import { extractNets } from "./nets.js";
function constNetwork(net, s) {
    if (!net || !net.signals.has(s))
        return 0;
    let val = 0;
    for (const end of net.points) {
        if (end.outSignals.has(s)) {
            if (end.entity.keep)
                return null;
            if (!(end.entity instanceof Constant))
                return null;
            val += end.entity.getValue(s);
        }
    }
    return val;
}
// TODO: check bit width
function calcConstArith(comb) {
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
function calcConstDecider(comb, a) {
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
function flipOperator(op) {
    switch (op) {
        case ComparatorString.LT: return ComparatorString.GT;
        case ComparatorString.LE: return ComparatorString.GE;
        case ComparatorString.GT: return ComparatorString.LT;
        case ComparatorString.GE: return ComparatorString.LE;
    }
    return op;
}
export function opt_const(entities) {
    logger.log("Running opt_const");
    let nets = extractNets(entities);
    let deleted = 0;
    let changed = 0;
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep)
            continue;
        function del() {
            e.delete();
            entities.splice(entities.indexOf(e), 1);
            i--;
            deleted++;
            rNet?.points.delete(e.input);
            gNet?.points.delete(e.input);
        }
        function delN(s) {
            if (rNet && !rNet.signals.has(s)) {
                rNet.points.delete(e.input);
                e.delCon(e.input, 1 /* Red */);
            }
            if (gNet && !gNet.signals.has(s)) {
                gNet.points.delete(e.input);
                e.delCon(e.input, 2 /* Green */);
            }
        }
        let rNet = nets.red.map.get(e.input);
        let gNet = nets.green.map.get(e.input);
        // let signals = new Set([...rNet.signals, ...gNet.signals]);
        if (e instanceof Constant) {
            if (e.params.every(x => x.count == 0)) {
                del();
            }
        }
        else if (e instanceof Arithmetic) {
            if (e.params.first_signal) {
                // TODO: don't skip each
                if (e.params.first_signal == each)
                    continue;
                let rVal = constNetwork(rNet, e.params.first_signal);
                let gVal = constNetwork(gNet, e.params.first_signal);
                if (rVal !== null && gVal !== null) {
                    e.params.first_signal = undefined;
                    e.params.first_constant = rVal + gVal;
                    changed++;
                    delN(e.params.second_signal);
                }
            }
            if (e.params.second_signal) {
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
                debugger;
                let val = calcConstArith(e);
                if (val == 0) {
                    del();
                }
                else {
                    // replace with constant
                    debugger;
                }
            }
        }
        else if (e instanceof Decider) {
            if (e.params.copy_count_from_input) {
                let rVal = constNetwork(rNet, e.params.output_signal);
                let gVal = constNetwork(gNet, e.params.output_signal);
                if (rVal !== null && gVal !== null && rVal + gVal == 0) {
                    del();
                }
                // TODO: don't skip copy
                continue;
            }
            if (e.params.second_signal) {
                let rVal = constNetwork(rNet, e.params.second_signal);
                let gVal = constNetwork(gNet, e.params.second_signal);
                if (rVal !== null && gVal !== null) {
                    e.params.second_signal = undefined;
                    e.params.constant = rVal + gVal;
                    changed++;
                    delN(e.params.first_signal);
                }
            }
            let rVal = constNetwork(rNet, e.params.first_signal);
            let gVal = constNetwork(gNet, e.params.first_signal);
            if (rVal === null || gVal === null)
                continue;
            if (e.params.second_signal) {
                e.params.first_signal = e.params.second_signal;
                e.params.second_signal = undefined;
                e.params.constant = rVal + gVal;
                e.params.comparator = flipOperator(e.params.comparator);
                changed++;
                delN(e.params.first_signal);
            }
            else {
                debugger;
                if (calcConstDecider(e, rVal + gVal)) {
                    // replace with passthrough
                    debugger;
                }
                else {
                    del();
                }
            }
        }
    }
    logger.log(`Removed ${deleted} combinators`);
    logger.log(`Changed ${changed} combinators`);
    return deleted != 0 && changed != 0;
}
