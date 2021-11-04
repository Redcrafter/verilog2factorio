import * as assert from "assert";
import { signalV } from "../../entities/Entity.js";
import { createSimulator, Const } from "../simulator.js";

export async function testCollatz() {
    let sim = await createSimulator("./samples/collatz.v", "collatz");

    let clock = sim.ents[0] as Const;
    let start = sim.ents[1] as Const;
    let data = sim.ents[2] as Const;

    let val = sim.ents[3];

    function pulse() {
        sim.update(10);

        clock.outSig[0].value = 1;
        sim.update(1);
        clock.outSig[0].value = 0;

        sim.update(10);
    }

    for (let i = 0; i < 100; i++) {
        // TODO: test shouldn't be random
        let startValue = Math.floor(Math.random() * 0xFFFF)
        let expected = startValue;

        start.outSig[0].value = 1;
        data.outSig[0].value = expected;
        pulse();
        start.outSig[0].value = 0;

        for (let i = 0; expected != 1 && i < 10000; i++) {
            let result = val.getValue(signalV);

            assert.strictEqual(result, expected, `Start: ${startValue}, Step: ${i}`);

            if (expected & 1) {
                expected = (expected * 3 + 1) & 0xFFFF;
            } else {
                expected >>= 1;
            }

            pulse();
        }
    }
}
