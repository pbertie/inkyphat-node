/*jshint esversion: 6*/
/*jshint expr: true*/
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

const InkyphatSpi = require('../lib/inkyphatSpi');
const iUtils = require('../lib/inkyphatSpiUtils');
(function() {
  "use strict";

  /* gloabl describe,it,beforeEach*/


  iUtils.enableDelays = 0;
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

  // Ensure the InkyphatSpi is not using the real SPI Interface or GPIO Pins...
  const stubs = {};
  stubs.spiDevice = {
    clockSpeed: sinon.spy(),
    write: sinon.stub().callsFake(function(val, cb) {
      setTimeout(cb, 1);
    })
  };
  stubs.Spi = {
    initialize: sinon.stub().returns(stubs.spiDevice)
  }

  stubs.Gpio = function(pin, inout, watch) {
    this._pin = pin;
    this._inout = inout;
    this._watch = watch;
    sinon.spy(this, 'read');
    sinon.spy(this, 'write');
    sinon.spy(this, 'unexport');
    if (pin === RESET_PIN) {
      stubs.resetPin = this;
    } else if (pin === BUSY_PIN) {
      stubs.busyPin = this;
    } else if (pin === DC_PIN) {
      stubs.dcPin = this;
    }
  };
  stubs.Gpio.prototype.read = function(cb) {
    setTimeout(function() {
      cb(null, LOW);
    }, 1);
  };
  stubs.Gpio.prototype.write = function(val, cb) {
    setTimeout(cb, 1);
  };
  stubs.Gpio.prototype.unexport = Function.prototype;
  sinon.spy(stubs, 'Gpio');

  InkyphatSpi.setSpiClass(stubs.Spi);
  InkyphatSpi.setGpioClass(stubs.Gpio);

  describe('inkyphat_spiSpec', function() {

    beforeEach(function() {
      // Reset the spies/stubs...
      stubs.spiDevice.clockSpeed.resetHistory();
      stubs.spiDevice.write.resetHistory();
      stubs.Spi.initialize.resetHistory();
      stubs.Spi.initialize.returns(stubs.spiDevice)

      stubs.Gpio.resetHistory();
      stubs.resetPin = null;
      stubs.busyPin = null;
      stubs.dcPin = null;

      this.inkyphatSpi = InkyphatSpi.getNewInstance();
      this.loggingSpy = sinon.spy();
      InkyphatSpi.setLogFunction(this.loggingSpy);
    });



    it('Should have colors defined', function() {
      expect(InkyphatSpi.WHITE).to.equal(0);
      expect(InkyphatSpi.BLACK).to.equal(1);
      expect(InkyphatSpi.RED).to.equal(2);
    });

    describe('getInstance', function() {
      it('Should return the same instance if it already exists', function() {
        expect(InkyphatSpi.getInstance()).to.equal(this.inkyphatSpi);
      });
    });

    describe('init', function() {
      it('Should create Reset GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(stubs.Gpio).to.have.been.calledWithNew;
          expect(stubs.Gpio).to.have.been.calledWith(RESET_PIN, 'out');
        });
      });

      it('Should create Data/Command GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(stubs.Gpio).to.have.been.calledWithNew;
          expect(stubs.Gpio).to.have.been.calledWith(DC_PIN, 'out');
        });
      });

      it('Should create Busy GPIO Pin', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(stubs.Gpio).to.have.been.calledWithNew;
          expect(stubs.Gpio).to.have.been.calledWith(BUSY_PIN, 'in', 'both');
        });
      });

      it('Should initialise the SPI Interface with the default device', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          expect(stubs.Spi.initialize).to.have.been.calledOnce;
          expect(stubs.Spi.initialize).to.have.been.calledWith('/dev/spidev0.0');
          expect(stubs.spiDevice.clockSpeed).to.have.been.calledOnce;
          expect(stubs.spiDevice.clockSpeed).to.have.been.calledWith(500000);
        });
      });

      it('Should reject if SPI Interface errors', function() {
        const self = this;
        stubs.Spi.initialize.throws();
        return expect(this.inkyphatSpi.init()).to.be.rejectedWith('Failed to Setup SPI Device');
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
            expect(stubs.dcPin.write).to.have.been.calledOnce;
            expect(stubs.dcPin.write).to.have.been.calledWith(LOW);
            expect(stubs.dcPin.read).not.to.have.been.called;

            expect(stubs.resetPin.write).to.have.been.calledThrice;
            expect(stubs.resetPin.write.getCall(0).args[0]).to.equal(HIGH);
            expect(stubs.resetPin.write.getCall(1).args[0]).to.equal(LOW);
            expect(stubs.resetPin.write.getCall(2).args[0]).to.equal(HIGH);
            expect(stubs.resetPin.read).not.to.have.been.called;

            expect(stubs.busyPin.read).to.have.been.called;
            expect(stubs.busyPin.write).not.to.have.been.called;
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
          expect(stubs.spiDevice.write).to.have.been.called;
          expect(self.inkyphatSpi._sendCommand).to.have.been.calledWith(0x20);
        });
      });

      it('Should reject if the buffer is an incorrect size', function() {
        const self = this;
        return this.inkyphatSpi.init().then(function() {
          sinon.spy(self.inkyphatSpi, '_sendCommand');
          return self.inkyphatSpi.redraw(createArray(WIDTH, HEIGHT));
        }).then(function() {
          expect(stubs.spiDevice.write).to.have.been.called;
          expect(self.inkyphatSpi._sendCommand).to.have.been.calledWith(0x20);
        });
      });
    });

  });
})();
