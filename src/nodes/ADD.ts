import { logger } from "../logger.js";
import { BinaryCell } from "../yosys.js";

import { Arithmetic } from "../entities/Arithmetic.js";
import { Color, makeConnection } from "../entities/Entity.js";

import { createLimiter, Node, nodeFunc } from "./Node.js";
import { ConstNode } from "./ConstNode.js";

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

        let params = this.data.parameters;

        if (params.A_WIDTH !== params.B_WIDTH) { // if different bit widths and the smaller one is signed it has to be extended
            if (params.A_WIDTH < params.B_WIDTH) {
                logger.assert(params.A_SIGNED == 0 || (a instanceof ConstNode && a.value >> (params.A_WIDTH - 1) == 0), "sign extend number");
            } else {
                logger.assert(params.B_SIGNED == 0 || (b instanceof ConstNode && b.value >> (params.B_WIDTH - 1) == 0), "sign extend number");
            }
        }

        this.limiter = createLimiter(this.outMask);

        makeConnection(Color.Red, a.output(), this.limiter.input);
        makeConnection(Color.Green, b.output(), this.limiter.input);

        return this.limiter.output;
    }

    override combs() {
        return [this.limiter];
    }
}
