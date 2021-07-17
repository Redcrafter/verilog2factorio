
module fibonacci(input clk, input rst, output reg [30:0] a, output reg [30:0] b);
  always @(posedge clk)
    if (rst)
      a <= 0;
      b <= 1;
    else
      a <= b;
      b <= a + b;
endmodule
