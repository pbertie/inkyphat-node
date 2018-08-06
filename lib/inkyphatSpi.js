/*jshint esversion: 6*/
let Gpio = require('onoff').Gpio;
let Spi = require('pi-spi');
let iUtils = require('./inkyphatSpiUtils');
let inkyphatSpiV1 = require('./inkyphatSpiV1');
let inkyphatSpiV2 = require('./inkyphatSpiV2');

(function() {
  "use strict";

  const sleep = iUtils.sleep;
  const writePin = iUtils.writePin;
  const readPin = iUtils.readPin;
  const writeSpi = iUtils.writeSpi;
  const requireInitialised = iUtils.requireInitialised;

  const HIGH = iUtils.HIGH;
  const LOW = iUtils.LOW;

  const V2_RESET = 0x12;

  //let logFunction = Function.prototype;
  let logFunction = process.stdout.write.bind(process.stdout);

  class InkyPhatSpi {
    /**
     * SPI Interface for the Inkyphat.
     * @constructor
     * @param {string|object} [spiDevice='/dev/spidev0.0'] - SPI Device path or object to use as SPI Device e.g. testing.
     */
    constructor(spiDevice) {
      this._spiDevicePath = spiDevice || '/dev/spidev0.0';

      this._destroyed = false;
      this._initialised = false;
      this._blackBuffer = null;
      this._redBuffer = null;
      this._spi = null;
      this._version = null;

      this.border = iUtils.WHITE;
    }

    /**
     * Initialise the device, should only be called once.
     * Will determine the Inkyphat version, initialise the
     * SPI Device and GPIO Pins.
     * @returns {Promise} - Returns a promise that will be resolved when complete or rejected if error.
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

          // Define Reset Pin as OUTPUT...
          self._pinReset = new Gpio(iUtils.RESET_PIN, 'out');
          // Define Busy Pin as INPUT with no Pull Up or Down...
          self._pinBusy = new Gpio(iUtils.BUSY_PIN, 'in', 'both');
          // Define Data/Command Pin as OUTPUT...
          self._pinDC = new Gpio(iUtils.DC_PIN, 'out');
          logFunction('GPIO setup\n');

          self.getVersion().then(function() {
            // Create internal Buffers...
            self._createBuffers();

            // Setup SPI Device...
            try {
              self._spi = Spi.initialize(self._spiDevicePath);
            } catch (e) {
              logFunction('Failed to Setup SPI Device:\n');
              logFunction(e);
              reject('Failed to Setup SPI Device');
              return;
            }
            self._spi.clockSpeed(500000);

            logFunction('SPI Device setup: ' + self._spiDevicePath + '\n');
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
      if (!this._destroyed && this._initialised) {
        this._destroyed = true;
        //if (this._spi) {
        //  this._spi.close();
        //}
        if (this._pinReset) {
          this._pinReset.unexport();
        }
        if (this._pinBusy) {
          this._pinBusy.unexport();
        }
        if (this._pinDC) {
          this._pinDC.unexport();
        }
      }
    }

    getWidth() {
      return iUtils.WIDTH;
    }

    getHeight() {
      return iUtils.HEIGHT;
    }

    _createBuffers() {
      const bytes = (iUtils.WIDTH * iUtils.HEIGHT) / 8;
      this._blackBuffer = new Array(bytes);
      this._redBuffer = new Array(bytes);
    }

    isInitialised() {
      return this._initialised;
    }

    getVersion() {
      return requireInitialised(this, function(resolve, reject, self) {
        if (self._version === null) {
          // Run the following functions chained together...
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
              inkyphatSpiV2.mixin(self);
            } else {
              self._version = 1;
              inkyphatSpiV1.mixin(self);
            }
            resolve(self._version);
          }).catch(reject);
        } else {
          resolve(self._version);
        }
      });
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
            logFunction('Timed out');
            reject();
          }, timeout);

          logFunction('Busy...');

          function checkPin(busyValue) {
            if (busyValue === waitFor) {
              clearTimeout(handle);
              logFunction('Done\n');
              resolve();
            } else {
              logFunction('.');
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
        self._spiWrite(iUtils.SPI_COMMAND, [cmd]).then(function(result) {
          if (data !== undefined) {
            return self._spiWrite(iUtils.SPI_DATA, data);
          }
        }).then(resolve).catch(reject);
      });
    }

    /**
     * Redraw the screen with the values in the buffer.
     * Takes a Two Dimensional array where each element represents a pixel.
     * @param {array} buffer - Two Dimensional Array (212,104).
     * @param {string} profile - Profile to use when updating the screen.
     * @returns {Promise} - Return promise will be resolved when the screen redraw is comple.
     */
    redraw(buffer, profile) {
      return requireInitialised(this, function(resolve, reject, self) {
        if (!buffer || buffer.length != iUtils.WIDTH || buffer[0].length != iUtils.HEIGHT) {
          throw new Error('Invalid buffer');
        }

        if (profile && !inkyphatSpiV2.profiles.hasOwnProperty(profile)) {
          throw new Error('Invalid profile');
        }
        iUtils.flushBuffer(buffer, self._blackBuffer, self._redBuffer);
        self._initDisplay().then(function() {
          return self._updateDisplay(profile);
        }).then(function() {
          return self._finishDisplay();
        }).then(resolve).catch(reject);
      });
    }

    _initDisplay() {
      console.error('Inkyphat version not loaded');
    }

    _updateDisplay() {
      console.error('Inkyphat version not loaded');
    }

    _finishDisplay() {
      console.error('Inkyphat version not loaded');
    }
  }

  let instance = null;

  process.on('exit', function() {
    if (instance) {
      instance.destroy();
    }
  });

  module.exports.getInstance = function(spiDevice) {
    if (!instance) {
      instance = new InkyPhatSpi(spiDevice);
    }
    return instance;
  };

  module.exports.getNewInstance = function(spiDevice) {
    if (instance) {
      instance.destroy();
    }
    instance = new InkyPhatSpi(spiDevice);
    return instance;
  };

  module.exports.setSpiClass = function(SpiClass) {
    Spi = SpiClass;
  };

  module.exports.setGpioClass = function(GpioClass) {
    Gpio = GpioClass;
  };

  module.exports.setLogFunction = function(logFunc) {
    logFunction = logFunc;
  };

  module.exports.WHITE = iUtils.WHITE;
  module.exports.BLACK = iUtils.BLACK;
  module.exports.RED = iUtils.RED;
  module.exports.LIGHT_RED = iUtils.LIGHT_RED;

  module.exports.profiles = inkyphatSpiV2.profiles;

})();
