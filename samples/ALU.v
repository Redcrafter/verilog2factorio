// https://github.com/Arlet/verilog-6502/blob/master/ALU.v

module ALU( clk, op, right, AI, BI, CI, CO, BCD, OUT, V, Z, N, HC, RDY );
	input clk;
	input right;
	input [3:0] op;		// operation
	input [7:0] AI;
	input [7:0] BI;
	input CI;
	input BCD;		// BCD style carry
	output [7:0] OUT;
	output CO;
	output V;
	output Z;
	output N;
	output HC;
	input RDY;

    reg [7:0] OUT;
    reg CO;
    wire V;
    wire Z;
    reg N;
    reg HC;

    reg AI7;
    reg BI7;
    reg [8:0] temp_logic;
    reg [7:0] temp_BI;
    reg [4:0] temp_l;
    reg [4:0] temp_h;
    wire [8:0] temp = { temp_h, temp_l[3:0] };
    wire adder_CI = (right | (op[3:2] == 2'b11)) ? 1'b0 : CI;

    // calculate the logic operations. The 'case' can be done in 1 LUT per
    // bit. The 'right' shift is a simple mux that can be implemented by
    // F5MUX.
    always @*  begin
        case( op[1:0] )
            2'b00: temp_logic = AI | BI;
            2'b01: temp_logic = AI & BI;
            2'b10: temp_logic = AI ^ BI;
            2'b11: temp_logic = AI;
        endcase

        if( right )
            temp_logic = { AI[0], CI, AI[7:1] };
    end

    // Add logic result to BI input. This only makes sense when logic = AI.
    // This stage can be done in 1 LUT per bit, using carry chain logic.
    always @* begin
        case( op[3:2] )
            2'b00: temp_BI = BI;	// A+B
            2'b01: temp_BI = ~BI;	// A-B
            2'b10: temp_BI = temp_logic;	// A+A
            2'b11: temp_BI = 0;		// A+0
        endcase	
    end

    // HC9 is the half carry bit when doing BCD add
    wire HC9 = BCD & (temp_l[3:1] >= 3'd5);

    // CO9 is the carry-out bit when doing BCD add
    wire CO9 = BCD & (temp_h[3:1] >= 3'd5);

    // combined half carry bit
    wire temp_HC = temp_l[4] | HC9;

    // perform the addition as 2 separate nibble, so we get
    // access to the half carry flag
    always @* begin
        temp_l = temp_logic[3:0] + temp_BI[3:0] + adder_CI;
        temp_h = temp_logic[8:4] + temp_BI[7:4] + temp_HC;
    end

    // calculate the flags 
    always @(posedge clk)
        if( RDY ) begin
            AI7 <= AI[7];
            BI7 <= temp_BI[7];
            OUT <= temp[7:0];
            CO  <= temp[8] | CO9;
            N   <= temp[7];
            HC  <= temp_HC;
        end

    assign V = AI7 ^ BI7 ^ CO ^ N;
    assign Z = ~|OUT;
endmodule
