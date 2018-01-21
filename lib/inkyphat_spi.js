/*jshint esversion: 6*/
const Gpio = require('onoff').Gpio;
const SPI = require('pi-spi');

(function() {
  "use strict";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const applyAsync = (acc, val) => typeof val === 'function' ? acc.then(val) : sleep(val);
  const promiseCallback = (resolve, reject) => (err, data) => err ? reject(err) : resolve(data);
  const writePin = (pin, val) => new Promise((resolve, reject) => pin.write(val, promiseCallback(resolve, reject)));
  const readPin = pin => new Promise((resolve, reject) => pin.read(promiseCallback(resolve, reject)));
  const writeSpi = (spi, val) => new Promise((resolve, reject) => spi.write(val, promiseCallback(resolve, reject)));

  const HIGH = 1;
  const LOW = 0;

  const RESET_PIN = 27;
  const BUSY_PIN = 17;
  const DC_PIN = 22;

  const SPI_COMMAND = LOW;
  const SPI_DATA = HIGH;

  const V2_RESET = 0x12;

  const BOOSTER_SOFT_START = 0x06;
  const POWER_SETTING = 0x01;
  const POWER_OFF = 0x02;
  const POWER_ON = 0x04;
  const PANEL_SETTING = 0x00;
  const OSCILLATOR_CONTROL = 0x30;
  const TEMP_SENSOR_ENABLE = 0x41;
  const RESOLUTION_SETTING = 0x61;
  const VCOM_DC_SETTING = 0x82;
  const VCOM_DATA_INTERVAL_SETTING = 0x50;
  const DATA_START_TRANSMISSION_1 = 0x10;
  const DATA_START_TRANSMISSION_2 = 0x13;
  const DATA_STOP = 0x11;
  const DISPLAY_REFRESH = 0x12;
  const DEEP_SLEEP = 0x07;

  const PARTIAL_ENTER = 0x91;
  const PARTIAL_EXIT = 0x92;
  const PARTIAL_CONFIG = 0x90;

  const POWER_SAVE = 0xe3;

  const WHITE = 0;
  const BLACK = 1;
  const RED = 2;

  const WIDTH = 212;
  const HEIGHT = 104;

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
    return palette[color === BLACK ? 'BLACK' : (color === RED ? 'RED' :
      'WHITE')];
  }


  class InkyPhatSpi {
    /**
     * SPI Interface for the Inkyphat.
     * @constructor
     * @param {string|object} [spiDevice='/dev/spidev0.0'] - SPI Device path or object to use as SPI Device e.g. testing.
     * @param {object} [spiInterface=] - Override the SPI Interface. This allows testing when SPI is not available.
     * @param {object} [gpioInterface=] - Override the GPIO Interface. This allows testing when GPIO is not available.
     */
    constructor(spiDevice, spiInterface, gpioInterface) {
      this._spiDevicePath = spiDevice || '/dev/spidev0.0';
      this._spiInterfaceOverride = spiInterface;
      this._gpioInterfaceOverride = gpioInterface;

      this._destroyed = false;
      this._initialised = false;
      this._blackBuffer = null;
      this._redBuffer = null;
      this._spi = null;
      this._version = null;

      this.border = WHITE;
      this.logging = false;
    }

    /**
     * Initialise the device, shoudl only be called once.
     * Will determine the Inkyphat version, initialise the
     * SPI Device and GPIO Pins.
     * @returns {Promise} - Returns a promise that will be resolved when completee or rejected if error.
     */
    init() {
      const self = this;
      return new Promise(function(resolve, reject) {
        if (self._destroyed) {
          reject('Already Destroyed');
        } else if (self._initialised) {
          reject('Already Initialised');
        } else {
          self._initialised = true;

          const GpioInterface = self._gpioInterfaceOverride || Gpio;
          const SpiInterfaceOverride = self._spiInterfaceOverride || SPI;

          // Define Reset Pin as OUTPUT...
          self._pinReset = new GpioInterface(RESET_PIN, 'out');
          // Define Busy Pin as INPUT with no Pull Up or Down...
          self._pinBusy = new GpioInterface(BUSY_PIN, 'in', 'both');
          // Define Data/Command Pin as OUTPUT...
          self._pinDC = new GpioInterface(DC_PIN, 'out');

          self.getVersion().then(function() {
            // Create internal Buffers...
            self._createBuffers();

            // Setup SPI Device...
            self._spi = SpiInterfaceOverride.initialize(self._spiDevicePath);
            if (self._spi === -1) {
              reject('Failed to Setup SPI Device');
            }
            self._spi.clockSpeed(500000);
            if (self.logging) {
              console.info('SPI Device setup: ' + self._spiDevicePath);
              console.info('GPIO setup');
            }
            resolve();
          }).catch(reject);
        }
      });
    }

    /**
     * Releases resources. This class will be unable to control
     * the device once it's been called.
     */
    destroy() {
      if (this._destroyed) {
        console.error('Already Destroyed');
      } else if (this._initialised) {
        this._destroyed = true;

        this._pinReset.unexport();
        this._pinBusy.unexport();
        this._pinDC.unexport();
        console.info('GPIO Released');
      }
    }

    getWidth() {
      return WIDTH;
    }

    getHeight() {
      return HEIGHT;
    }

    _createBuffers() {
      const bytes = (WIDTH * HEIGHT) / 8;
      this._blackBuffer = new Array(bytes);
      this._redBuffer = new Array(bytes);
    }

    getVersion() {
      const self = this;
      return new Promise(function(resolve, reject) {
        if (self._version === null) {
          // Run the following functions chained together, where number sleep is called...
          Promise.resolve().then(function() {
            return writePin(self._pinDC, LOW);
          }).then(function() {
            return writePin(self._pinReset, HIGH);
          }).then(function() {
            return writePin(self._pinReset, LOW);
          }).then(function() {
            return sleep(100);
          }).then(function() {
            return writePin(self._pinReset, HIGH);
          }).then(function() {
            return sleep(100);
          }).then(function() {
            return readPin(self._pinBusy);
          }).then(function(busyValue) {
            if (busyValue === LOW) {
              self._version = 2;
            } else {
              self._version = 1;
            }
            resolve(self._version);
          }).catch(reject);
        } else {
          resolve(self._version);
        }
      });
    }

    /**
     * Takes a Two Dimensional array where each element represents a pixel and
     * sets the internal buffers ready to be set to the display.
     * @param {array} buffer - Two Dimensional Array (212,104).
     */
    _flushBuffer(buffer) {
      let bytePos = 0;
      for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y += 8) {
          let valueBlack = 0x00;
          let valueRed = 0x00;

          for (let a = 0; a < 8; a++) {
            valueBlack = valueBlack + (bufferValue(BLACK_PALETTE, buffer[x][y + a]) * bitValue[a]);
            valueRed = valueRed + (bufferValue(RED_PALETTE, buffer[x][y + a]) * bitValue[a]);
          }

          this._blackBuffer[bytePos] = valueBlack;
          this._redBuffer[bytePos] = valueRed;
          bytePos++;
        }
      }
    }

    /**
     * Wait for the busy pin to indicate it is no longer busy.
     * If the timeout is reached it will stop checking and
     * reject the promise.
     * @param {number} [timeout=2000] - Number of ms before rejecting the promise.
     * @param {number} [interval=500] - Number of ms between each check.
     */
    _whenFree(timeout, interval) {
      const self = this;
      return new Promise(function(resolve, reject) {
        timeout = timeout | 2000;
        interval = interval | 500;
        let waitFor = HIGH;
        let timedOut = false;
        let handle;
        self.getVersion().then(function(version) {
          if (version === 2) {
            waitFor = LOW;
          }

          // Create a timeout that triggers when we've waited too long...
          handle = setTimeout(function() {
            timedOut = true;
            if (self.logging) {
              process.stdout.write('Timed out');
            }
            reject();
          }, timeout);

          if (self.logging) {
            process.stdout.write('Busy...');
          }

          function checkPin(busyValue) {
            if (busyValue === waitFor) {
              clearTimeout(handle);
              if (self.logging) {
                process.stdout.write('Done\n');
              }
              resolve();
            } else {
              if (self.logging) {
                process.stdout.write('.');
              }
              return sleep(interval).then(function() {
                return readPin(self._pinBusy);
              }).then(checkPin);
            }
          }
          return readPin(self._pinBusy).then(checkPin);
        }).catch(reject);
      });
    }

    _sendReset() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          return writePin(self._pinReset, LOW);
        }).then(function() {
          return sleep(100);
        }).then(function() {
          return writePin(self._pinReset, HIGH);
        }).then(function() {
          return sleep(100);
        }).then(function() {
          if (self.version === 2) {
            return self._sendCommand(V2_RESET);
          }
        }).then(function() {
          return self._whenFree(200);
        }).then(resolve).catch(reject);
      });
    }

    _spiWrite(dc, values) {
      const self = this;
      return new Promise(function(resolve, reject) {
        writePin(self._pinDC, dc).then(function() {
          if (!(values instanceof Array)) {
            values = [values];
          }
          return writeSpi(self._spi, Buffer.from(values));
        }).then(resolve).catch(reject);
      });
    }

    _sendCommand(cmd, data) {
      const self = this;
      return new Promise(function(resolve, reject) {
        self._spiWrite(SPI_COMMAND, [cmd]).then(function(result) {
          if (data !== undefined) {
            return self._sendData(data);
          }
        }).then(resolve).catch(reject);
      });
    }

    _sendData(data) {
      return this._spiWrite(SPI_DATA, data);
    }

    /**
     * Redraw the screen with the values in the buffer.
     * Takes a Two Dimensional array where each element represents a pixel.
     * @param {array} buffer - Two Dimensional Array (212,104).
     * @returns {Promise} - Return promise will be resolved when the screen redraw is comple.
     */
    redraw(buffer) {
      const self = this;
      return new Promise(function(resolve, reject) {
        self._flushBuffer(buffer);
        self._initDisplay().then(function() {
          return self._updateDisplay();
        }).then(function() {
          return self._finishDisplay();
        }).then(resolve).catch(reject);
      });
    }

    _initDisplay() {
      if (this.version === 1) {
        return this._initDisplayV1();
      } else {
        return this._initDisplayV2();
      }
    }

    _updateDisplay() {
      if (this.version === 1) {
        return this._updateDisplayV1();
      } else {
        return this._updateDisplayV2();
      }
    }

    _finishDisplay() {
      if (this.version === 1) {
        return this._finishDisplayV1();
      } else {
        return this._finishDisplayV2();
      }
    }

    _initDisplayV1() {
      console.warn('Inkyphat v1 not currently supported');
    }

    _updateDisplayV1() {
      console.warn('Inkyphat v1 not currently supported');
    }

    _finishDisplayV1() {
      console.warn('Inkyphat v1 not currently supported');
    }

    _initDisplayV2() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          return self._sendReset();
        }).then(function() {
          // Set analog control block...
          return self._sendCommand(0x74, 0x54);
        }).then(function() {
          // Sent by dev board but undocumented...
          return self._sendCommand(0x75, 0x3b);
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
    }

    _updateDisplayV2() {
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
          if (self.border === BLACK) {
            return self._sendCommand(0x3c, 0x00); // Black
          } else if (self.border === RED) {
            return self._sendCommand(0x3c, 0x33); // Red
          } else {
            return self._sendCommand(0x3c, 0xFF); // White
          }
        }).then(function() {
          // This is what the bit patten below is made up of...
          //const VSS  = 0b00;
          //const VSH1 = 0b01;
          //const VSL  = 0b10;
          //const VSH2 = 0b11;

          // Send LUTs
          return self._sendCommand(0x32, [
            //  Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
            //  A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
            //  0b01001000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
            //  0b01001000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
            //  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // IGNORE
            //  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
            //  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM

            //Pha0  Pha1  Pha2  Pha3  Pha4  Pha5  Pha6
            0x48, 0xa0, 0x10, 0x10, 0x13, 0x00, 0x00, // LUT0 - Black
            0x48, 0xa0, 0x80, 0x00, 0x03, 0x00, 0x00, // LUT1 - White
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // IGNORE
            0x48, 0xa5, 0x00, 0xbb, 0x00, 0x00, 0x00, // LUT3 - Red
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // LUT4 - VCOM


            //  Duration        | Repeat
            //  A   B   C   D   |
            67, 10, 31, 10, 4, // 0 Flash
            16, 8, 4, 4, 6, // 1 Clear
            4, 8, 8, 32, 16, // 2 Black
            4, 8, 8, 64, 32, // 3 Red
            6, 6, 6, 2, 2, // 4 Black sharpen
            0, 0, 0, 0, 0, // 5
            0, 0, 0, 0, 0, // 6
            0, 0, 0, 0, 0, // 7
            0, 0, 0, 0, 0, // 8
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
    }

    _finishDisplayV2() {
      // Version 2 does not need to do anything when the
      // screen update completes...
      return Promise.resolve();
    }
  }

  let inkyphatSpi = null;

  process.on('exit', function() {
    if (inkyphatSpi) {
      console.info('Inkyphat SPI Destroy');
      inkyphatSpi.destroy();
    } else {
      console.info('Inkyphat SPI not created');
    }
  });

  module.exports.getInstance = function(spiDevice) {
    if (!inkyphatSpi) {
      inkyphatSpi = new InkyPhatSpi(spiDevice)
    }
    return inkyphatSpi;
  };

  module.exports.getNewTestInstance = function(spiDevice, spiInterface, gpioInterface) {
    if (inkyphatSpi) {
      inkyphatSpi.destroy();
    }
    inkyphatSpi = new InkyPhatSpi(spiDevice, spiInterface, gpioInterface)
    return inkyphatSpi;
  };

  module.exports.WHITE = WHITE;
  module.exports.BLACK = BLACK;
  module.exports.RED = RED;

})();
