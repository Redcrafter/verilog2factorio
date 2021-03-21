module counter(input clk, input rst, input inc, output reg [3:0] cnt);
  always @(posedge clk) begin
    if (rst)
      cnt <= 0;
    else if (inc)
      cnt <= cnt + 1'b1;
  end
endmodule
