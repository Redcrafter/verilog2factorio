
module ram (
    input clk,

    input [14:0] read_address,
    output [31:0] read_data,

    input [14:0] write_address,
    input [31:0] write_data,
    input write_enable
);

    reg [31:0] memory ['h1000];

    assign read_data = memory[read_address];

    always @(posedge clk) if(write_enable) memory[write_address] <= write_data;
endmodule
