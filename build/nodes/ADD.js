import { logger } from "../logger.js";
import { makeConnection } from "../entities/Entity.js";
import { createLimiter, Node } from "./Node.js";
export class ADD extends Node {
    limiter;
    data;
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
        logger.assert(item.type == "$add", "Only add allowed");
    }
    _connect(getInputNode) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);
        this.limiter = createLimiter(this.outMask);
        makeConnection(1 /* Red */, a.output(), this.limiter.input);
        makeConnection(2 /* Green */, b.output(), this.limiter.input);
        return this.limiter.output;
    }
    combs() {
        return [this.limiter];
    }
}
