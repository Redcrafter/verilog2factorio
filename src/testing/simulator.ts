import { ConnectionData, SignalID } from "../blueprint.js";
import { buildGraph } from "../parser.js";
import { genNetlist } from "../yosys.js";

import { ArithmeticCombinator, ArithmeticOperations } from "../entities/Arithmetic.js";
import { ConstantCombinator } from "../entities/Constant.js";
import { ComparatorString, DeciderCombinator } from "../entities/Decider.js";
import { anything, each, everything } from "../entities/Entity.js";
import { MediumElectricPole } from "../entities/Pole.js";

import { optimize } from "../optimization/optimize.js";

interface Signal {
    value: number;
    type: SignalID;
}

interface SimEnd {
    ent: SimEnt;
    isOut: boolean;

    red: SimNet;
    green: SimNet;
}

type conFun = (col: "red" | "green", a: SimEnd, b: SimEnd) => void;

abstract class SimEnt {
    in: SimEnd;
    out: SimEnd;

    getValue(s: SignalID) {
        return ((this.in.red?.getValue(s) ?? 0) + (this.in.green?.getValue(s) ?? 0)) | 0;
    }

    abstract connect(getEnd: (d: ConnectionData) => SimEnd, makeCon: conFun): void;

    abstract update(): void;
    abstract getOut(): Signal[];
}

class Arith extends SimEnt {
    outSig: Signal;
    data: ArithmeticCombinator;

    constructor(data: ArithmeticCombinator) {
        super();

        this.in = { ent: this, green: null, red: null, isOut: false };
        this.out = { ent: this, green: null, red: null, isOut: true };

        this.data = data;

        let a = this.data.control_behavior.arithmetic_conditions.first_signal;
        let b = this.data.control_behavior.arithmetic_conditions.second_signal;

        console.assert(a !== anything && a !== everything);
        console.assert(b !== each && b !== anything && b !== everything);

        this.outSig = {
            type: this.data.control_behavior.arithmetic_conditions.output_signal,
            value: 0
        }
    }

    connect(getEnd: (d: ConnectionData) => SimEnd, makeCon: conFun) {
        const con = this.data.connections;

        for (const el of con[1].red) {
            makeCon("red", this.in, getEnd(el));
        }
        for (const el of con[1].green) {
            makeCon("green", this.in, getEnd(el));
        }

        for (const el of con[2].red) {
            makeCon("red", this.out, getEnd(el));
        }
        for (const el of con[2].green) {
            makeCon("green", this.out, getEnd(el));
        }
    }

    update() {
        const cond = this.data.control_behavior.arithmetic_conditions;

        let res = 0;

        let b: number;
        if (cond.second_signal) {
            b = this.getValue(cond.second_signal);
        } else {
            b = cond.second_constant;
        }

        if (cond.first_signal == each) {
            let signals = new Map<SignalID, number>();
            this.in.red?.getAll(signals);
            this.in.green?.getAll(signals);

            for (const [k, v] of signals) {
                res = (res + this.doOp(v, b)) | 0;
            }
        } else {
            let a: number;
            if (cond.first_signal) {
                a = this.getValue(cond.first_signal);
            } else {
                a = cond.first_constant;
            }

            res = this.doOp(a, b);
        }

        this.outSig.value = res;
    }

    doOp(a: number, b: number) {
        switch (this.data.control_behavior.arithmetic_conditions.operation) {
            case ArithmeticOperations.Mul: return (a * b) | 0;
            case ArithmeticOperations.Div: return (a / b) | 0;
            case ArithmeticOperations.Add: return (a + b) | 0;
            case ArithmeticOperations.Sub: return (a - b) | 0;
            case ArithmeticOperations.Mod: return (a % b) | 0;
            case ArithmeticOperations.Pow: return (a ** b) | 0;
            case ArithmeticOperations.LShift: return (a << b) | 0;
            case ArithmeticOperations.RShift: return (a >> b) | 0;
            case ArithmeticOperations.And: return (a & b) | 0;
            case ArithmeticOperations.Or: return (a | b) | 0;
            case ArithmeticOperations.Xor: return (a ^ b) | 0;
        }
    }

    getOut() { return [this.outSig]; }
}

class Decider extends SimEnt {
    outSig: Signal;
    data: DeciderCombinator;

    constructor(data: DeciderCombinator) {
        super();

        this.in = { ent: this, green: null, red: null, isOut: false };
        this.out = { ent: this, green: null, red: null, isOut: true };

        this.data = data;

        let a = this.data.control_behavior.decider_conditions.first_signal;
        let b = this.data.control_behavior.decider_conditions.second_signal;

        console.assert(a !== each && a !== anything && a !== everything);
        console.assert(b !== each && b !== anything && b !== everything);

        this.outSig = {
            type: this.data.control_behavior.decider_conditions.output_signal,
            value: 0
        }
    }

    connect(getEnd: (d: ConnectionData) => SimEnd, makeCon: conFun) {
        const con = this.data.connections;

        for (const el of con[1].red) {
            makeCon("red", this.in, getEnd(el));
        }
        for (const el of con[1].green) {
            makeCon("green", this.in, getEnd(el));
        }

        for (const el of con[2].red) {
            makeCon("red", this.out, getEnd(el));
        }
        for (const el of con[2].green) {
            makeCon("green", this.out, getEnd(el));
        }
    }

