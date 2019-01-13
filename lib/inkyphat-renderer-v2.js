const { WHITE, BLACK, LIGHT_RED, RED, LOW, sleep, flushBuffer, MODES } = require('./inkyphat-utils');
const Renderer = require('./inkyphat-renderer');

/* eslint-disable camelcase */
const CMD_x01_DRIVER_OUTPUT_CTRL = 0x01;
// const CMD_x03_GATE_DRIVING_VOLTAGE_CTRL = 0x03;
const CMD_x04_SOURCE_DRIVING_VOLTAGE_CTRL = 0x04;
// const CMD_x0c_BOOSTER_SOFT_START_CTRL = 0x0c;
// const CMD_x0f_GATE_SCAN_START_POSITION = 0x0f;
const CMD_x10_DEEP_SLEEP_MODE = 0x10;
const CMD_x11_DATA_ENTRY_MODE = 0x11;
const CMD_x12_SW_RESET = 0x12;
// const CMD_x14_HV_READY_DETECTION = 0x14;
// const CMD_x15_VCI_DETECTION = 0x15;
// const CMD_x18_TEMP_SENSOR_CTRL = 0x18;
// const CMD_x1a_TEMP_SENSOR_CTRL_WRITE = 0x1a;
// const CMD_x1b_TEMP_SENSOR_CTRL_READ = 0x1b;
// const CMD_x1c_TEMP_SENSOR_CTRL_WRITE_EXT = 0x1c;
const CMD_x20_MASTER_ACTIVATION = 0x20;
// const CMD_x21_DISPLAY_UPDATE_CTRL_1 = 0x21;
const CMD_x22_DISPLAY_UPDATE_CTRL_2 = 0x22;
const CMD_x24_WRITE_RAM_BW = 0x24;
const CMD_x26_WRITE_RAM_RED = 0x26;
// const CMD_x27_READ_RAM = 0x27;
// const CMD_x28_VCOM_SENSE = 0x28;
// const CMD_x29_VCOM_SENSE_DURATION = 0x29;
// const CMD_x2a_PROGRAM_VCOM_OTP = 0x2a;
const CMD_x2c_WRITE_VCOM = 0x2c;
// const CMD_x2d_OTP_REGISTER_READ_DISP_OPT = 0x2d;
// const CMD_x2e_USER_ID_READ = 0x2e;
// const CMD_x2f_STATUS_BIT_READ = 0x2f;
// const CMD_x30_PROGRAM_WS_OTP = 0x30;
// const CMD_x31_LOAD_WS_OTP = 0x31;
const CMD_x32_WRITE_LUT_REGISTER = 0x32;
// const CMD_x34_CRC_CALCULATION = 0x34;
// const CMD_x35_CRC_STATUS_READ = 0x35;
// const CMD_x36_PROGRAM_OTP_SELECTION = 0x36;
// const CMD_x37_WRITE_DISPLAY_OPT_IN_OTP = 0x37;
// const CMD_x38_WRITE_USER_ID = 0x38;
// const CMD_x39_OTP_PROGRAM_MODE = 0x39;
const CMD_x3a_SET_DUMMY_LINE_PERIOD = 0x3a;
const CMD_x3b_SET_GATE_LINE_WIDTH = 0x3b;
const CMD_x3c_BORDER_WAVEFORM_CTRL = 0x3c;
// const CMD_x41_READ_RAM_OPTION = 0x41;
const CMD_x44_SET_RAM_X_START_END = 0x44;
const CMD_x45_SET_RAM_Y_START_END = 0x45;
// const CMD_x46_AUTO_WRITE_RAM_RED = 0x46;
// const CMD_x47_AUTO_WRITE_RAM_BW = 0x47;
const CMD_x4e_SET_RAM_X_COUNTER = 0x4e;
const CMD_x4f_SET_RAM_Y_COUNTER = 0x4f;
const CMD_x74_SET_ANALOG_BLOCK_CTRL = 0x74;
const CMD_x7e_SET_DIGITAL_BLOCK_CTRL = 0x7e;
// const CMD_x7f_NOP = 0x7f;
/* eslint-enable camelcase */

// Create some profiles so we can process the buffers in different ways...
const lookupTableProfiles = {};

