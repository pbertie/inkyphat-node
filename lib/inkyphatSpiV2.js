/*jshint esversion: 6*/
const iUtils = require('./inkyphatSpiUtils');

(function() {
  "use strict";

  const sleep = iUtils.sleep;

  //let logFunction = Function.prototype;
  let logFunction = process.stdout.write.bind(process.stdout);

  const CMD_x01_DRIVER_OUTPUT_CTRL = 0x01;
  // const CMD_x03_GATE_DRIVING_VOLTAGE_CTRL = 0x03;
  const CMD_x04_SOURCE_DRIVING_VOLTAGE_CTRL = 0x04;
  // const CMD_x0c_BOOSTER_SOFT_START_CTRL = 0x0c;
  // const CMD_x0f_GATE_SCAN_START_POSITION = 0x0f;
  const CMD_x10_DEEP_SLEEP_MODE = 0x10;
  const CMD_x11_DATA_ENTRY_MODE = 0x11;
  // const CMD_x12_SW_RESET = 0x12;
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

  const PIMORONI = 'pimoroni';
  const QUICK = 'quick';
  const NO_FLASH = 'noFlash';
  const CLEAR = 'clear';

  module.exports.profiles = {
    pimoroni: PIMORONI,
    quick: QUICK,
    noFlash: NO_FLASH,
    clear: CLEAR
  };

  // Create some profiles so we can process the buffers in different ways...
  const lookupTableProfiles = {};

  // This is what the bit patten below is made up of...
  //const VSS  = 0b00;
  //const VSH1 = 0b01;
  //const VSL  = 0b10;
  //const VSH2 = 0b11;
  lookupTableProfiles[PIMORONI] = [
    //Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
    //A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
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

  lookupTableProfiles[QUICK] = [
    //Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
    //A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
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

  lookupTableProfiles[NO_FLASH] = [
    //Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
    //A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
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

  lookupTableProfiles[CLEAR] = [
    //Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
    //A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
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

  module.exports.mixin = function(base) {
    // Ensure the object being extend has the required functions...
    ['_sendReset', '_sendCommand', '_whenFree'].forEach(function(name) {
      if (typeof base[name] !== 'function') {
        throw new Error('Base class must have \'' + name + '\' function.');
      }
    });

    base._initDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          return self._sendReset();
        }).then(function() {
          // Set analog control block...
          return self._sendCommand(CMD_x74_SET_ANALOG_BLOCK_CTRL, 0x54);
        }).then(function() {
          // Set digital control block...
          return self._sendCommand(CMD_x7e_SET_DIGITAL_BLOCK_CTRL, 0x3b);
        }).then(function() {
          // Driver output control...
          return self._sendCommand(CMD_x01_DRIVER_OUTPUT_CTRL, [0xd3, 0x00, 0x00]);
        }).then(function() {
          // Dummy line period...
          return self._sendCommand(CMD_x3a_SET_DUMMY_LINE_PERIOD, 0x07);
        }).then(function() {
          // Gate line width...
          return self._sendCommand(CMD_x3b_SET_GATE_LINE_WIDTH, 0x04);
        }).then(function() {
          // Data Entry Mode...
          return self._sendCommand(CMD_x11_DATA_ENTRY_MODE, 0x03);
        }).then(resolve).catch(reject);
      });
    };

    base._updateDisplay = function(profile) {
      const self = this;
      const lutProfile = profile || QUICK;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          // Set RAM X Address...
          return self._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address + erroneous extra byte...
          return self._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00, 0x00]);
        }).then(function() {
          // Source driving voltage control...
          return self._sendCommand(CMD_x04_SOURCE_DRIVING_VOLTAGE_CTRL, [0x2d, 0xb2, 0x22]);
        }).then(function() {
          // VCOM register -1.5v...
          return self._sendCommand(CMD_x2c_WRITE_VCOM, 0x3c);
        }).then(function() {
          // Border control...
          // Black and White work well but Red and light Red need some work
          // Red works quite well although acording to the datasheet last
          // digit should be 3 to select LUT3.
          if (self.border === iUtils.BLACK) {
            return self._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0x00); // Black
          } else if (self.border === iUtils.LIGHT_RED) {
            return self._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0xC3); // Light Red
          } else if (self.border === iUtils.RED) {
            return self._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0x02); // Red
          } else {
            return self._sendCommand(CMD_x3c_BORDER_WAVEFORM_CTRL, 0xC1); // White
          }
        }).then(function() {
          // Send LUTs
          return self._sendCommand(CMD_x32_WRITE_LUT_REGISTER, lookupTableProfiles[lutProfile]);
        }).then(function() {
          // Set RAM X Address...
          return self._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address...
          return self._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00]);
        }).then(function() {
          // Set RAM X address counter...
          return self._sendCommand(CMD_x4e_SET_RAM_X_COUNTER, 0x00);
        }).then(function() {
          // Set RAM Y address counter...
          return self._sendCommand(CMD_x4f_SET_RAM_Y_COUNTER, [0x00, 0x00]);
        }).then(function() {
          // Black Buffer...
          return self._sendCommand(CMD_x24_WRITE_RAM_BW, self._blackBuffer);
        }).then(function() {
          // Set RAM X Address...
          return self._sendCommand(CMD_x44_SET_RAM_X_START_END, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address...
          return self._sendCommand(CMD_x45_SET_RAM_Y_START_END, [0x00, 0x00, 0xd3, 0x00]);
        }).then(function() {
          // Set RAM X address counter...
          return self._sendCommand(CMD_x4e_SET_RAM_X_COUNTER, 0x00);
        }).then(function() {
          // Set RAM Y address counter...
          return self._sendCommand(CMD_x4f_SET_RAM_Y_COUNTER, [0x00, 0x00]);
        }).then(function() {
          // Red Buffer...
          return self._sendCommand(CMD_x26_WRITE_RAM_RED, self._redBuffer);
        }).then(function() {
          // Display update setting...
          return self._sendCommand(CMD_x22_DISPLAY_UPDATE_CTRL_2, 0xc7);
        }).then(function() {
          // Display update activate...
          return self._sendCommand(CMD_x20_MASTER_ACTIVATION);
        }).then(function() {
          return sleep(50);
        }).then(function() {
          // Wait for the update to complete or reject the promise if
          // it takes more than 35 sec...
          return self._whenFree(35000);
        }).then(resolve).catch(reject);
      });
    };

    base._finishDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          // Deep sleep mode...
          return self._sendCommand(CMD_x10_DEEP_SLEEP_MODE);
        }).then(resolve).catch(reject);
      });
    };
  };

  module.exports.setLogFunction = function(logFunc) {
    logFunction = logFunc;
  };
})();
