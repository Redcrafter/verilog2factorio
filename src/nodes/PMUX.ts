import { Arithmetic } from "../entities/Arithmetic.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { ConstNode } from "./ConstNode.js";
import { createLimiter, createTransformer, Node } from "./Node.js";

// https://github.com/YosysHQ/yosys/blob/master/techlibs/common/pmux2mux.v
// s should be one hot encoded. If not errors will occur
export class PMUX extends Node {
    data: any;

    a: Node;
    b: Node[] = [];
    s: Node;

    tranformer: Arithmetic;
    default: Decider;
    other: Decider[];
    // not really required but safer
    limiter: Arithmetic;

    constructor(item) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode) {
        this.a = getInputNode(this.data.connections.A);

        let width = parseInt(this.data.parameters.WIDTH, 2);
        let s_width = parseInt(this.data.parameters.S_WIDTH, 2);

        for (let i = 0; i < s_width; i++) {
            this.b.push(getInputNode(this.data.connections.B.slice(i * width, (i + 1) * width)));
        }

        this.s = getInputNode(this.data.connections.S);
    }

    createComb(): void {
        this.tranformer = createTransformer();

        this.default = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });

        // if a is constant can be ignored
        if (this.a instanceof ConstNode) {
            if (this.a.value == 0) {
                // can be ignored
                this.default = null;
            } else {
                this.a.forceCreate();
            }
        }

        this.other = new Array(this.b.length);
        for (let i = 0; i < this.b.length; i++) {
            let el = this.b[i];

            this.other[i] = new Decider({
                first_signal: signalC,
                constant: 1 << i,
                comparator: ComparatorString.EQ,
                copy_count_from_input: true,
                output_signal: signalV
            });

            if (el instanceof ConstNode) {
                if (el.value != 0) {
                    el.forceCreate();
                } else {
                    this.other[i] = null;
                }
            }
        }

        this.limiter = createLimiter(this.outMask);
    }

    connectComb(): void {
        makeConnection(Color.Red, this.s.output(), this.tranformer.input);
        if (this.default) {
            makeConnection(Color.Red, this.a.output(), this.default.input);
            makeConnection(Color.Green, this.tranformer.output, this.default.input);
            makeConnection(Color.Red, this.default.output, this.limiter.input);
        }

        let lastGreen = this.tranformer.output;
        let lastOut = this.limiter.input;

        for (let i = 0; i < this.b.length; i++) {
            let el = this.other[i];
            if (!el) continue;
            makeConnection(Color.Red, this.b[i].output(), el.input);

            makeConnection(Color.Red, el.output, lastOut);
            lastOut = el.output;

            makeConnection(Color.Green, lastGreen, el.input);
            lastGreen = el.input;
        }
    }

    output(): Endpoint {
        return this.limiter.output;
    }

    combs(): Entity[] {
        let res: Entity[] = [this.tranformer, this.limiter];
        if (this.default) res.push(this.default);
        for (const item of this.other) {
            if (item) res.push(item);
        }
        return res;
    }
}