// This is what the bit patten below is made up of...
// const VSS  = 0b00;
// const VSH1 = 0b01;
// const VSL  = 0b10;
// const VSH2 = 0b11;
lookupTableProfiles[MODES.pimoroni] = [
  // Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
  // A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  0b01001000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
  0b01001000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT2 - Light Red
  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

  //  Duration  | Repeat
  //  A B C D   | X
  67, 10, 31, 10, 4, // Phase 0 (Flash)
  16, 8, 4, 4, 6, // Phase 1 (Clear/White)
  4, 8, 8, 32, 16, // Phase 2 (Black)
  4, 8, 8, 64, 32, // Phase 3 (Red)
  6, 6, 6, 2, 2, // Phase 4 (Black sharpen)
  0, 0, 0, 0, 0, // Phase 5 (Skipped)
  0, 0, 0, 0, 0 // Phase 6 (Skipped)
];

lookupTableProfiles[MODES.pimoroni_yellow] = [
  // Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
  // A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  0b11111010, 0b10010100, 0b10001100, 0b11000000, 0b11010000, 0b00000000, 0b00000000, // LUT0 - Black
  0b11111010, 0b10010100, 0b00101100, 0b10000000, 0b11100000, 0b00000000, 0b00000000, // LUT1 - White
  0b11111010, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT2 - Ignore
  0b11111010, 0b10010100, 0b11111000, 0b10000000, 0b01010000, 0b00000000, 0b11001100, // LUT3 - Red
  0b10111111, 0b01011000, 0b11111100, 0b10000000, 0b11010000, 0b00000000, 0b00010001, // LUT4 - VCOM

  //  Duration  | Repeat
  //  A B C D   | X
  64, 16, 64, 16, 8, // Phase 0 (Flash)
  8, 16, 4, 4, 16, // Phase 1 (Clear/White)
  8, 8, 3, 8, 32, // Phase 2 (???)
  8, 4, 0, 0, 16, // Phase 3 (???)
  16, 8, 8, 0, 32, // Phase 4 (???)
  0, 0, 0, 0, 0, // Phase 5 (Skipped)
  0, 0, 0, 0, 0 // Phase 6 (Skipped)
];

lookupTableProfiles[MODES.quick] = [
  // Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
  // A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  0b01001000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
  0b01001000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b10100000, 0b00000000, // LUT2 - Light Red
  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

  //  Duration  | Repeat
  //  A B C D   | X
  20, 10, 31, 10, 4, // Phase 0 (Flash)
  16, 8, 4, 4, 6, // Phase 1 (Clear/White)
  4, 8, 8, 32, 6, // Phase 2 (Black)
  4, 8, 8, 64, 10, // Phase 3 (Red)
  6, 6, 6, 2, 2, // Phase 4 (Black sharpen)
  3, 4, 0, 0, 1, // Phase 5 (Light Red)
  0, 0, 0, 0, 0 // Phase 6 (Skipped)
];

lookupTableProfiles[MODES.noFlash] = [
  // Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
  // A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  0b00000000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
  0b00000000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
  0b00000000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b10100000, 0b00000000, // LUT2 - Light Red
  0b00000000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

  //  Duration  | Repeat
  //  A B C D   | X
  0, 0, 0, 0, 0, // Phase 0 (Skipped)
  16, 8, 4, 4, 6, // Phase 1 (Clear/White)
  4, 8, 8, 32, 6, // Phase 2 (Black)
  4, 8, 8, 64, 10, // Phase 3 (Red)
  6, 6, 6, 2, 2, // Phase 4 (Black sharpen)
  3, 4, 0, 0, 1, // Phase 5 (Light Red)
  0, 0, 0, 0, 0 // Phase 6 (Skipped)
];

lookupTableProfiles[MODES.clear] = [
  // Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
  // A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  0b01001000, 0b10100000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT0 - Clear Ch1
  0b01001000, 0b10100000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT1 - Clear Ch2
  0b01001000, 0b10100000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT2 - Clear Ch3
  0b01001000, 0b10100000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Clear Ch4
  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

  //  Duration  | Repeat
  //  A B C D   | X
  67, 10, 31, 10, 4, // Phase 0 (Flash)
  16, 8, 4, 4, 6, // Phase 1 (White)
  0, 0, 0, 0, 0, // Phase 2 (Skipped)
  0, 0, 0, 0, 0, // Phase 3 (Skipped)
  0, 0, 0, 0, 0, // Phase 4 (Skipped)
  0, 0, 0, 0, 0, // Phase 5 (Skipped)
  0, 0, 0, 0, 0 // Phase 6 (Skipped)
];

