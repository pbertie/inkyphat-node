/* eslint-disable no-unused-expressions */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);
const expect = chai.expect;

const InkyphatController = require('../lib/inkyphat-controller');
const inkyphatUtils = require('../lib/inkyphat-utils');
const { RESET_PIN, BUSY_PIN, DC_PIN, LOW, HIGH, WHITE, RED } = inkyphatUtils;

let Gpio;
let Spi;
let RendererV1;
let RendererV2;
let spi;
let pinReset;
let pinBusy;
let pinDC;
let renderer;
let controller;

beforeEach(() => {
  inkyphatUtils.enableDelays = 0;
});

afterEach(() => {
  inkyphatUtils.enableDelays = 1;
});

const runTests = (version) => {
  beforeEach(() => {
    pinReset = {
      write: sinon.stub().callsFake((value, callback) => {
        callback(null);
      }),
      unexport: sinon.stub()
    };
    pinBusy = {
      read: sinon.stub().callsFake((callback) => {
        callback(null, version === 1 ? HIGH : LOW);
      }),
      unexport: sinon.stub()
    };
    pinDC = {
      write: sinon.stub().callsFake((value, callback) => {
        callback(null);
      }),
      unexport: sinon.stub()
    };

    Gpio = sinon.stub().callsFake((pin) => {
      expect(pin).to.be.oneOf([RESET_PIN, BUSY_PIN, DC_PIN]);
      if (pin === RESET_PIN) {
        return pinReset;
      } else if (pin === BUSY_PIN) {
        return pinBusy;
      } else if (pin === DC_PIN) {
        return pinDC;
      }
    });
    spi = {
      clockSpeed: sinon.stub()
    };
    Spi = {
      initialize: sinon.stub().returns(spi)
    };
    renderer = {
      render: sinon.stub(),
      clear: sinon.stub()
    };
    RendererV1 = sinon.stub().returns(renderer);
    RendererV2 = sinon.stub().returns(renderer);
  });

  describe('init', () => {
    it('creates the correct GPIO Pins', async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
      expect(Gpio).to.have.been.calledWith(RESET_PIN, 'out');
      expect(Gpio).to.have.been.calledWith(BUSY_PIN, 'in', 'both');
      expect(Gpio).to.have.been.calledWith(DC_PIN, 'out');
    });

    it('creates the correct SPI Device by default', async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
      expect(Spi.initialize).to.have.been.calledWith('/dev/spidev0.0');
    });

    it('creates the correct SPI Device when passed in', async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2, spiDevice: '/dev/spidev0.1' });
      await controller.init();
      expect(Spi.initialize).to.have.been.calledWith('/dev/spidev0.1');
    });

    it('creates SPI Device with correct clock speed', async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
      expect(spi.clockSpeed).to.have.been.calledWith(500000);
    });

    it('rejects if an error is thrown creating SPI Device', () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      Spi.initialize.throws(new Error('SPI Error'));
      return expect(controller.init()).to.eventually.rejectedWith('Failed to Setup SPI Device');
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
    });

    it('releases the GPIO Pins', async () => {
      expect(pinReset.unexport).to.not.have.been.called;
      expect(pinBusy.unexport).to.not.have.been.called;
      expect(pinDC.unexport).to.not.have.been.called;
      await controller.destroy();
      expect(pinReset.unexport).to.have.been.calledOnce;
      expect(pinBusy.unexport).to.have.been.calledOnce;
      expect(pinDC.unexport).to.have.been.calledOnce;
    });

    it('should not release the GPIO Pins if already done', async () => {
      expect(pinReset.unexport).to.not.have.been.called;
      expect(pinBusy.unexport).to.not.have.been.called;
      expect(pinDC.unexport).to.not.have.been.called;
      await controller.destroy();
      expect(pinReset.unexport).to.have.been.calledOnce;
      expect(pinBusy.unexport).to.have.been.calledOnce;
      expect(pinDC.unexport).to.have.been.calledOnce;
      await controller.destroy();
      expect(pinReset.unexport).to.have.been.calledOnce;
      expect(pinBusy.unexport).to.have.been.calledOnce;
      expect(pinDC.unexport).to.have.been.calledOnce;
    });
  });

  describe('redraw', () => {
    beforeEach(async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
    });

    it('calls render on renderer', async () => {
      expect(renderer.render).to.not.have.been.called;
      const buffer = [];
      const border = WHITE;
      const mode = 'anyMode';
      await controller.redraw(buffer, border, mode);
      expect(renderer.render).to.have.been.calledOnce;
    });

    it('passes same arguments to renderer', async () => {
      expect(renderer.render).to.not.have.been.called;
      const buffer = [];
      let border = WHITE;
      let mode = 'anyMode';
      await controller.redraw(buffer, border, mode);
      expect(renderer.render).to.have.been.calledWith(buffer, border, mode);
      border = RED;
      mode = 'anotherMode';
      await controller.redraw(buffer, border, mode);
      expect(renderer.render).to.have.been.calledWith(buffer, border, mode);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
    });

    it('calls clear on renderer', async () => {
      expect(renderer.clear).to.not.have.been.called;
      await controller.clear();
      expect(renderer.clear).to.have.been.calledOnce;
    });
  });

  describe('getVersion', () => {
    beforeEach(async () => {
      controller = InkyphatController({ Gpio, Spi, RendererV1, RendererV2 });
      await controller.init();
    });

    it('should return the version number', async () => {
      expect(await controller.getVersion()).to.equal(version);
    });

    it('should not use the pins when called after init', async () => {
      pinReset.write.resetHistory();
      pinBusy.read.resetHistory();
      pinDC.write.resetHistory();
      await controller.getVersion();
      expect(pinReset.write).to.not.have.been.called;
      expect(pinBusy.read).to.not.have.been.called;
      expect(pinDC.write).to.not.have.been.called;
    });
  });
};

describe('inkyphat-controller v1', () => {
  runTests(1);
});

describe('inkyphat-controller v2', () => {
  runTests(2);
});
