import { logger } from "../logger.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { makeConnection, signalC, signalV } from "../entities/Entity.js";
import { createTransformer, Node } from "./Node.js";
export class MUX extends Node {
    data;
    entities;
    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }
    _connect(getInputNode) {
        const a = getInputNode(this.data.connections.A);
        const b = getInputNode(this.data.connections.B);
        const s = getInputNode(this.data.connections.S);
        logger.assert(this.data.connections.A.length == this.data.connections.B.length);
        logger.assert(this.data.connections.A.length == this.outputBits.length);
        logger.assert(this.data.connections.S.length == 1);
        let transformer = createTransformer(s.output());
        let decider1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output value
        let decider2 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 save input value
        this.entities = [transformer, decider1, decider2];
        makeConnection(1 /* Red */, a.output(), decider1.input);
        makeConnection(1 /* Red */, b.output(), decider2.input);
        makeConnection(2 /* Green */, transformer.output, decider1.input, decider2.input);
        makeConnection(3 /* Both */, decider1.output, decider2.output);
        return decider1.output;
    }
    combs() {
        return this.entities;
    }
}
