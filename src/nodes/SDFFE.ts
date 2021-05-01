import { Arithmetic, ArithmeticOperations } from "../entities/Arithmetic.js";
import { Decider, ComparatorString } from "../entities/Decider.js";
import { Endpoint, Entity, signalV, signalC, makeConnection, Color } from "../entities/Entity.js";
import { createTransformer, Node } from "./Node.js";
import { Input } from "./Input.js";
import { ConstNode } from "./ConstNode.js";
import { SDffe } from "../yosys.js";


export class SDFFE extends Node {
    data: SDffe;
    rstVal: number;

    clk: Node;
    en: Node;
    d: Node;
    srst: Node;

    constructor(item: SDffe) {
        super(item.connections.Q);
        this.data = item;

        this.rstVal = parseInt(item.parameters.SRST_VALUE, 2);

        console.assert(parseInt(item.parameters.CLK_POLARITY, 2) == 1, "revert clk polarity");
        console.assert(parseInt(item.parameters.EN_POLARITY, 2) == 1, "revert enable polarity");
        console.assert(parseInt(item.parameters.SRST_POLARITY, 2) == 1, "revert reset polarity");
    }

    connect(getInputNode) {
        this.clk = getInputNode(this.data.connections.CLK);
        this.d = getInputNode(this.data.connections.D);
        this.en = getInputNode(this.data.connections.EN);
        this.srst = getInputNode(this.data.connections.SRST);

        if (!(this.clk instanceof Input)) {
            // need an edge detector
            throw new Error("Not implemented");
        }
    }

    clk1: Decider;
    clk2: Decider;
    dff1: Decider;
    dff2: Decider;
    rst: Arithmetic;
    sel1: Decider;
    sel2: Arithmetic;

    createComb(): void {
        this.clk1 = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.clk2 = new Decider({
            first_signal: signalV,
            constant: 2,
            comparator: ComparatorString.EQ,
            copy_count_from_input: false,
            output_signal: signalC
        });
        this.dff1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        this.dff2 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.NE,
            copy_count_from_input: true,
            output_signal: signalV
        });
        this.rst = createTransformer();
        this.sel1 = new Decider({
            first_signal: signalC,
            constant: 0,
            comparator: ComparatorString.EQ,
            copy_count_from_input: true,
            output_signal: signalV
        });
        if (this.rstVal != 0) {
            this.sel2 = new Arithmetic({
                first_constant: this.rstVal,
                second_signal: signalC,
                operation: ArithmeticOperations.Mul,
                output_signal: signalV
            });
        }
        if (this.d instanceof ConstNode) {
            this.d.forceCreate();
        }
    }
    connectComb(): void {
        makeConnection(Color.Red, this.clk.output(), this.clk1.input, this.clk2.input);
        makeConnection(Color.Green, this.en.output(), this.clk1.input);
        makeConnection(Color.Green, this.srst.output(), this.clk2.input, this.rst.input);
        makeConnection(Color.Red, this.d.output(), this.sel1.input);
        makeConnection(Color.Green, this.clk2.output, this.clk1.output, this.dff1.input, this.dff2.input);

        makeConnection(Color.Green, this.rst.output, this.sel1.input);
        makeConnection(Color.Red, this.sel1.output, this.dff2.input);

        makeConnection(Color.Red, this.dff1.input, this.dff1.output);
        makeConnection(Color.Both, this.dff1.output, this.dff2.output);

        if (this.sel2) {
            makeConnection(Color.Green, this.sel1.input, this.sel2.input);
            makeConnection(Color.Red, this.sel1.output, this.sel2.output);
        }
    }
    output(): Endpoint {
        return this.dff2.output;
    }
    combs(): Entity[] {
        let res = [this.clk1, this.clk2, this.dff1, this.dff2, this.rst, this.sel1];
        if (this.sel2)
            res.push(this.sel2);
        return res;
    }
}
