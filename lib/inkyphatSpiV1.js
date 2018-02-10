/*jshint esversion: 6*/
let iUtils = require('./inkyphatSpiUtils');

(function() {
  "use strict";

  const sleep = iUtils.sleep;

  const BOOSTER_SOFT_START = 0x06;
  const POWER_SETTING = 0x01;
  const POWER_OFF = 0x02;
  const POWER_ON = 0x04;
  const PANEL_SETTING = 0x00;
  const OSCILLATOR_CONTROL = 0x30;
  const RESOLUTION_SETTING = 0x61;
  const VCOM_DC_SETTING = 0x82;
  const VCOM_DATA_INTERVAL_SETTING = 0x50;
  const DATA_START_TRANSMISSION_1 = 0x10;
  const DATA_START_TRANSMISSION_2 = 0x13;
  const DISPLAY_REFRESH = 0x12;

  const PARTIAL_ENTER = 0x91;
  const PARTIAL_EXIT = 0x92;
  const PARTIAL_CONFIG = 0x90;

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
          // Wait for driver to be ready to talk
          return self._whenFree(1000);
        }).then(function() {
          return self._sendCommand(POWER_SETTING, [0x07, 0x00, 0x0A, 0x00]);
        }).then(function() {
          return self._sendCommand(BOOSTER_SOFT_START, [0x07, 0x07, 0x07]);
        }).then(function() {
          return self._sendCommand(POWER_ON);
        }).then(function() {
          // Wait for driver to be ready to talk
          return self._whenFree(1000);
        }).then(function() {
          return self._sendCommand(PANEL_SETTING, [0b11001111]);
        }).then(function() {
          // Pick border color...
          if (self.border === iUtils.BLACK) {
            return self._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b11000000]); // Black
          } else if (self.border === iUtils.RED) {
            return self._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b01000000]); // Red
          } else if (self.border === iUtils.WHITE) {
            return self._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b10000000]); // White
          } else {
            return self._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b00000000]); // None
          }
        }).then(function() {
          return self._sendCommand(OSCILLATOR_CONTROL, [0x29]);
        }).then(function() {
          return self._sendCommand(RESOLUTION_SETTING, [0x68, 0x00, 0xD4]);
        }).then(function() {
          return self._sendCommand(VCOM_DC_SETTING, [0x0A]);
        }).then(function() {
          if (self.partial_mode) {
            return self._sendCommand(PARTIAL_CONFIG, self.partial_config).then(function() {
              return self._sendCommand(PARTIAL_ENTER);
            });
          } else {
            return self._sendCommand(PARTIAL_EXIT);
          }
        }).then(resolve).catch(reject);
      });
    }

    base._updateDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          // Start black data transmission
          return self._sendCommand(DATA_START_TRANSMISSION_1, self._blackBuffer);
        }).then(function() {
          // Start red data transmission
          return self._sendCommand(DATA_START_TRANSMISSION_2, self._redBuffer);
        }).then(function() {
          return self._sendCommand(DISPLAY_REFRESH);
        }).then(function() {
          return self._whenFree(35000);
        }).then(resolve).catch(reject);
      });
    }

    base._finishDisplay = function() {
      const self = this;
      return new Promise(function(resolve, reject) {
        Promise.resolve().then(function() {
          return self._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0x00]);
        }).then(function() {
          return self._sendCommand(POWER_SETTING, [0x02, 0x00, 0x00, 0x00]);
        }).then(function() {
          return self._sendCommand(POWER_OFF);
        }).then(resolve).catch(reject);
      });
    }
  };

  module.exports.setLogFunction = function(logFunc) {
    logFunction = logFunc;
  };
})();