module.exports = class RendererV2 extends Renderer {
  constructor (props) {
    super({ ...props, freeState: LOW });
  }

  async _sendResetCommand () {
    return this._sendCommand(CMD_x12_SW_RESET);
  }

  async _prepare () {
    await this._sendReset();
    // Set analog control block...
    await this._sendCommand(CMD_x74_SET_ANALOG_BLOCK_CTRL, 0x54);
    // Set digital control block...
    await this._sendCommand(CMD_x7e_SET_DIGITAL_BLOCK_CTRL, 0x3b);
    // Driver output control...
    await this._sendCommand(CMD_x01_DRIVER_OUTPUT_CTRL, [0xd3, 0x00, 0x00]);
    // Dummy line period...
    await this._sendCommand(CMD_x3a_SET_DUMMY_LINE_PERIOD, 0x07);
    // Gate line width...
    await this._sendCommand(CMD_x3b_SET_GATE_LINE_WIDTH, 0x04);
    // Data Entry Mode...
    await this._sendCommand(CMD_x11_DATA_ENTRY_MODE, 0x03);
  };

  async _draw (lutProfile = MODES.quick, border = WHITE) {
    // Set RAM X Address...
    await this._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
    // Set RAM Y Address + erroneous extra byte...
    await this._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00, 0x00]);
    // Source driving voltage control...
    await this._sendCommand(CMD_x04_SOURCE_DRIVING_VOLTAGE_CTRL, [0x2d, 0xb2, 0x22]);
    // VCOM register -1.5v...
    await this._sendCommand(CMD_x2c_WRITE_VCOM, 0x3c);
    // Border control...
    // Black and White work well but Red and light Red need some work
    // Red works quite well although acording to the datasheet last
    // digit should be 3 to select LUT3.
    if (border === BLACK) {
      await this._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0x00); // Black
    } else if (border === LIGHT_RED) {
      await this._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0xC3); // Light Red
    } else if (border === RED) {
      await this._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0x02); // Red
    } else {
      await this._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0xC1); // White
    }
    // Send LUTs
    await this._sendCommand(CMD_x32_WRITE_LUT_REGISTER, lookupTableProfiles[lutProfile]);
    // Set RAM X Address...
    await this._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
    // Set RAM Y Address...
    await this._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00]);
    // Set RAM X address counter...
    await this._sendCommand(CMD_x4e_SET_RAM_X_COUNTER, 0x00);
    // Set RAM Y address counter...
    await this._sendCommand(CMD_x4f_SET_RAM_Y_COUNTER, [0x00, 0x00]);
    // Black Buffer...
    await this._sendCommand(CMD_x24_WRITE_RAM_BW, this.blackBuffer);
    // Set RAM X Address...
    await this._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
    // Set RAM Y Address...
    await this._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00]);
    // Set RAM X address counter...
    await this._sendCommand(CMD_x4e_SET_RAM_X_COUNTER, 0x00);
    // Set RAM Y address counter...
    await this._sendCommand(CMD_x4f_SET_RAM_Y_COUNTER, [0x00, 0x00]);
    // Red Buffer...
    await this._sendCommand(CMD_x26_WRITE_RAM_RED, this.redBuffer);
    // Display update setting...
    await this._sendCommand(CMD_x22_DISPLAY_UPDATE_CTRL_2, 0xc7);
    // Display update activate...
    await this._sendCommand(CMD_x20_MASTER_ACTIVATION);
    await sleep(50);
    // Wait for the update to complete or reject the promise if
    // it takes more than 35 sec...
    await this._whenFree(35000);
  }

  async _finish () {
    // Deep sleep mode...
    await this._sendCommand(CMD_x10_DEEP_SLEEP_MODE);
  }

  async render (buffer, border, mode) {
    await this._prepare();
    await flushBuffer(buffer, this.blackBuffer, this.redBuffer);
    await this._draw(MODES[mode], border);
    await this._finish();
  }

  async clear () {
    await this._prepare();
    await this._draw(MODES.clear);
    await this._finish();
  }
};
