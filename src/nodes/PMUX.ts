import { Arithmetic } from "../entities/Arithmetic.js";
import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, Endpoint, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { PMux } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { createLimiter, createTransformer, Node, nodeFunc, mergeFunc } from "./Node.js";
import { MergeEl } from "./MergeNode.js";

// https://github.com/YosysHQ/yosys/blob/master/techlibs/common/pmux2mux.v
// s should be one hot encoded. If not errors will occur
export class PMUX extends Node {
    data: PMux;

    a: Node;
    b: Node[];
    s: MergeEl[];

    default: Decider;
    transformers: Arithmetic[];
    comparers: Decider[];
    // not really required but safer
    limiter: Arithmetic;

    constructor(item: PMux) {
        super(item.connections.Y);
        this.data = item;
    }

    connect(getInputNode: nodeFunc, getMergeEls: mergeFunc) {
        this.a = getInputNode(this.data.connections.A);

        let width = this.data.parameters.WIDTH;
        let s_width = this.data.parameters.S_WIDTH;

        this.b = new Array(s_width);
        for (let i = 0; i < s_width; i++) {
            this.b[i] = getInputNode(this.data.connections.B.slice(i * width, (i + 1) * width));
        }

        this.s = getMergeEls(this.data.connections.S);

        this.createComb();
    }

    createComb(): void {
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

        this.limiter = createLimiter(this.outMask);

        this.transformers = new Array(this.s.length);
        this.comparers = new Array(this.b.length);

        let bIndex = 0;
        for (let i = 0; i < this.s.length; i++) {
            const item = this.s[i];
            console.assert(item.start == 0);
            console.assert(item.start + item.count == item.node.outputBits.length);

            let trans = this.transformers[i] = createTransformer();
            if (this.default)
                makeConnection(Color.Red, trans.output, this.default.input);

            for (let j = 0; j < item.count; j++) {
                const element = this.b[bIndex++];
                if (element instanceof ConstNode) {
                    if (element.value == 0) continue;
                    element.forceCreate();
                }

                let comp = new Decider({
                    first_signal: signalC,
                    constant: 1 << j,
                    comparator: ComparatorString.EQ,
                    copy_count_from_input: true,
                    output_signal: signalV
                });
                this.comparers[bIndex - 1] = comp;

                makeConnection(Color.Green, trans.output, comp.input);
                makeConnection(Color.Red, comp.output, this.limiter.input);
            }
        }
    }

    connectComb(): void {
        if (this.default) {
            makeConnection(Color.Green, this.a.output(), this.default.input);
            makeConnection(Color.Red, this.default.output, this.limiter.input);
        }

        for (let i = 0; i < this.s.length; i++) {
            makeConnection(Color.Red, this.s[i].node.output(), this.transformers[i].input);
        }

        for (let i = 0; i < this.b.length; i++) {
            let el = this.comparers[i];

            if (!el) continue;
            makeConnection(Color.Red, this.b[i].output(), el.input);
        }
    }

    output(): Endpoint {
        return this.limiter.output;
    }

    combs(): Entity[] {
        let res: Entity[] = [this.limiter];

        if (this.default) res.push(this.default);
        res.push(...this.transformers);
        res.push(...this.comparers.filter(x => x !== undefined));

        return res;
    }
}
