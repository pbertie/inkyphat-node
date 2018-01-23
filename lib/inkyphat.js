/*jshint esversion: 6*/
let InkyphatSpi = require('./inkyphat_spi');
(function() {
  "use strict";

  let inkyphatSpi = null;

  /**
   * Create Multidimensional array.
   * @param {...number} length - Size of the array to create, each argument defines a dimension.
   */
  function createArray(length) {
    const arr = new Array(length);

    if (arguments.length > 1) {
      const args = Array.prototype.slice.call(arguments, 1);
      for (let i = 0; i < length; i++)
        arr[i] = createArray.apply(null, args);
    }
    return arr;
  }

  class Inkyphat {
    /**
     * Controller for the Inkyphat.
     * @constructor
     */
    constructor() {
      this.WHITE = InkyphatSpi.WHITE;
      this.BLACK = InkyphatSpi.BLACK;
      this.RED = InkyphatSpi.RED;

      this._width = inkyphatSpi.getWidth();
      this._height = inkyphatSpi.getHeight();
      this._buffer = createArray(this._width, this._height);
      this._buffer.forEach(item => item.fill(this.WHITE));
      inkyphatSpi.logging = true;
    }

    init() {
      return inkyphatSpi.init();
    }

    destroy() {
      return inkyphatSpi.destroy();
    }

    drawRect(x1, y1, x2, y2, color) {
      let startX,
        startY,
        endX,
        endY;
      if (x1 < x2) {
        startX = x1;
        endX = x2;
      } else {
        startX = x2;
        endX = x1;
      }

      if (y1 < y2) {
        startY = y1;
        endY = y2;
      } else {
        startY = y2;
        endY = y1;
      }

      for (let i = startX; i < endX; i++) {
        for (let j = startY; j < endY; j++) {
          this.setPixel(i, j, color);
        }
      }
    }

    setPixel(x, y, color) {
      if (x >= 0 && y >= 0 && x < this._width && y < this._height) {
        this._buffer[x][y] = color;
      }
    }

    setBorder(color) {
      inkyphatSpi.border = color;
    }

    getWidth() {
      return inkyphatSpi.getWidth();
    }

    getHeight() {
      return inkyphatSpi.getHeight();
    }

    redraw() {
      return inkyphatSpi.redraw(this._buffer);
    }
  }

  /**
   * Replace the InkyphatSpi module for testing.
   * @param {object} InkyphatSpiFactory - Mock of InkyphatSpi
   */
  module.exports.setInkyphatSpiFactory = function(InkyphatSpiFactory) {
    InkyphatSpi = InkyphatSpiFactory;
  };

  let instance;

  /**
   * Get the instance of the Inkyphat. Defaults to SPI 0.0 but
   * can be overridden but only on the first call.
   * @param {object} [spiDevice] - Override the default SPI Device Path to use.
   */
  module.exports.getInstance = function(spiDevice) {
    if (!inkyphatSpi) {
      inkyphatSpi = InkyphatSpi.getInstance(spiDevice);
    }
    if (!instance) {
      instance = new Inkyphat();
    }
    return instance;
  };
})();
