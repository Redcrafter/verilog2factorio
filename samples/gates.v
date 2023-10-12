// ===========
// misc nodes
// ===========

module const (output [31:0] C);
    assign C = 1234;
endmodule

// ===========
// math nodes
// ===========

module LNot (input [31:0] A, output Y);
    assign Y = !A;
endmodule

module Neg (input [31:0] A, output [31:0] Y);
    assign Y = ~A;
endmodule

module ReduceAnd (input [31:0] A, output Y);
    assign Y = &A;
endmodule

module ReduceOr (input [31:0] A, output Y);
    assign Y = |A;
endmodule

module ReduceNand (input [31:0] A, output Y);
    assign Y = ~&A;
endmodule

module ReduceNor (input [31:0] A, output Y);
    assign Y = ~|A;
endmodule

// TODO:
// module ReduceXor (input [31:0] A, output Y);
//     assign Y = ^A;
// endmodule
// module ReduceXnor (input [31:0] A, output Y);
//     assign Y = ~^A;
// endmodule

module UnaryPlus (input [31:0] A, output [31:0] Y);
    assign Y = +A;
endmodule

// TODO:
// module UnaryMinus (input [31:0] A, output [31:0] Y);
//     assign Y = -A;
// endmodule

module Merge (input [7:0] A, output [7:0] Y);
    assign Y = { A[0], A[1], A[2], A[3], A[4], A[5], A[6], A[7] };
endmodule

