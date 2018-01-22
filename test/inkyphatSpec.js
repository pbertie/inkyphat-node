/*jshint esversion: 6*/
const chai = require('chai');
const Inkyphat = require('../lib/inkyphat');
const InkyphatSpi = require('../lib/inkyphat_spi');
(function() {
  "use strict";

  /* gloabl describe,it*/

  const expect = chai.expect;
  const RESET_PIN = 27;
  const BUSY_PIN = 17;
  const DC_PIN = 22;

  let spiSpy;
  let GpioSpy;

  describe('inkyphatSpec', function() {

    beforeEach(function() {
      // Ensure the InkyphatSpi is not using the real SPI Interface or GPIO Pins...
      spiSpy = {
        initialize: function() {
          return {
            clockSpeed: Function.prototype,
            write: function(val, cb) {
              setTimeout(cb, 1);
            }
          };
        }
      };
      GpioSpy = function(pin, inout, watch) {
        this._pin = pin;
        this._inout = inout;
        this._watch = watch;
      };
      GpioSpy.prototype.read = function(cb) {
        setTimeout(function() {
          cb(null, 0);
        }, 1);
      };
      GpioSpy.prototype.write = function(val, cb) {
        setTimeout(cb, 1);
      };
      GpioSpy.prototype.unexport = Function.prototype;
      InkyphatSpi.getNewTestInstance(null, spiSpy, GpioSpy);
    });

    it('Should have colors defined', function() {
      //let inkyphat = new Inkyphat();
      expect(Inkyphat.WHITE).to.equal(0);
      expect(Inkyphat.BLACK).to.equal(1);
      expect(Inkyphat.RED).to.equal(2);
    });
  });
})();
