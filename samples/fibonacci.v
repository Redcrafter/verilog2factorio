
module fibonacci(input clk, input rst, output reg [30:0] a, output reg [30:0] b);
  always @(posedge clk)
    if (rst) begin
      a <= 0;
      b <= 1;
    end else begin
      a <= b;
      b <= a + b;
    end
endmodule
