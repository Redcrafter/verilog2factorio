module serial_crc (
    input clk,
    input reset,
    input enable,
    input data_in,
    output reg [15:0] crc);

    parameter initVal = 16'hFFFF;
    parameter poly = 16'h1021;

    always @(posedge clk)
        if (reset)
            crc <= initVal;
        else if (enable)
            crc <= (crc << 1) ^ ((data_in ^ crc[15]) * poly);

endmodule
