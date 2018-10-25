
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

beforeEach(() => {
  controller = {
    init: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
    getVersion: sinon.stub().resolves(2),
    redraw: sinon.stub().resolves(),
    clear: sinon.stub().resolves()
  };
});

describe('inkyphat factory', () => {
  it('should default mode to quick', () => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller) });
    return inkyphat.redraw().then(() => {
      expect(controller.redraw).to.have.been.called;
      expect(controller.redraw.getCall(0).args[2]).to.equal('quick');
    });
  });

  it('should allow mode to be set', () => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), mode: 'pimoroni' });
    return inkyphat.redraw().then(() => {
      expect(controller.redraw).to.have.been.called;
      expect(controller.redraw.getCall(0).args[2]).to.equal('pimoroni');
    });
  });

  it('should revert back to quick if invalid mode is set', () => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), mode: 'some-unknown-mode' });
    return inkyphat.redraw().then(() => {
      expect(controller.redraw).to.have.been.called;
      expect(controller.redraw.getCall(0).args[2]).to.equal('quick');
    });
  });

  it('should default border to white', () => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller) });
    return inkyphat.redraw().then(() => {
      expect(controller.redraw).to.have.been.called;
      expect(controller.redraw.getCall(0).args[1]).to.equal(WHITE);
    });
  });

  it('should allow border to be set', () => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller), border: BLACK });
    return inkyphat.redraw().then(() => {
      expect(controller.redraw).to.have.been.called;
      expect(controller.redraw.getCall(0).args[1]).to.equal(BLACK);
    });
  });
});

describe('inkyphat', () => {
  beforeEach(() => {
    inkyphat = Inkyphat({ ControllerFactory: sinon.stub().returns(controller) });
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
});
