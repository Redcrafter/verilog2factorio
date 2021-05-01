# Factorio verilog compiler

This project will compile verilog (a hardware description language) into factorio blueprints.

## Install
Manually compile [yosys](https://github.com/YosysHQ/yosys) (since the last release is quite old) and add it to your PATH.

Run ``` npm install ``` to install all dependencies.

# Usage
```
Usage: v2f [options] <files..>

Options:
  -s, --seed <seed>         Specify a seed for the layout generation.
  -o, --output <file>       File to output the compiled blueprint to.
  -m, --modules <names...>  Verilog modules to output blueprint for. (defaults to all).
  -f, --files <files...>    List of Verilog files to compile. (only has to be explicitly specified after -m).
  -r, --retry               Retry until there are no longer layout errors.
  -h, --help                Display this information.
```
## Quick Start
Run ```./v2f``` with verilog files as parameters. Example: `./v2f ./samples/counter.v`

The compiled blueprint will be output on the command line unless otherwise specified with `-f`.

The circuit will have inputs and outputs at the top in the order in which they were written in the code.
Clock pulses are required to be exactly one tick high. (since adding edge detectors would produce a lot of overhead)

## Examples

### samples/counter.v
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
At the top in order clk, rst, inc and cnt.

### 6502 CPU from https://github.com/Arlet/verilog-6502/
(Currently not entirely working)
![image](https://user-images.githubusercontent.com/35386456/115978429-54e09000-a54d-11eb-8d4e-48d7d9fc68c2.png)
