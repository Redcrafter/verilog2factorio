import { ComparatorString, Decider } from "../entities/Decider.js";
import { UnaryCell } from "../yosys.js";
import { Color, Endpoint, Entity, makeConnection, signalV } from "../entities/Entity.js";
import { MergeEl } from "./MergeNode.js";
import { mergeFunc, Node, nodeFunc } from "./Node.js";
import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";

export class ReduceOr extends Node {
    data: UnaryCell;
    els: MergeEl[];

    elements: Entity[];
    out: Entity;

    constructor(data: UnaryCell) {
        super(data.connections.Y);
        this.data = data;

        console.assert(data.connections.Y.length == 1);
    }

    connect(getInputNode: nodeFunc, getMergeEls: mergeFunc) {
        this.els = getMergeEls(this.data.connections.A);
    }

    createComb(): void {
        let maxVal = 0;
        this.elements = new Array(this.els.length);
        for (let i = 0; i < this.els.length; i++) {
            const item = this.els[i];

            maxVal += (2 ** item.count) * 1;
            this.elements[i] = new Arithmetic({
                first_signal: signalV,
                second_constant: ((1 << item.count) - 1) << item.start,
                operation: ArithmeticOperations.And,
                output_signal: signalV
            });
        }

        let maxBits = Math.floor(Math.log2(maxVal)) + 1;
        console.assert(maxBits < 32, "Reduce or overflow");

        if (this.els.length > 1) {
            this.out = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.NE,
                copy_count_from_input: false,
                output_signal: signalV
            });

            for (let i = 0; i < this.els.length; i++) {
                makeConnection(Color.Red, this.elements[i].output, this.out.input);
            }
        } else {
            this.out = this.elements[0];
        }
    }

    connectComb(): void {
        for (let i = 0; i < this.els.length; i++) {
            makeConnection(Color.Red, this.els[i].node.output(), this.elements[i].input);
        }
    }
    output(): Endpoint {
        return this.out.output;
    }
    combs(): Entity[] {
        let ret = [];
        for (const item of this.elements) {
            ret.push(item);
        }
        if(this.elements.length > 1) ret.push(this.out);
        return ret;
    }
}
