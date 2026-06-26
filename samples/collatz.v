
module collatz #(parameter INPUT_WIDTH=16, parameter OUTPUT_WIDTH=16) (input clk, input start, input [INPUT_WIDTH-1:0] data, output reg [OUTPUT_WIDTH-1:0] val);
  always @(posedge clk) begin
    if(start) 
      val <= data;
    else if(!val[0]) // even
      val <= val >> 1; // x/2
    else
      val <= val + {val,1'b1}; // 3x+1
  end
endmodule
