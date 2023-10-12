import * as assert from "assert";
import { signalV } from "../../src/entities/Entity.js";
import { Const, createSimulator } from "../simulator.js";

// TODO: add bit width option

let unaryFuncs = [
    LNot,
    Neg,
    ReduceAnd,
    ReduceOr,
    ReduceNand,
    ReduceNor,
    UnaryPlus,
    // Merge
];

function LNot(A: number) {
    return !A;
}

function Neg(A: number) {
    return ~A
}

function ReduceAnd(A: number) {
    return A == -1;
}

function ReduceOr(A: number) {
    return A != 0;
}

function ReduceNand(A: number) {
    return A != -1;
}

function ReduceNor(A: number) {
    return A == 0;
}

function UnaryPlus(A: number) {
    return +A;
}

function Merge(A: number) {
    const bits = 8;

    let r = 0;
    for (let i = 0; i < bits; i++) {
        if (A & (1 << (bits - 1 - i))) r |= 1 << i;
    }
    return r;
}

export async function testUnary() {
    let testValues = [0, 1, -1, 2 ** 31 - 1, -(2 ** 31), 12345, 54321];

    for (const func of unaryFuncs) {
        let sim = await createSimulator("./samples/gates.v", func.name);

        let A = sim.ents[0] as Const;

        for (const val of testValues) {
            sim.reset();

            let expected = func(val);
            if (typeof expected == "boolean") {
                expected = expected ? 1 : 0;
            }

            A.outSig[0].value = val;
            sim.update(10);
            let actual = sim.ents[1].getValue(signalV);

            assert.strictEqual(actual, expected);
        }
    }
}

export async function testMerge() {
    let sim = await createSimulator("./samples/gates.v", "Merge");
    let A = sim.ents[0] as Const;

    for (let i = 0; i < 256; i++) {
        sim.reset();

        let expected = Merge(i);
        if (typeof expected == "boolean") {
            expected = expected ? 1 : 0;
        }

        A.outSig[0].value = i;
        sim.update(10);
        let actual = sim.ents[1].getValue(signalV);

        assert.strictEqual(actual, expected);
    }
}
