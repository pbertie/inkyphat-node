/*jshint esversion: 6*/
const Gpio = require('onoff').Gpio;
const SPI = require('pi-spi');
const InkyphatSpi = require('./inkyphat_spi');
(function() {
  "use strict";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let inkyphatSpi = null;
  /**
    Create Multidimensional array.
  **/
  function createArray(length) {
    var arr = new Array(length || 0);

    if (arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      for (var i = 0; i < length; i++)
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
      if (inkyphatSpi === null) {
        inkyphatSpi = InkyphatSpi.getInstance();
      }
      this._width = inkyphatSpi.getWidth();
      this._height = inkyphatSpi.getHeight();
      this._buffer = createArray(this._width, this._height);
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
      return inkyphatSpi.border = color;
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

  Inkyphat.WHITE = InkyphatSpi.WHITE;
  Inkyphat.BLACK = InkyphatSpi.BLACK;
  Inkyphat.RED = InkyphatSpi.RED;

  module.exports = Inkyphat;
})();
