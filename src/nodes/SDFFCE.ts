import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { Color, Entity, makeConnection, signalC, signalR, signalV } from "../entities/Entity.js";
import { Node, nodeFunc } from "./Node.js";
import { Input } from "./Input.js";
import { SDffe } from "../yosys.js";


export class SDFFCE extends Node {
    data: SDffe;

    clk: Node;
    en: Node;
    d: Node;
    srst: Node;

    transformer: Decider;
    dff1: Decider;
    dff2: Decider;
    arith: Arithmetic;

    srstInv: Decider;

    constructor(item: SDffe) {
        super(item.connections.Q);
        this.data = item;

        console.assert(item.parameters.SRST_VALUE == 0, "reset value != 0");
        console.assert(item.parameters.CLK_POLARITY == 1, "revert clk polarity");
        console.assert(item.parameters.EN_POLARITY == 1, "revert enable polarity");

        // pretty lazy just invert the signal
        if(item.parameters.SRST_POLARITY == 1) {
            this.srstInv = new Decider({
                first_signal: signalV,
                constant: 0,
                comparator: ComparatorString.EQ,
                copy_count_from_input: false,
                output_signal: signalV
            });
        }
    }

    connect(getInputNode: nodeFunc) {
        this.clk = getInputNode(this.data.connections.CLK);
        this.d = getInputNode(this.data.connections.D);
        this.en = getInputNode(this.data.connections.EN);
        this.srst = getInputNode(this.data.connections.SRST);

        if (!(this.clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }

        this.transformer = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        }); // if c + en == 2
        this.dff1 = new Decider({
            first_signal: signalC,
            constant: 1,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 1 output a
        this.dff2 = new Decider({
            first_signal: signalC,
            second_signal: signalR,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        }); // if c == 0 output b
        this.arith = new Arithmetic({
            first_signal: signalV,
            second_signal: signalC,
            operation: ArithmeticOperations.And,
            output_signal: signalR
        }); // if c + en + srst
    }

    connectComb() {
        makeConnection(Color.Red, this.clk.output(), this.transformer.input);
        makeConnection(Color.Green, this.en.output(), this.transformer.input);

        makeConnection(Color.Green, this.transformer.output, this.dff1.input, this.dff2.input, this.arith.output);

        makeConnection(Color.Red, this.d.output(), this.dff1.input);

        makeConnection(Color.Both, this.dff1.output, this.dff2.output);
        makeConnection(Color.Red, this.dff2.output, this.dff2.input);

        if(this.srstInv) {
            makeConnection(Color.Red, this.srst.output(), this.srstInv.input);
            makeConnection(Color.Red, this.srstInv.output, this.arith.input);
        } else {
            makeConnection(Color.Red, this.srst.output(), this.arith.input);
        }
        makeConnection(Color.Green, this.transformer.output, this.arith.input);
    }

    output() {
        return this.dff1.output;
    }

    combs(): Entity[] { 
        let ret = [this.transformer, this.dff1, this.dff2, this.arith]; 
        if(this.srstInv) ret.push(this.srstInv);
        return ret;
    }
}
