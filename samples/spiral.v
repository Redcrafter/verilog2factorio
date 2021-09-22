
module spiral (
    input clk,
    input reset,
    output reg signed [31:0] x,
    output reg signed [31:0] y);

    reg [1:0] dir;
    reg [31:0] len;
    reg [31:0] j;

    always @(posedge clk)
        if (reset) begin
            x <= 0;
            y <= 0;
            dir <= 0;
            len <= 2;
            j <= 0;
        end else begin
            case (dir)
                0: x <= x + 1;
                1: y <= y + 1;
                2: x <= x - 1;
                3: y <= y - 1;
            endcase

            j = j + 1;
            if(j == (len >> 1)) begin
                j <= 0;
                dir <= dir + 1;
                len <= len + 1;
            end
        end
endmodule
