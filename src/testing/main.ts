import { testCollatz } from "./tests/collatz.js";
import { testFibonacci } from "./tests/fibonacci.js";
import { testRv32i } from "./tests/rv32i_cpu.js";
import { testSpiral } from "./tests/spiral.js";

let tests = [
    testCollatz,
    testFibonacci,
    testRv32i,
    testSpiral
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