    update() {
        const cond = this.data.control_behavior.decider_conditions;

        let a = this.getValue(cond.first_signal);

        let b: number;
        if (cond.second_signal) {
            b = this.getValue(cond.second_signal);
        } else {
            b = cond.constant;
        }

        let res;
        switch (cond.comparator) {
            case ComparatorString.LT: res = a < b; break;
            case ComparatorString.LE: res = a <= b; break;
            case ComparatorString.GT: res = a > b; break;
            case ComparatorString.GE: res = a >= b; break;
            case ComparatorString.EQ: res = a == b; break;
            case ComparatorString.NE: res = a != b; break;
        }

        if (res) {
            if (cond.copy_count_from_input) {
                this.outSig.value = this.getValue(cond.output_signal);
            } else {
                this.outSig.value = 1;
            }
        } else {
            this.outSig.value = 0;
        }
    }

    getOut() { return [this.outSig]; }
}

export class Const extends SimEnt {
    outSig: Signal[];
    data: ConstantCombinator;

    constructor(data: ConstantCombinator) {
        super();

        this.in = this.out = { ent: this, green: null, red: null, isOut: true };

        this.data = data;
        this.outSig = data.control_behavior.filters.map(x => ({
            value: x.count,
            type: x.signal
        }));
    }

    connect(getEnd: (d: ConnectionData) => SimEnd, makeCon: conFun) {
        const con = this.data.connections;

        for (const el of con[1].red) {
            makeCon("red", this.out, getEnd(el));
        }
        for (const el of con[1].green) {
            makeCon("green", this.out, getEnd(el));
        }
    }

    update() { }

    getOut() { return this.outSig; }
}

class Pole extends SimEnt {
    data: MediumElectricPole;

    constructor(data: MediumElectricPole) {
        super();
        this.in = this.out = { ent: this, green: null, red: null, isOut: false };

        this.data = data;
    }

    connect(getEnd: (d: ConnectionData) => SimEnd, makeCon: conFun) {
        const con = this.data.connections;

        for (const el of con[1].red) {
            makeCon("red", this.in, getEnd(el));
        }
        for (const el of con[1].green) {
            makeCon("green", this.in, getEnd(el));
        }
    }

    update() { }
    getOut(): Signal[] { return []; }
}

class SimNet {
    private allEnts = new Set<SimEnd>();
    private map = new Map<SignalID, number>();
    private outEnts = new Set<SimEnt>();

    color: "red" | "green";

    constructor(color: "red" | "green") {
        this.color = color;
    }

    add(e: SimEnd) {
        if (e[this.color] === this) return;
        if (e[this.color]) throw new Error(); // should not happen

        if (e.isOut) {
            this.outEnts.add(e.ent);
        }

        this.allEnts.add(e);
        e[this.color] = this;
    }

    update() {
        this.map.clear();
        for (const ent of this.outEnts) {
            let out = ent.getOut();

            for (const s of out) {
                this.map.set(s.type, (this.map.get(s.type) ?? 0) + s.value);
            }
        }
    }

    getAll(signals: Map<SignalID, number>) {
        for (const [key, val] of this.map) {
            signals.set(key, (signals.get(key) ?? 0) + val);
        }
    }

    static merge(a: SimNet, b: SimNet) {
        console.assert(a.color == b.color);
        let n = new SimNet(a.color);

        for (const p of a.allEnts) {
            p[a.color] = null;
            n.add(p);
        }
        for (const p of b.allEnts) {
            p[a.color] = null;
            n.add(p);
        }

        return n;
    }

    getValue(signal: SignalID) { return this.map.get(signal); }
}

class Simulator {
    nets: Set<SimNet>;
    ents: SimEnt[];

    constructor(nets: Set<SimNet>, ents: SimEnt[]) {
        this.nets = nets;
        this.ents = ents;
    }

    update(cycles = 1) {
        for (let i = 0; i < cycles; i++) {
            for (const n of this.nets) {
                n.update();
            }

            for (const e of this.ents) {
                e.update();
            }
        }
    }
}

export async function createSimulator(file: string, moduleName: string) {
    const data = await genNetlist([file]);

    let module = data.modules[moduleName];
    if (!module) {
        throw new Error(`error: Module ${moduleName} not found`);
    }

    const graph = buildGraph(module);

    let combs = graph.nodes.flatMap(x => x.combs());

    optimize(combs);

    // assign entity id's
    for (let i = 0; i < combs.length; i++) {
        combs[i].id = i + 1;
    }

    const entities = combs.map(x => x.toObj()); // return list of entities

    let simEnts: SimEnt[] = [];
    let idMap = new Map<number, SimEnt>();
    let nets = new Set<SimNet>();

    for (const e of entities) {
        let el;
        switch (e.name) {
            case "arithmetic-combinator": el = new Arith(e); break;
            case "constant-combinator": el = new Const(e); break;
            case "decider-combinator": el = new Decider(e); break;
            case "medium-electric-pole": el = new Pole(e); break;
        }
        idMap.set(e.entity_number, el);
        simEnts.push(el);
    }

    function getEnd(d: ConnectionData) {
        if (d.circuit_id == 1) {
            return idMap.get(d.entity_id).in;
        } else if (d.circuit_id == 2) {
            return idMap.get(d.entity_id).out;
        } else {
            throw new Error("circuit_id not set");
        }
    }

    function makeCon(col: "red" | "green", a: SimEnd, b: SimEnd) {
        let an = a[col];
        let bn = b[col];

        let net: SimNet;
        if (an && bn) {
            net = SimNet.merge(an, bn);
            nets.delete(an);
            nets.delete(bn);
            nets.add(net);
        } else if (an) net = an;
        else if (bn) net = bn;
        else {
            net = new SimNet(col);
            nets.add(net);
        }

        net.add(a);
        net.add(b);
    }

    for (const e of simEnts) {
        e.connect(getEnd, makeCon);
    }

    return new Simulator(nets, simEnts);
}
