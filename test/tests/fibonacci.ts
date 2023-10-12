import * as assert from "assert";
import { signalV } from "../../src/entities/Entity.js";
import { createSimulator, Const } from "../simulator.js";

export async function testFibonacci() {
    let sim = await createSimulator("./samples/fibonacci.v", "fibonacci");

    let clk = sim.ents[0] as Const;
    let rst = sim.ents[1] as Const;

    let a = sim.ents[2];
    let b = sim.ents[3];

    function pulse() {
        sim.update(10);

        clk.outSig[0].value = 1;
        sim.update(1);
        clk.outSig[0].value = 0;

        sim.update(10);
    }

    let aVal = 0;
    let bVal = 1;

    rst.outSig[0].value = 1;
    pulse();
    rst.outSig[0].value = 0;

    for (let i = 0; i < 40; i++) {
        assert.strictEqual(a.getValue(signalV), aVal);
        assert.strictEqual(b.getValue(signalV), bVal);

        [aVal, bVal] = [bVal, aVal + bVal];

        pulse();
    }
}
