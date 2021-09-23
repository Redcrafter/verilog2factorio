// instructions
// I-type LOAD
`define OP_LOAD     7'b0000011
`define F3_LW       3'b010

// S-type STORE
`define OP_STORE    7'b0100011
`define F3_SW       3'b010

// I-type OP-IMM
`define OP_IMM      7'b0010011
`define F3_ADDI     3'b000
`define F3_SLTI     3'b010
`define F3_SLTIU    3'b011
`define F3_XORI     3'b100
`define F3_ORI      3'b110
`define F3_ANDI     3'b111

`define F3_SLLI         3'b001
`define F3_SRLI_SRAI    3'b101

// U-type
`define OP_LUI      7'b0110111
`define OP_AUIPC    7'b0010111

// R-type
`define OP_OP       7'b0110011
`define F3_ADD      3'b000
`define F3_SUB      3'b000
`define F3_SLT      3'b010
`define F3_SLTU     3'b011
`define F3_XOR      3'b100
`define F3_OR       3'b110
`define F3_AND      3'b111
`define F3_SLL      3'b001
`define F3_SRL      3'b101
`define F3_SRA      3'b101

`define F7_30_0     7'b0000000
`define F7_30_1     7'b0100000

// J-type
`define OP_JAL      7'b1101111

// I-type JALR
`define OP_JALR     7'b1100111

// B-type
`define OP_BRANCH   7'b1100011
`define F3_BEQ      3'b000
`define F3_BNE      3'b001
`define F3_BLT      3'b100
`define F3_BGE      3'b101
`define F3_BLTU     3'b110
`define F3_BGEU     3'b111

`define OP_MISC_MEM 7'b0001111
`define FENCE       3'b000
`define FENCE_I     3'b001

// TODO:
`define OP_SYSTEM   7'b1110011
`define ECALL_EBREAK 3'b000
`define CSRRW       3'b001
`define CSRRS       3'b010
`define CSRRC       3'b011
`define CSRRWI      3'b101
`define CSRRSI      3'b110
`define CSRRCI      3'b111