module Mul (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A * B;
endmodule

module Pow (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A ** B;
endmodule

// TODO:
// module Div (input [31:0] A, input [31:0] B, output [31:0] Y);
//     assign Y = A / B;
// endmodule
// module Mod (input [31:0] A, input [31:0] B, output [31:0] Y);
//     assign Y = A % B;
// endmodule

module Add (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A + B;
endmodule

module Sub (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A - B;
endmodule

module ShiftLeft (input [31:0] A, input [4:0] B, output [31:0] Y);
    assign Y = A << B;
endmodule

module LogicShiftRight_32u (input [31:0] A, input [4:0] B, output [31:0] Y);
    assign Y = A >> B;
endmodule

module ArithShiftRight_32u (input [31:0] A, input [4:0] B, output [31:0] Y);
    assign Y = A >>> B;
endmodule

module LogicShiftRight_32s (input signed [31:0] A, input [4:0] B, output signed [31:0] Y);
    assign Y = A >> B;
endmodule

module ArithShiftRight_32s (input signed [31:0] A, input [4:0] B, output signed [31:0] Y);
    assign Y = A >>> B;
endmodule

module LogicShiftRight_31u (input [30:0] A, input [4:0] B, output [30:0] Y);
    assign Y = A >> B;
endmodule

// module ArithShiftRight_31u (input [30:0] A, input [4:0] B, output [30:0] Y);
//     assign Y = A >>> B;
// endmodule

module LogicShiftRight_31s (input signed [30:0] A, input [4:0] B, output signed [30:0] Y);
    assign Y = A >> B;
endmodule

// module ArithShiftRight_31s (input signed [30:0] A, input [4:0] B, output signed [30:0] Y);
//     assign Y = A >>> B;
// endmodule

module Logic_LT_32s (input signed [31:0] A, input signed [31:0] B, output Y);
    assign Y = A < B;
endmodule

module Logic_LE_32s (input signed [31:0] A, input signed [31:0] B, output Y);
    assign Y = A <= B;
endmodule

module Logic_GT_32s (input signed [31:0] A, input signed [31:0] B, output Y);
    assign Y = A > B;
endmodule

module Logic_GE_32s (input signed [31:0] A, input signed [31:0] B, output Y);
    assign Y = A >= B;
endmodule

module Logic_LT_32u (input [31:0] A, input [31:0] B, output Y);
    assign Y = A < B;
endmodule

module Logic_LE_32u (input [31:0] A, input [31:0] B, output Y);
    assign Y = A <= B;
endmodule

module Logic_GT_32u (input [31:0] A, input [31:0] B, output Y);
    assign Y = A > B;
endmodule

module Logic_GE_32u (input [31:0] A, input [31:0] B, output Y);
    assign Y = A >= B;
endmodule

// TODO: implement special case
// module Logic_LT_31s (input signed [30:0] A, input signed [30:0] B, output Y);
//     assign Y = A < B;
// endmodule
// module Logic_LE_31s (input signed [30:0] A, input signed [30:0] B, output Y);
//     assign Y = A <= B;
// endmodule
// module Logic_GT_31s (input signed [30:0] A, input signed [30:0] B, output Y);
//     assign Y = A > B;
// endmodule
// module Logic_GE_31s (input signed [30:0] A, input signed [30:0] B, output Y);
//     assign Y = A >= B;
// endmodule

module Logic_LT_31u (input [30:0] A, input [30:0] B, output Y);
    assign Y = A < B;
endmodule

module Logic_LE_31u (input [30:0] A, input [30:0] B, output Y);
    assign Y = A <= B;
endmodule

module Logic_GT_31u (input [30:0] A, input [30:0] B, output Y);
    assign Y = A > B;
endmodule

module Logic_GE_31u (input [30:0] A, input [30:0] B, output Y);
    assign Y = A >= B;
endmodule


module Logic_EQ (input [31:0] A, input [31:0] B, output Y);
    assign Y = A == B;
endmodule

module Logic_NE (input [31:0] A, input [31:0] B, output Y);
    assign Y = A != B;
endmodule


module Logic_EQX (input [31:0] A, input [31:0] B, output Y);
    assign Y = A === B;
endmodule

module Logic_NEX (input [31:0] A, input [31:0] B, output Y);
    assign Y = A !== B;
endmodule

module And (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A & B;
endmodule

module Xor (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A ^ B;
endmodule

module XNor (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A ~^ B;
endmodule

module Or (input [31:0] A, input [31:0] B, output [31:0] Y);
    assign Y = A | B;
endmodule

// module LAnd_32 (input [31:0] A, input [31:0] B, output Y);
//     assign Y = A && B;
// endmodule

// module LOr_32 (input [31:0] A, input [31:0] B, output Y);
//     assign Y = A || B;
// endmodule

module LAnd_1 (input A, input B, output Y);
    assign Y = A && B;
endmodule

module LOr_1 (input A, input B, output Y);
    assign Y = A || B;
endmodule

module Mux (input [31:0] A, input [31:0] B, input S, output [31:0] Y);
    assign Y = S ? A : B;
endmodule

module PMux (input [1:0] A, input [31:0] B, input [31:0] C, input [31:0] D, input [31:0] E, output [31:0] Y);
    always @* begin
        case (A)
            0: Y = B;
            1: Y = C;
            2: Y = D;
            3: Y = E;
        endcase
    end
endmodule

// ===========
// dff nodes
// ===========

module DFF (input CLK, input [31:0] D, output reg [31:0] Q);
    always @(posedge CLK) begin
        Q <= D;
    end
endmodule

module SDFF (input CLK, input [31:0] D, input SRST, output reg [31:0] Q);
    always @(posedge CLK) begin
        Q <= SRST ? 0 : D;
    end
endmodule

module DFFE (input CLK, input [31:0] D, input EN, output reg [31:0] Q);
    always @(posedge CLK) begin
        if(EN) Q <= D;
    end
endmodule

module SDFFE (input CLK, input [31:0] D, input EN, input SRST, output reg [31:0] Q);
    always @(posedge CLK) begin
        if(SRST)
            Q <= 0;
        else if(EN) 
            Q <= D;
    end
endmodule

module SDFFCE (input CLK, input [31:0] D, input EN, input SRST, output reg [31:0] Q);
    always @(posedge CLK) begin
        if(EN) 
            Q <= SRST ? 0 : D;
    end
endmodule

module Memory (input CLK, input RD_ADDR, output [31:0] RD_DATA, input WR_ADDR, input [31:0] WR_DATA, input WR_EN);
    reg [31:0] data [2];

    assign RD_DATA = data[RD_ADDR];
    
    always @(posedge CLK) begin
        if(WR_EN)
            data[WR_ADDR] <= WR_DATA; 
    end
endmodule
