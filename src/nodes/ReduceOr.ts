import { ComparatorString, Decider } from "../entities/Decider.js";
import { UnaryCell } from "../yosys.js";
import { LogicNode } from "./LogicNode.js";

// TODO: make custom implementation
export class ReduceOr extends LogicNode {
    constructor(item: UnaryCell) {
        // @ts-ignore
        item.connections.B = ["0"];
        // @ts-ignore
        super(item, ComparatorString.NE);
    }
}
