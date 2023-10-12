
import * as assert from "assert";
import { signalV } from "../../src/entities/Entity.js";
import { createSimulator, Const } from "../simulator.js";

let collatz = new Uint8Array([
    // 00000000 .text:
    0x13, 0x01, 0x00, 0x10, // addi sp, zero, 256
    // 00000004 main:
    0x13, 0x01, 0x01, 0xff, // addi sp, sp, -16
    0x23, 0x26, 0x11, 0x00, // sw ra, 12(sp)
    0x13, 0x05, 0x40, 0x01, // addi a0, zero, 20
    0xef, 0x00, 0xc0, 0x01, // jal ra, 28
    0xb7, 0x15, 0x00, 0x00, // lui a1, 1
    0x23, 0xa0, 0xa5, 0x00, // sw a0, 0(a1)
    0x13, 0x05, 0x00, 0x00, // mv a0, zero
    0x83, 0x20, 0xc1, 0x00, // lw ra, 12(sp)
    0x13, 0x01, 0x01, 0x01, // addi sp, sp, 16
    0x67, 0x80, 0x00, 0x00, // ret
    // 00000030 fib:
    0x93, 0x05, 0x10, 0x00, // addi a1, zero, 1
    0x63, 0x40, 0xb5, 0x02, // blt a0, a1, 32
    0x93, 0x06, 0x00, 0x00, // mv a3, zero
    0x13, 0x06, 0x10, 0x00, // addi a2, zero, 1
    0xb3, 0x85, 0xc6, 0x00, // add a1, a3, a2
    0x13, 0x05, 0xf5, 0xff, // addi a0, a0, -1
    0x93, 0x06, 0x06, 0x00, // mv a3, a2
    0x13, 0x86, 0x05, 0x00, // mv a2, a1
    0xe3, 0x18, 0x05, 0xfe, // bnez a0, -16
    0x13, 0x85, 0x05, 0x00, // mv a0, a1
    0x67, 0x80, 0x00, 0x00, // ret
]);

let aligned = new Int32Array(collatz.buffer);

export async function testRv32i() {
    let sim = await createSimulator("./samples/rv32i_cpu.sv", "rv32i_cpu");

    let clk = sim.ents[0] as Const;
    let reset = sim.ents[1] as Const;

    let program_data_bus = sim.ents[2] as Const;
    let program_addr_bus = 0;

    let mem_read_data_bus = sim.ents[4] as Const;
    let mem_write_data_bus = 0;

    let mem_write_signal = false;
    let mem_addr_bus = 0;

    let ram = new Int32Array(256);

    function clock() {
        program_addr_bus = sim.ents[3].getValue(signalV);
        mem_write_data_bus = sim.ents[5].getValue(signalV);
        mem_write_signal = !!sim.ents[6].getValue(signalV);
        mem_addr_bus = sim.ents[7].getValue(signalV);

        program_data_bus.outSig[0].value = aligned[program_addr_bus >> 2];
        mem_read_data_bus.outSig[0].value = aligned[mem_addr_bus >> 2];

        assert.ok(program_addr_bus / 4 < aligned.length, "program out of bounds");

        if (mem_write_signal) {
            if (mem_addr_bus == 0x1000) {
                assert.strictEqual(mem_write_data_bus, 10946);

                run = false;
                return;
            } else {
                ram[mem_addr_bus] = mem_write_data_bus;
            }
        }

        sim.update(20);

        clk.outSig[0].value = 1;
        sim.update(1);
        clk.outSig[0].value = 0;

        sim.update(20);
    }

    reset.outSig[0].value = 0;
    clock();
    reset.outSig[0].value = 1;

    let run = true;
    while (run) {
        clock();
    }
}
