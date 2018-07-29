/*jshint esversion: 6*/
let iUtils = require('./inkyphatSpiUtils');

(function() {
  "use strict";

  const sleep = iUtils.sleep;

  //let logFunction = Function.prototype;
  let logFunction = process.stdout.write.bind(process.stdout);

  module.exports.mixin = function(base) {
    // Ensure the object being extend has the required functions...
    ['_sendReset', '_sendCommand', '_whenFree'].forEach(function(name) {
      if (typeof base[name] !== 'function') {
        throw new Error('Base cass must have \'' + name + '\' function.');
      }
    });

    base._initDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          return self._sendReset();
        }).then(function() {
          // Set analog control block...
          return self._sendCommand(0x74, 0x54);
        }).then(function() {
          // Set digital control block...
          return self._sendCommand(0x7E, 0x3b);
        }).then(function() {
          // Driver output control (See page 22 of datasheet)...
          return self._sendCommand(0x01, [0xd3, 0x00, 0x00]);
        }).then(function() {
          // Dummy line period...
          return self._sendCommand(0x3a, 0x07);
        }).then(function() {
          // Gate line width...
          return self._sendCommand(0x3b, 0x04);
        }).then(function() {
          // Data Entry Mode...
          return self._sendCommand(0x11, 0x03);
        }).then(resolve).catch(reject);
      });
    };

    base._updateDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          // Set RAM X Address...
          return self._sendCommand(0x44, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address + erroneous extra byte...
          return self._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00, 0x00]);
        }).then(function() {
          // Source driving voltage control...
          return self._sendCommand(0x04, [0x2d, 0xb2, 0x22]);
        }).then(function() {
          // VCOM register -1.5v...
          return self._sendCommand(0x2c, 0x3c);
        }).then(function() {
          // Border control...
          return self._sendCommand(0x3c, 0x00);
        }).then(function() {
          // Pick border color...
          if (self.border === iUtils.BLACK) {
            return self._sendCommand(0x3c, 0x00); // Black
          } else if (self.border === iUtils.RED) {
            return self._sendCommand(0x3c, 0x33); // Red
          } else {
            return self._sendCommand(0x3c, 0xF1); // White
          }
        }).then(function() {
          // This is what the bit patten below is made up of...
          //const VSS  = 0b00;
          //const VSH1 = 0b01;
          //const VSL  = 0b10;
          //const VSH2 = 0b11;

          // Send LUTs
          return self._sendCommand(0x32, [
            //    Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
            //    A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
            //  0b01001000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
            //  0b01001000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
            //  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT2 - Red
            //  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
            //  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

            //Pha0  Pha1  Pha2  Pha3  Pha4  Pha5  Pha6
            0x48, 0xa0, 0x10, 0x10, 0x13, 0x00, 0x00, // LUT0 - Black
            0x48, 0xa0, 0x80, 0x00, 0x03, 0x00, 0x00, // LUT1 - White
            0x48, 0xa5, 0x00, 0xbb, 0x00, 0x00, 0x00, // LUT2 - Red
            0x48, 0xa5, 0x00, 0xbb, 0x00, 0x00, 0x00, // LUT3 - Red
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // LUT4 - VCOM


            //  Duration  | Repeat
            //  A B C D   | X
            67, 10, 31, 10, 4, // Phase 0 (Flash?)
            16, 8, 4, 4, 6, // Phase 1 (Clear?)
            4, 8, 8, 32, 16, // Phase 2 (Black?)
            4, 8, 8, 64, 32, // Phase 3 (Red?)
            6, 6, 6, 2, 2, // Phase 4 (Black sharpen?)
            0, 0, 0, 0, 0, // Phase 5 (Skipped)
            0, 0, 0, 0, 0 // Phase 6 (Skipped)
          ]);
        }).then(function() {
          // Set RAM X Address...
          return self._sendCommand(0x44, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address...
          return self._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00]);
        }).then(function() {
          // Set RAM X address counter...
          return self._sendCommand(0x4e, 0x00);
        }).then(function() {
          // Set RAM Y address counter...
          return self._sendCommand(0x4f, [0x00, 0x00]);
        }).then(function() {
          // Black Buffer...
          return self._sendCommand(0x24, self._blackBuffer);
        }).then(function() {
          // Set RAM X Address...
          return self._sendCommand(0x44, [0x00, 0x0c]);
        }).then(function() {
          // Set RAM Y Address...
          return self._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00]);
        }).then(function() {
          // Set RAM X address counter...
          return self._sendCommand(0x4e, 0x00);
        }).then(function() {
          // Set RAM Y address counter...
          return self._sendCommand(0x4f, [0x00, 0x00]);
        }).then(function() {
          // Red Buffer...
          return self._sendCommand(0x26, self._redBuffer);
        }).then(function() {
          // Display update setting...
          return self._sendCommand(0x22, 0xc7);
        }).then(function() {
          // Display update activate...
          return self._sendCommand(0x20);
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
      // Version 2 does not need to do anything when the
      // screen update completes...
      return Promise.resolve();
    };
  };

  module.exports.setLogFunction = function(logFunc) {
    logFunction = logFunc;
  };
})();
