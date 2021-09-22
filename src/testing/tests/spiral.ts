import * as assert from "assert";
import { signalV } from "../../entities/Entity.js";
import { createSimulator, Const } from "../simulator.js";

function* generator() {
    let x = 0;
    let y = 0;

    let dir = 0;
    let len = 2;
    let j = 0;

    yield [x, y];

    while (true) {
        switch (dir) {
            case 0: x++; break;
            case 1: y++; break;
            case 2: x--; break;
            case 3: y--; break;
        }
        j++;
        if (j == (len >> 1)) {
            j = 0;
            dir = (dir + 1) % 4;
            len = len + 1;
        }

        yield [x, y];
    }
}

export async function testSpiral() {
    let sim = await createSimulator("./samples/spiral.v", "spiral");

    let clock = sim.ents[0] as Const;
    let reset = sim.ents[1] as Const;

    let xOut = sim.ents[2];
    let yOut = sim.ents[3];

    function pulse() {
        sim.update(10);

        clock.outSig[0].value = 1;
        sim.update(1);
        clock.outSig[0].value = 0;

        sim.update(10);
    }

    reset.outSig[0].value = 1;
    pulse();
    reset.outSig[0].value = 0;

    let gen = generator();

    for (let i = 0; i < 1000; i++) {
        let x = xOut.getValue(signalV);
        let y = yOut.getValue(signalV);

        let expected = gen.next().value as number[];
        assert.strictEqual(x, expected[0]);
        assert.strictEqual(y, expected[1]);

        pulse();
    }
}