module rv32i_cpu(
    input clk,
    input reset,

    input  [31:0] program_data_bus,
    output [31:0] program_addr_bus,

    input  [31:0] mem_read_data_bus,
    output reg [31:0] mem_write_data_bus,

    output reg mem_write_signal,
    output reg [31:0] mem_addr_bus
);
    reg  [31:0] regs [31:1];
    reg  [31:0] pc;

    assign program_addr_bus = pc;
    wire [31:0] instruction = program_data_bus;

    /* instruction decoding wiring
     *
     * Some ranges are overlapped given that different instruction types use different instruction formats.
     */
    wire [6:0]  opcode = instruction[6:0];
    wire [4:0]  rd     = instruction[11:7];                           // destination register
    wire [2:0]  funct3 = instruction[14:12];                          // operation selector
    wire [4:0]  rs1    = instruction[19:15];                          // source register 1
    wire [4:0]  rs2    = instruction[24:20];                          // source register 2
    wire [6:0]  funct7 = instruction[31:25];                          // operation selector

    wire [31:0] i_imm  = $signed(instruction[31:20]);                 // I-type immediate (OP-IMM)
    wire [31:0] u_imm  = {instruction[31:12], 12'b0};                 // U-type immediate (LUI, AUIPC)
    wire [31:0] j_imm  = $signed({instruction[31], instruction[19:12], instruction[20], instruction[30:21], 1'b0 }); // J-type immediate offset (JAL)
    wire [31:0] b_imm  = $signed({instruction[31], instruction[7],  instruction[30:25], instruction[11:8] , 1'b0 }); // B-type immediate offset (BRANCH)
    wire [31:0] s_imm  = $signed({instruction[31:25], instruction[11:7]});     // S-type immediate (STORE)

    logic [31:0] result;
    logic writeResult;
    logic [31:0] pcResult;

    wire [31:0] rs1Val = rs1 == 0 ? 0 : regs[rs1];
    wire [31:0] rs2Val = rs2 == 0 ? 0 : regs[rs2];

    function jumpCond();
        case (funct3)
            `F3_BEQ:  jumpCond = rs1Val == rs2Val;
            `F3_BNE:  jumpCond = rs1Val != rs2Val;
            `F3_BLT:  jumpCond = $signed(rs1Val) < $signed(rs2Val);
            `F3_BGE:  jumpCond = $signed(rs1Val) >= $signed(rs2Val);
            `F3_BLTU: jumpCond = rs1Val < rs2Val;
            `F3_BGEU: jumpCond = rs1Val >= rs2Val;
            default:  jumpCond = 0;
        endcase
    endfunction

    function [31:0] immMath();
        case (funct3)
            `F3_ADDI:  immMath = rs1Val + i_imm;
            `F3_SLTI:  immMath = $signed(rs1Val) < $signed(i_imm);
            `F3_SLTIU: immMath = rs1Val < i_imm;
            `F3_XORI:  immMath = rs1Val ^ i_imm;
            `F3_ORI:   immMath = rs1Val | i_imm;
            `F3_ANDI:  immMath = rs1Val & i_imm;
            `F3_SLLI:  immMath = rs1Val << i_imm[4:0];
            `F3_SRLI_SRAI: begin
                if (i_imm[10]) immMath = $signed(rs1Val) >>> i_imm[4:0];
                else           immMath = rs1Val >> i_imm[4:0];
            end
            default: immMath = 0;
        endcase
    endfunction

    function [31:0] opMath();
        case({funct7, funct3})
            {`F7_30_0, `F3_ADD}:  opMath = rs1Val + rs2Val;
            {`F7_30_0, `F3_SLT}:  opMath = $signed(rs1Val) < $signed(rs2Val);
            {`F7_30_0, `F3_SLTU}: opMath = rs1Val < rs2Val;
            {`F7_30_0, `F3_XOR}:  opMath = rs1Val ^ rs2Val;
            {`F7_30_0, `F3_OR}:   opMath = rs1Val | rs2Val;
            {`F7_30_0, `F3_AND}:  opMath = rs1Val & rs2Val;
            {`F7_30_0, `F3_SLL}:  opMath = rs1Val << rs2Val[4:0];
            {`F7_30_0, `F3_SRL}:  opMath = rs1Val >> rs2Val[4:0];
            {`F7_30_1, `F3_SUB}:  opMath = $signed(rs1Val) - $signed(rs2Val);
            {`F7_30_1, `F3_SRA}:  opMath = $signed(rs1Val) >>> rs2Val[4:0];
            default:              opMath = 0;
        endcase
    endfunction

    // logic
    always @(posedge(clk)) begin
        mem_write_signal = 0;

        //$monitor("state=%d, pc=%03d, instruction=%032b", state, pc, instruction);
        if (reset == 0) begin
            pc <= 0;
        end else begin
            result = 0;
            writeResult = 0;
            pcResult = pc + 4;

            case (opcode)
                `OP_LOAD: begin
                    mem_addr_bus <= rs1Val + i_imm;
                    result = funct3 == `F3_LW ? mem_read_data_bus : 0;
                    writeResult = 1;
                end
                `OP_STORE: begin
                    mem_addr_bus <= rs1Val + $signed(s_imm);
                    mem_write_data_bus <= rs2Val;
                    if (funct3 == `F3_SW) mem_write_signal <= 1;
                end
                `OP_IMM: begin
                    result = immMath();
                    writeResult = 1;
                end  
                `OP_LUI: begin
                    result = u_imm; 
                    writeResult = 1;
                end 
                `OP_AUIPC: begin
                    result = u_imm + pc;
                    writeResult = 1;
                end
                `OP_OP: begin
                    result = opMath();
                    writeResult = 1;
                end
                `OP_JAL: begin
                    result = pc + 4;
                    writeResult = 1;
                    pcResult = pc + j_imm;
                end
                `OP_JALR: begin
                    result = pc + 4; 
                    writeResult = 1;
                    pcResult = (rs1Val + i_imm) & 32'b11111111111111111111111111111110;
                end
                `OP_BRANCH: if(jumpCond()) pcResult = pc + b_imm;
            endcase

            pc <= pcResult;
            if (rd != 0 && writeResult) regs[rd] <= result; 
        end
    end
endmodule
