/*jshint esversion: 6*/
/*jshint expr: true*/
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

const InkyphatSpi = require('../lib/inkyphat_spi');
(function() {
  "use strict";

  /* gloabl describe,it,beforeEach*/

  const expect = chai.expect;
  const RESET_PIN = 27;
  const BUSY_PIN = 17;
  const DC_PIN = 22;

  const HIGH = 1;
  const LOW = 0;

  const WIDTH = 212;
  const HEIGHT = 104;

  /**
   * Create Multidimensional array.
   * @param {...number} length - Size of the array to create, each argument defines a dimension.
   */
  function createArray(length) {
    const arr = new Array(length || 0);

    if (arguments.length > 1) {
      const args = Array.prototype.slice.call(arguments, 1);
      for (let i = 0; i < length; i++)
        arr[i] = createArray.apply(null, args);
    }
    return arr;
  }

  describe('inkyphat_spiSpec', function() {

    beforeEach(function() {
      const self = this;
      // Ensure the InkyphatSpi is not using the real SPI Interface or GPIO Pins...
      this.spiDevice = {
        clockSpeed: sinon.spy(),
        write: sinon.stub().callsFake(function(val, cb) {
          setTimeout(cb, 1);
        })
      };
      this.spiSpy = {
        initialize: sinon.stub().returns(this.spiDevice)
      };

      this.GpioSpy = function(pin, inout, watch) {
        this._pin = pin;
        this._inout = inout;
        this._watch = watch;
        sinon.spy(this, 'read');
        sinon.spy(this, 'write');
        sinon.spy(this, 'unexport');
        if (pin === RESET_PIN) {
          self.resetPin = this;
        } else if (pin === BUSY_PIN) {
          self.busyPin = this;
        } else if (pin === DC_PIN) {
          self.dcPin = this;
        }
      };
      this.GpioSpy.prototype.read = function(cb) {
        setTimeout(function() {
          cb(null, LOW);
        }, 1);
      };
      this.GpioSpy.prototype.write = function(val, cb) {
        setTimeout(cb, 1);
      };
      this.GpioSpy.prototype.unexport = Function.prototype;

      sinon.spy(this, 'GpioSpy');

      this.inkyphatSpi = InkyphatSpi.getNewTestInstance(null, this.spiSpy, this.GpioSpy);
      this.inkyphatSpi.logging = false;
    });



    it('Should have colors defined', function() {
      expect(InkyphatSpi.WHITE).to.equal(0);
      expect(InkyphatSpi.BLACK).to.equal(1);
      expect(InkyphatSpi.RED).to.equal(2);
    });

    describe('init', function() {
      it('Should create Reset GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.GpioSpy).to.have.been.calledWithNew;
          expect(self.GpioSpy).to.have.been.calledWith(RESET_PIN, 'out');
        });
      });

      it('Should create Data/Command GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.GpioSpy).to.have.been.calledWithNew;
          expect(self.GpioSpy).to.have.been.calledWith(DC_PIN, 'out');
        });
      });

      it('Should create Busy GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.GpioSpy).to.have.been.calledWithNew;
          expect(self.GpioSpy).to.have.been.calledWith(BUSY_PIN, 'in', 'both');
        });
      });

      it('Should initialise the SPI Interface with the default device', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.spiSpy.initialize).to.have.been.calledOnce;
          expect(self.spiSpy.initialize).to.have.been.calledWith('/dev/spidev0.0');
          expect(self.spiDevice.clockSpeed).to.have.been.calledWith(500000);
        });
      });

      it('Should create black and red buffers', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.inkyphatSpi._blackBuffer).to.have.length((WIDTH * HEIGHT) / 8);
          expect(self.inkyphatSpi._redBuffer).to.have.length((WIDTH * HEIGHT) / 8);
        });
      });

      it('Should call getVersion', function() {
        const self = this;
        sinon.spy(this.inkyphatSpi, 'getVersion');
        return this.inkyphatSpi.init().then(function() {
          expect(self.inkyphatSpi.getVersion).to.have.been.calledOnce;
        });
      });

      it('Should return resolved', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(true).to.equal(true);
        }, function() {
          expect(false).to.equal(true);
        });
      });

      it('Should reject if already called', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(self.inkyphatSpi.init()).to.be.rejectedWith('Already Initialised');
        });
      });

      it('Should reject if already destroyed', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          self.inkyphatSpi.destroy();
          expect(self.inkyphatSpi.init()).to.be.rejectedWith('Already Destroyed');
        });
      });

      it('Should show as initialised', function() {
        const self = this;
        expect(self.inkyphatSpi.isInitialised()).to.equal(false);
        return this.inkyphatSpi.init().then(function() {
          expect(self.inkyphatSpi.isInitialised()).to.equal(true);
        });
      });
    });

    describe('getHeight', function() {
      it('Should return the height', function() {
        expect(this.inkyphatSpi.getHeight()).to.equal(104);
      });
    });

    describe('getWidth', function() {
      it('Should return the width', function() {
        expect(this.inkyphatSpi.getWidth()).to.equal(212);
      });
    });

    describe('getVersion', function() {
      it('Should reject if called before initialised', function() {
        expect(this.inkyphatSpi.getVersion()).to.be.rejectedWith('Not Initialised');
      });

      it('Should send reset sequence and read busy pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          return self.inkyphatSpi.getVersion().then(function(version) {
            expect(version).to.equal(2);
            expect(self.dcPin.write).to.have.been.calledOnce;
            expect(self.dcPin.write).to.have.been.calledWith(LOW);
            expect(self.dcPin.read).not.to.have.been.called;

            expect(self.resetPin.write).to.have.been.calledThrice;
            expect(self.resetPin.write.getCall(0).args[0]).to.equal(HIGH);
            expect(self.resetPin.write.getCall(1).args[0]).to.equal(LOW);
            expect(self.resetPin.write.getCall(2).args[0]).to.equal(HIGH);
            expect(self.resetPin.read).not.to.have.been.called;

            expect(self.busyPin.read).to.have.been.called;
            expect(self.busyPin.write).not.to.have.been.called;
          });
        });
      });
    });

    describe('redraw', function() {
      it('Should eventually send the update screen command', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          sinon.spy(self.inkyphatSpi, '_sendCommand');
          return self.inkyphatSpi.redraw(createArray(WIDTH, HEIGHT));
        }).then(function() {
          expect(self.spiDevice.write).to.have.been.called;
          expect(self.inkyphatSpi._sendCommand).to.have.been.calledWith(0x20);
        });
      });
    });

  });
})();
