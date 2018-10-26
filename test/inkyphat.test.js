
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);
const expect = chai.expect;

const Inkyphat = require('../lib/inkyphat');
const { WHITE, BLACK, LIGHT_RED, RED, WIDTH, HEIGHT } = require('../lib/inkyphat-utils');

let inkyphat;
let controller;
let controllerFactory;

beforeEach(() => {
  controller = {
    init: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
    getVersion: sinon.stub().resolves(2),
    redraw: sinon.stub().resolves(),
    clear: sinon.stub().resolves()
  };
});

afterEach(async function () {
  if (inkyphat) {
    await inkyphat.destroy();
  }
});

describe('inkyphat factory', () => {
  it('should default mode to quick', async function () {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller) });
    await inkyphat.redraw();
    expect(controller.redraw).to.have.been.called;
    expect(controller.redraw.getCall(0).args[2]).to.equal('quick');
  });

  it('should allow mode to be set', async function () {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), mode: 'pimoroni' });
    await inkyphat.redraw();
    expect(controller.redraw).to.have.been.called;
    expect(controller.redraw.getCall(0).args[2]).to.equal('pimoroni');
  });

  it('should revert back to quick if invalid mode is set', async function () {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), mode: 'some-unknown-mode' });
    await inkyphat.redraw();
    expect(controller.redraw).to.have.been.called;
    expect(controller.redraw.getCall(0).args[2]).to.equal('quick');
  });

  it('should default border to white', async function () {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller) });
    await inkyphat.redraw();
    expect(controller.redraw).to.have.been.called;
    expect(controller.redraw.getCall(0).args[1]).to.equal(WHITE);
  });

  it('should allow border to be set', async function () {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), border: BLACK });
    await inkyphat.redraw();
    expect(controller.redraw).to.have.been.called;
    expect(controller.redraw.getCall(0).args[1]).to.equal(BLACK);
  });
});

