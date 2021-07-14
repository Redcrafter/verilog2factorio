
module collatz(input clk, input start, input [15:0] data, output reg [15:0] val);
  always @(posedge clk) begin
    if(start) 
      val <= data;
    else if(!(val & 1'b1))
      val <= val >> 1;
    else
      val <= val * 16'd3 + 16'd1;
  end
endmodule
