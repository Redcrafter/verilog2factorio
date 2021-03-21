import { Endpoint, Entity } from "../entities/Entity.js";

type func = (n: number[]) => Node;

export abstract class Node {
    outputBits: number[];
    outMask: number;

    constructor(bits: number[]) {
        this.outputBits = bits;
        this.outMask = (1 << bits.length) - 1;
    }

    connect(getInputNode: func) { }

    abstract createComb(): void;
    abstract connectComb(): void;
    abstract output(): Endpoint;
    abstract combs(): Entity[];
}

/* TODO:
class PMUX extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);
        this.s = getInputNode(this.data.connections.S);

        this.a.dependent.push(this);
        this.b.dependent.push(this);
        this.s.dependent.push(this);
    }

    get value() {
        let val = Math.log2(this.s.value);

        if (val == 0) {
            return this.a.value;
        }

        // TODO: test if this is right?
        return (this.b.value >> (this.data.parameters.WIDTH * (val - 1))) & this.outMask;
    }
}

class EQ extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);

        this.a.dependent.push(this);
        this.b.dependent.push(this);
    }

    get value() {
        return (this.a.value == this.b.value) & 1;
    }
}

class GE extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);

        this.a.dependent.push(this);
        this.b.dependent.push(this);
    }

    get value() {
        return (this.a.value >= this.b.value) & 1;
    }
}

class AND extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);

        this.a.dependent.push(this);
        this.b.dependent.push(this);
    }

    get value() {
        return this.a.value & this.b.value;
    }
}

class OR extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.b = getInputNode(this.data.connections.B);

        this.a.dependent.push(this);
        this.b.dependent.push(this);
    }

    get value() {
        return this.a.value | this.b.value;
    }
}

class LNot extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.a.dependent.push(this);
    }

    get value() {
        return !this.a.value;
    }
}

class Not extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.a.dependent.push(this);
    }

    get value() {
        return (~this.a.value) & this.outMask;
    }
}

class ReduceOr extends Node {
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);
        this.a.dependent.push(this);
    }

    get value() {
        let out = 0;
        let val = this.a.value;

        for (let i = 0; i < this.data.parameters.A_WIDTH; i++) {
            out |= (val >> i) & 1;
        }
        return out;
    }
}*/