import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";
import { PMux } from "../yosys.js";
import { ConstNode } from "./ConstNode.js";
import { createLimiter, createTransformer, Node, nodeFunc, mergeFunc } from "./Node.js";

// https://github.com/YosysHQ/yosys/blob/master/techlibs/common/pmux2mux.v
// s should be one hot encoded. If not errors will occur
export class PMUX extends Node {
    data: PMux;

    entities: Entity[] = [];

    constructor(item: PMux) {
        super(item.connections.Y);
        this.data = item;
    }

    _connect(getInputNode: nodeFunc, getMergeEls: mergeFunc) {
        const a = getInputNode(this.data.connections.A);

        let width = this.data.parameters.WIDTH;
        let s_width = this.data.parameters.S_WIDTH;

        const b = new Array<Node>(s_width);
        for (let i = 0; i < s_width; i++) {
            b[i] = getInputNode(this.data.connections.B.slice(i * width, (i + 1) * width));
        }

        const s = getMergeEls(this.data.connections.S);

        let limiter = createLimiter(this.outMask);
        this.entities.push(limiter);

        let def = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });

        makeConnection(Color.Green, a.output(), def.input);
        makeConnection(Color.Red, def.output, limiter.input);
        this.entities.push(def);

        let bIndex = 0;
        for (let i = 0; i < s.length; i++) {
            const item = s[i];
            console.assert(item.start == 0);
            console.assert(item.start + item.count == item.node.outputBits.length);

            // output might not be connected but idc
            let trans = createTransformer(item.node.output());
            this.entities.push(trans);
            makeConnection(Color.Red, trans.output, def.input);

            for (let j = 0; j < item.count; j++) {
                const element = b[bIndex++];

                let comp = new Decider({
                    first_signal: signalC,
                    constant: 1 << j,
                    comparator: ComparatorString.EQ,
                    copy_count_from_input: true,
                    output_signal: signalV
                });

                makeConnection(Color.Red, element.output(), comp.input);

                this.entities.push(comp);

                makeConnection(Color.Green, trans.output, comp.input);
                makeConnection(Color.Red, comp.output, limiter.input);
            }
        }


        return limiter.output;
    }

    combs(): Entity[] {
        return this.entities;
    }
}
