# Factorio verilog compiler

This project will take your verilog code, provided as options in the command line, and transform it into a factorio blueprint.

## Install
Manually compile [yosys](https://github.com/YosysHQ/yosys) (since the last release is quite old) and add it to your PATH. 

Run ``` npm install ```

## Usage
Run ```npm start ./samples/counter.v``` with verilog files as parameters

The compiled blueprint will be output on the command line

## Examples

### counter.v
```verilog
module counter(input clk, input rst, input inc, output reg [3:0] cnt);
  always @(posedge clk) begin
    if (rst)
      cnt <= 0;
    else if (inc)
      cnt <= cnt + 1'b1;
  end
endmodule
```
![image](https://user-images.githubusercontent.com/35386456/115978416-2c589600-a54d-11eb-8cbd-92d37e0ef3bb.png)


### (somewhat broken) 6502 CPU from https://github.com/Arlet/verilog-6502/
![image](https://user-images.githubusercontent.com/35386456/115978429-54e09000-a54d-11eb-8d4e-48d7d9fc68c2.png)