describe('inkyphat', () => {
  beforeEach(() => {
    controllerFactory = sinon.stub().returns(controller);
    inkyphat = Inkyphat({ ControllerFactory: controllerFactory });
  });

  it('should return width and height that match utils', () => {
    expect(inkyphat.getWidth()).to.equal(WIDTH);
    expect(inkyphat.getHeight()).to.equal(HEIGHT);
  });

  it('should expose colours from utils', () => {
    expect(inkyphat.WHITE).to.equal(WHITE);
    expect(inkyphat.BLACK).to.equal(BLACK);
    expect(inkyphat.LIGHT_RED).to.equal(LIGHT_RED);
    expect(inkyphat.RED).to.equal(RED);
  });

  it('should return modes available', () => {
    expect(inkyphat.getModes()).to.deep.equal(['pimoroni', 'quick', 'noFlash', 'clear']);
  });

  it('should not pass spiDevice to controller if not specified', async function () {
    await inkyphat.init();
    expect(controllerFactory).to.have.been.called;
    expect(controllerFactory.getCall(0).args[0]).to.not.have.property('spiDevice');
  });

  it('should pass spiDevice to controller if passed when initialised', async function () {
    await inkyphat.init({ spiDevice: '/dev/spidev0.1' });
    expect(controllerFactory).to.have.been.called;
    expect(controllerFactory.getCall(0).args[0]).to.deep.include({
      spiDevice: '/dev/spidev0.1'
    });
  });

  describe('clearSceen', () => {
    it('should initialize contoller if not already done', async function () {
      expect(controller.init).to.not.have.been.called;
      await inkyphat.clearScreen();
      expect(controller.init).to.have.callCount(1);
      await inkyphat.clearScreen();
      expect(controller.init).to.have.callCount(1);
    });

    it('should not initialize contoller if already done', async function () {
      await inkyphat.init();
      controller.init.resetHistory();
      expect(controller.init).to.not.have.been.called;
      await inkyphat.clearScreen();
      expect(controller.init).to.not.have.been.called;
    });

    it('should call clear on controller', async function () {
      expect(controller.clear).to.not.have.been.called;
      await inkyphat.clearScreen();
      expect(controller.clear).to.have.callCount(1);
    });
  });

  describe('redraw', () => {
    it('should initialize contoller if not already done', async function () {
      expect(controller.init).to.not.have.been.called;
      await inkyphat.redraw();
      expect(controller.init).to.have.callCount(1);
      await inkyphat.redraw();
      expect(controller.init).to.have.callCount(1);
    });

    it('should not initialize contoller if already done', async function () {
      await inkyphat.init();
      controller.init.resetHistory();
      expect(controller.init).to.not.have.been.called;
      await inkyphat.redraw();
      expect(controller.init).to.not.have.been.called;
    });

    it('should call redraw on controller', async function () {
      expect(controller.redraw).to.not.have.been.called;
      await inkyphat.redraw();
      expect(controller.redraw).to.have.callCount(1);
    });

    it('should pass controller buffer, border colour and mode', async function () {
      expect(controller.redraw).to.not.have.been.called;
      inkyphat.setBorder(RED);
      inkyphat.setMode('noFlash');
      await inkyphat.redraw();
      expect(controller.redraw).to.have.callCount(1);
      expect(controller.redraw.getCall(0).args[0].length).to.equal(WIDTH);
      expect(controller.redraw.getCall(0).args[0][0].length).to.equal(HEIGHT);
      expect(controller.redraw.getCall(0).args[1]).to.equal(RED);
      expect(controller.redraw.getCall(0).args[2]).to.equal('noFlash');
    });

    it('should allow the mode to be overridden for this call only', async function () {
      expect(controller.redraw).to.not.have.been.called;
      inkyphat.setBorder(RED);
      inkyphat.setMode('noFlash');
      await inkyphat.redraw('pimoroni');
      expect(controller.redraw).to.have.callCount(1);
      expect(controller.redraw.getCall(0).args[2]).to.equal('pimoroni');
      await inkyphat.redraw();
      expect(controller.redraw).to.have.callCount(2);
      expect(controller.redraw.getCall(1).args[2]).to.equal('noFlash');
    });
  });

  describe('setMode', () => {
    it('should set default mode used by redraw', async function () {
      await inkyphat.redraw();
      expect(controller.redraw).to.have.callCount(1);
      expect(controller.redraw.getCall(0).args[2]).to.equal('quick');
      inkyphat.setMode('noFlash');
      await inkyphat.redraw();
      expect(controller.redraw).to.have.callCount(2);
      expect(controller.redraw.getCall(1).args[2]).to.equal('noFlash');
    });

    it('should error if an unknown mode is passed', () => {
      expect(() => {
        inkyphat.setMode('some_unkown');
      }).to.throw('Unknown Mode: some_unkown');
    })
  });

  describe('clearBuffer', () => {
    it('should set all elements in the buffer to white', async function () {
      inkyphat.drawRect(10, 10, 0, 0, RED);
      inkyphat.drawRect(150, 50, WIDTH, HEIGHT, BLACK);
      inkyphat.setPixel(30, 40, RED);
      await inkyphat.redraw();
      let buffer = controller.redraw.getCall(0).args[0];
      for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
          if (x < 10 && y < 10) {
            expect(buffer[x][y], `pre-clear red { ${x}, ${y} }`).to.equal(RED);
          } else if (x >= 150 && y >= 50) {
            expect(buffer[x][y], `pre-clear black { ${x}, ${y} }`).to.equal(BLACK);
          } else if (x === 30 && y === 40) {
            expect(buffer[x][y], `pre-clear red { ${x}, ${y} }`).to.equal(RED);
          } else {
            expect(buffer[x][y], `pre-clear white { ${x}, ${y} }`).to.equal(WHITE);
          }
        }
      }

      inkyphat.clearBuffer();
      await inkyphat.redraw();
      buffer = controller.redraw.getCall(1).args[0];
      for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
          expect(buffer[x][y], `post-clear white { ${x}, ${y} }`).to.equal(WHITE);
        }
      }
    });
  });
});
