/*jshint esversion: 6*/

(function() {
  "use strict";

  // When initialised as a test this will be set to 0 and reduce all sleeps to 0...
  module.exports.enableDelays = 1;

  module.exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms * module.exports.enableDelays));
  const promiseCallback = (resolve, reject) => (err, data) => err ? reject(err) : resolve(data);
  module.exports.writePin = (pin, val) => new Promise((resolve, reject) => pin.write(val, promiseCallback(resolve, reject)));
  module.exports.readPin = pin => new Promise((resolve, reject) => pin.read(promiseCallback(resolve, reject)));
  module.exports.writeSpi = (spi, val) => new Promise((resolve, reject) => spi.write(val, promiseCallback(resolve, reject)));
  module.exports.requireInitialised = (self, fn) => new Promise((resolve, reject) => self.isInitialised() ? fn(resolve, reject, self) : reject('Not Initialised'));

  const HIGH = 1;
  const LOW = 0;
  module.exports.HIGH = HIGH;
  module.exports.LOW = LOW;

  module.exports.RESET_PIN = 27;
  module.exports.BUSY_PIN = 17;
  module.exports.DC_PIN = 22;

  module.exports.SPI_COMMAND = LOW;
  module.exports.SPI_DATA = HIGH;

  module.exports.WHITE = 0;
  module.exports.BLACK = 1;
  module.exports.RED = 2;

  const WIDTH = 212;
  const HEIGHT = 104;
  module.exports.WIDTH = WIDTH;
  module.exports.HEIGHT = HEIGHT;

  const RED_PALETTE = {
    WHITE: LOW,
    BLACK: LOW,
    RED: HIGH
  };
  const BLACK_PALETTE = {
    WHITE: HIGH,
    BLACK: LOW,
    RED: HIGH
  };
  const bitValue = [128, 64, 32, 16, 8, 4, 2, 1];

  function bufferValue(palette, color) {
    return palette[color === module.exports.BLACK ? 'BLACK' : (color === module.exports.RED ? 'RED' : 'WHITE')];
  }

  /**
   * Takes a Two Dimensional array where each element represents a pixel and
   * sets the black and red buffers ready to be set to the display.
   * If the Black and Red buffers are provided they will be updated, otherwise
   * new arrays will be created.
   * @param {byte[][]} buffer - Two Dimensional Array (212,104).
   * @param {byte[]} [blackBuffer] - Black Buffer to be updated.
   * @param {byte[]} [redBuffer] - Red Buffer to be updated.
   */
  module.exports.flushBuffer = function(buffer, blackBuffer, redBuffer) {
    blackBuffer = blackBuffer || new Array(WIDTH * (HEIGHT / 8));
    redBuffer = redBuffer || new Array(WIDTH * (HEIGHT / 8));
    let bytePos = 0;
    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT; y += 8) {
        let valueBlack = 0x00;
        let valueRed = 0x00;

        for (let a = 0; a < 8; a++) {
          valueBlack = valueBlack + (bufferValue(BLACK_PALETTE, buffer[x][y + a]) * bitValue[a]);
          valueRed = valueRed + (bufferValue(RED_PALETTE, buffer[x][y + a]) * bitValue[a]);
        }

        blackBuffer[bytePos] = valueBlack;
        redBuffer[bytePos] = valueRed;
        bytePos++;
      }
    }
    return {
      black: blackBuffer,
      red: redBuffer
    };
  };

})();
