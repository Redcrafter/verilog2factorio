import { testCollatz } from "./tests/collatz.js";
import { testSpiral } from "./tests/spiral.js";

let tests = [
    testSpiral,
    testCollatz
];

for (const t of tests) {
    try {
        await t();

        console.log(`Passed: ${t.name}`);
    } catch (e) {
        console.error(`Failed: ${t.name}`);
        console.error(e);
    }
}
