import { logger } from "../logger.js";
import { Dff, Dffe } from "../yosys.js";

import { ComparatorString, Decider } from "../entities/Decider.js";
import { Color, Entity, makeConnection, signalC, signalV } from "../entities/Entity.js";

import { Input } from "./Input.js";
import { createTransformer, Node, nodeFunc } from "./Node.js";

export class DFF extends Node {
    data: Dff | Dffe;

    entities: Entity[];

    constructor(item: Dff | Dffe) {
        super(item.connections.Q);
        this.data = item;

        logger.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        if (item.type == "$dffe")
            logger.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");
    }

    _connect(getInputNode: nodeFunc) {
        const clk = getInputNode(this.data.connections.CLK);
        const d = getInputNode(this.data.connections.D);

        if (!(clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }

        let transformer, inverter;
        if (this.data.type == "$dffe") {
            const en = getInputNode(this.data.connections.EN);

            transformer = new Decider({
                first_signal: signalV,
                constant: 2,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalC
            });

            if (this.data.parameters.EN_POLARITY == 0) {
                inverter = new Decider({
                    first_signal: signalV,
                    constant: 0,
                    comparator: ComparatorString.EQ,
                    copy_count_from_input: false,
                    output_signal: signalV
                });

                makeConnection(Color.Red, en.output(), inverter.input);
                makeConnection(Color.Green, inverter.output, transformer.input);
            } else {
                makeConnection(Color.Green, en.output(), transformer.input);
            }
        } else {
            transformer = createTransformer();
        }

        let decider1 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 output a
        let decider2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output b

        makeConnection(Color.Red, clk.output(), transformer.input);
        makeConnection(Color.Red, d.output(), decider1.input);

        makeConnection(Color.Green, transformer.output, decider1.input, decider2.input);
        makeConnection(Color.Both, decider1.output, decider2.output);
        makeConnection(Color.Red, decider2.output, decider2.input);

        this.entities = [transformer, decider1, decider2];

        if (inverter) this.entities.push(inverter);

        return decider1.output;
    }

    combs(): Entity[] { return this.entities; }
}
