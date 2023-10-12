
`define FetchLow  0
`define FetchHigh 1
`define Exec      2
`define writeVx   3

`define DrawX0 4
`define DrawX1 5
`define DrawX2 6
`define DrawX3 7
`define DrawX4 8
`define DrawX5 9
`define DrawX6 10
`define DrawX7 11

module chip8(
  input clk,
  input reset,

  output reg [15:0] addr,
  input  [7:0] inData,
  // output [7:0] outData,
  // output reg write,

  output reg [15:0] gfxAddr,
  output reg gfxFlip,
  input gfxVal,

  input [7:0] _rand,
  input [15:0] key
);

  reg [7:0] V [15:0];

  reg [15:0] PC;
  reg [15:0] I;
  reg [7:0] SP;
  reg [15:0] delay_timer;
  reg [7:0] sound_timer;

  reg [15:0] stack [256];

  reg [31:0] state;
  reg [15:0] opcode;

  reg [7:0] drawData;
  reg [7:0] drawY;

  wire [7:0] vx = V[opcode[11:8]];
  wire [7:0] vy = V[opcode[7:4]];

  logic write15;
  logic [7:0] data15;

  logic [7:0] writeVx;
  logic [7:0] dataVx;

  assign gfxFlip = drawData[7];

  always @(posedge clk) begin
    write15 = 0;
    writeVx = 0;
    data15 = 'hxx;

    if(reset) begin
      PC <= 512;
      I <= 0;
      SP <= 255;

      // write <= 0;
      state <= `FetchLow;
      addr <= 512;

      delay_timer <= 0;
    	sound_timer <= 0;
    end else begin
      case (state)
        `FetchLow: begin
          opcode <= inData << 8;
          PC = PC + 1;
          addr = PC;
          state <= `FetchHigh;
        end
        `FetchHigh: begin
          opcode <= opcode | inData;
          PC = PC + 1;
          addr = I;
          state <= `Exec;
        end
        `Exec: begin
          if(delay_timer > 0) delay_timer = delay_timer - 1;
          if(sound_timer > 0) sound_timer = sound_timer - 1;
    
          // $display("[%4H] %4H", PC - 16'd2, opcode);

          state = `FetchLow;
          addr = PC;
          dataVx = 'hxx;

          casex  (opcode)
            // TODO 16'h00E0: // 00E0: Clears the screen
            16'h00EE: begin // 00EE: Returns from a subroutine
              PC = stack[SP];
              addr = PC;
              SP = SP - 1;
            end
            16'h1xxx: begin PC = opcode[11:0]; addr = PC; end // 1NNN: Jumps to address NNN
            16'h2xxx: begin // 2NNN: Calls subroutine at NNN
              SP = SP + 1;
              stack[SP] = PC;
              PC = opcode[11:0];
              addr = PC;
            end
            16'h3xxx: if(vx == opcode[7:0]) begin PC = PC + 2; addr = PC; end // 3XNN: Skips the next instruction if VX equals NN
            16'h4xxx: if(vx != opcode[7:0]) begin PC = PC + 2; addr = PC; end // 4XNN: Skips the next instruction if VX doesn't equal NN
            16'h5xxx: if(vx == vy) begin PC = PC + 2; addr = PC; end // 4XNN: Skips the next instruction if VX doesn't equal NN
            16'h6xxx: begin writeVx = 1; dataVx = opcode[7:0]; end  // 6XNN: Sets VX to NN
            16'h7xxx: begin writeVx = 1; dataVx = vx + opcode; end    // 7XNN: Adds NN to VX
            16'h8xx0: begin writeVx = 1; dataVx = vy; end             // 8XY0: Sets VX to the value of VY
            16'h8xx1: begin writeVx = 1; dataVx = vx | vy; end
            16'h8xx2: begin writeVx = 1; dataVx = vx & vy; end
            16'h8xx3: begin writeVx = 1; dataVx = vx ^ vy; end
            16'h8xx4: begin
              int val;
              val = vx + vy;
              write15 = 1;
              data15 = val > 8;

              dataVx = val;
              state = `writeVx;
            end
            16'h8xx5: begin
              write15 = 1;
              data15 = vx >= vy;

              dataVx = vx - vy;
              state = `writeVx;
            end
            16'h8xx6: begin
              write15 = 1;
              data15 = vx & 1;

              dataVx = vx >> 1;
              state = `writeVx;
            end
            16'h8xx7: begin
              write15 = 1;
              data15 = vy >= vx;

              dataVx = vy - vx;
              state = `writeVx;
            end
            16'h8xxE: begin
              write15 = 1;
              data15 = vx >> 7;

              dataVx = vx << 1;
              state = `writeVx;
            end
            16'h9xxx: if(vx != vy) begin PC = PC + 2; addr = PC; end // 9XY0: Skips the next instruction if VX doesn't equal VY
            16'hAxxx: I = opcode[11:0]; // ANNN: Sets I to the address NNN
            16'hBxxx: begin PC = V[0] + opcode[11:0]; addr = PC; end // BNNN: Jumps to the address NNN plus V0
            16'hCxxx: begin // CXNN Sets VX to the result of a bitwise and operation on a random number and NN
              writeVx = 1;
              dataVx = _rand & opcode[7:0];
            end
            16'hDxxx: begin // DXYN: Draws a sprite at coordinate (VX, VY) that has a width of 8 pixels and a height of N pixels
              write15 = 1;
              data15 = 0;

              drawData = inData;
              drawY = 0;
              gfxAddr = vx + vy * 64;

              if(0 < (opcode[3:0])) begin
                addr = I + 1;
                state = `DrawX0;
              end
            end
            16'hEx9E: if((key >> vx) & 1) begin PC = PC + 2; addr = PC; end
            16'hExA1: if(!((key >> vx) & 1)) begin PC = PC + 2; addr = PC; end
            16'hFx07: begin writeVx = 1; dataVx = delay_timer / 9; end
            // TODO 16'hFx0A: if(key == 0) PC = PC - 2;
            16'hFx15: delay_timer = vx * 9;
            16'hFx18: sound_timer = vx;
            16'hFx1E: begin
              int val;
              val = I + vx;
              write15 = 1;
              data15 = val > 'hFFF;
              I = val & 'hFFF;
            end
            16'hFx29: I = vx * 5;
            // TODO 16'hFx33:
            // TODO 16'hFx55:
            // TODO 16'hFx65:
            default: $display("Uknown op");
          endcase
        end
        `writeVx: begin
          writeVx = 1;
          state = `FetchLow;
        end
        `DrawX0, `DrawX1, `DrawX2, `DrawX3,
        `DrawX4, `DrawX5, `DrawX6: begin
          if(gfxVal && gfxFlip) begin
            write15 = 1;
            data15 = 1;
          end
          drawData = drawData << 1;

          gfxAddr = gfxAddr + 1;

          state = state + 1;
        end
        `DrawX7: begin
          if(gfxVal && gfxFlip) begin
            write15 = 1;
            data15 = 1;
          end

          drawY = drawY + 1;
          if(drawY < (opcode[3:0])) begin
            drawData = inData;
            gfxAddr = gfxAddr + 57;

            addr = I + drawY + 1;
            state = `DrawX0;
          end else begin
            addr = PC;
            state = `FetchLow;
          end
        end
        default: state = `FetchLow;
      endcase
    end

    if(writeVx) V[opcode[11:8]] <= dataVx;
    else if(write15) V[15] <= data15;
  end
endmodule
