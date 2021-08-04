import { logger } from "../logger.js";
import { BinaryCell } from "../yosys.js";

import { Arithmetic } from "../entities/Arithmetic.js";
import { Color, makeConnection } from "../entities/Entity.js";

import { createLimiter, Node, nodeFunc } from "./Node.js";

export class ADD extends Node {
    limiter: Arithmetic;

    data: BinaryCell;

    constructor(item: BinaryCell) {
        super(item.connections.Y);
        this.data = item;

        logger.assert(item.type == "$add", "Only add allowed");
    }

    _connect(getInputNode: nodeFunc) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);

        this.limiter = createLimiter(this.outMask);

        makeConnection(Color.Red, a.output(), this.limiter.input);
        makeConnection(Color.Green, b.output(), this.limiter.input);

        return this.limiter.output;
    }

    override combs() {
        return [this.limiter];
    }
}
