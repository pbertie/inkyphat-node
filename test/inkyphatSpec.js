/*jshint esversion: 6*/
/*jshint expr: true*/
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Inkyphat = require('../lib/inkyphat');
(function() {
  "use strict";

  /* gloabl describe,it,beforeEach*/

  const expect = chai.expect;
  const RESET_PIN = 27;
  const BUSY_PIN = 17;
  const DC_PIN = 22;

  const WHITE = 0;
  const BLACK = 1;
  const RED = 2;

  const WIDTH = 212;
  const HEIGHT = 104;

  let spiSpy;
  let GpioSpy;

  // Stub out inkyphatSpi ...
  const stubs = {};
  stubs.inkyphatSpi = {
    border: WHITE,
    logging: false,
    init: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
    getWidth: sinon.stub().returns(WIDTH),
    getHeight: sinon.stub().returns(HEIGHT),
    isInitialised: sinon.stub().returns(false),
    getVersion: sinon.stub().resolves(2),
    redraw: sinon.stub().resolves(),
  };
  stubs.InkyphatSpi = {
    getInstance: sinon.stub().returns(stubs.inkyphatSpi),
    getNewTestInstance: sinon.spy(),
    WHITE: WHITE,
    BLACK: BLACK,
    RED: RED
  };

  Inkyphat.setInkyphatSpiFactory(stubs.InkyphatSpi);
  const inkyphat = Inkyphat.getInstance();

  describe('inkyphatSpec', function() {

    beforeEach(function() {
      // As Inkyphat is a singleton and keeps a instance of InkyphatSpi
      // we can't get a new instance. Instead we reset it each time.
      stubs.InkyphatSpi.getInstance.resetHistory();
      stubs.InkyphatSpi.getInstance.returns(stubs.inkyphatSpi);
      stubs.InkyphatSpi.getNewTestInstance.resetHistory();

      stubs.inkyphatSpi.border = WHITE;
      stubs.inkyphatSpi.logging = false;
      stubs.inkyphatSpi.init.resetHistory();
      stubs.inkyphatSpi.init.resolves();
      stubs.inkyphatSpi.destroy.resetHistory();
      stubs.inkyphatSpi.destroy.resolves();
      stubs.inkyphatSpi.getWidth.resetHistory();
      stubs.inkyphatSpi.getWidth.returns(WIDTH);
      stubs.inkyphatSpi.getHeight.resetHistory();
      stubs.inkyphatSpi.getHeight.returns(HEIGHT);
      stubs.inkyphatSpi.isInitialised.resetHistory();
      stubs.inkyphatSpi.isInitialised.returns(false);
      stubs.inkyphatSpi.getVersion.resetHistory();
      stubs.inkyphatSpi.getVersion.resolves(2);
      stubs.inkyphatSpi.redraw.resetHistory();
      stubs.inkyphatSpi.redraw.resolves();
    });

    afterEach(function() {
      expect(stubs.InkyphatSpi.getNewTestInstance).not.to.have.been.called;
    });

    it('Should have colors defined', function() {
      expect(inkyphat.WHITE).to.equal(WHITE);
      expect(inkyphat.BLACK).to.equal(BLACK);
      expect(inkyphat.RED).to.equal(RED);
    });

    describe('getInstance', function() {
      it('Should return the same instance when called more than once', function() {
        expect(Inkyphat.getInstance()).to.equal(inkyphat);
      });
    });
    describe('getWidth', function() {
      it('Should ask inkyphatSpi for the width', function() {
        expect(stubs.inkyphatSpi.getWidth).not.to.have.been.called;
        expect(inkyphat.getWidth()).to.equal(WIDTH);
        expect(stubs.inkyphatSpi.getWidth).to.have.been.called;
      });
    });

    describe('getHeight', function() {
      it('Should ask inkyphatSpi for the height', function() {
        expect(stubs.inkyphatSpi.getHeight).not.to.have.been.called;
        expect(inkyphat.getHeight()).to.equal(HEIGHT);
        expect(stubs.inkyphatSpi.getHeight).to.have.been.called;
      });
    });

    describe('init', function() {
      it('Should call init on inkyphatSpi and resolve if successful', function() {
        expect(stubs.inkyphatSpi.init).not.to.have.been.called;
        const result = inkyphat.init();
        expect(stubs.inkyphatSpi.init).to.have.been.called;
        return expect(result).to.eventually.be.undefined;
      });

      it('Should call init on inkyphatSpi and reject if unsuccessful', function() {
        stubs.inkyphatSpi.init.rejects();
        expect(stubs.inkyphatSpi.init).not.to.have.been.called;
        const result = inkyphat.init();
        expect(stubs.inkyphatSpi.init).to.have.been.called;
        return expect(result).to.be.rejected;
      });
    });

    describe('destroy', function() {
      it('Should call destroy on inkyphatSpi', function() {
        expect(stubs.inkyphatSpi.destroy).not.to.have.been.called;
        const result = inkyphat.destroy();
        expect(stubs.inkyphatSpi.destroy).to.have.been.called;
      });
    });

    describe('redraw', function() {
      it('Should call redraw on inkyphatSpi with the screen buffer', function() {
        expect(stubs.inkyphatSpi.redraw).not.to.have.been.called;
        const result = inkyphat.redraw();
        expect(stubs.inkyphatSpi.redraw).to.have.been.called;
        expect(stubs.inkyphatSpi.redraw).to.have.been.calledWith(sinon.match(function(buffer) {
          if (buffer && buffer.length === WIDTH) {
            return buffer.every(item => item.length === HEIGHT);
          }
          return false;
        }, 'Must be called with Array(' + WIDTH + ', ' + HEIGHT + ')'));
        return expect(result).to.eventually.be.undefined;
      });
    });

    describe('setBorder', function() {
      it('Should set border property on inkyphatSpi', function() {
        inkyphat.setBorder(RED);
        expect(stubs.inkyphatSpi.border).to.equal(RED);
        inkyphat.setBorder(BLACK);
        expect(stubs.inkyphatSpi.border).to.equal(BLACK);
        inkyphat.setBorder(WHITE);
        expect(stubs.inkyphatSpi.border).to.equal(WHITE);
      });
    });

    describe('setPixel', function() {
      it('Should alter the correct element in the buffer', function() {
        inkyphat.setPixel(3, 5, RED);
        inkyphat.redraw();
        // TODO: If this matcher fails it freezes node. Find out why.
        expect(stubs.inkyphatSpi.redraw).to.have.been.calledWith(sinon.match(function(buffer) {
          if (buffer && buffer.length === WIDTH) {
            return buffer[3][5] === RED;
          }
          return false;
        }));
      });

      it('Should do nothing if position is out of range', function() {
        const bufferCopy = inkyphat._buffer.slice(0);
        inkyphat.setPixel(300, 5, BLACK);
        expect(inkyphat._buffer).to.deep.equal(bufferCopy);
      });

    });
    describe('drawRect', function() {
      beforeEach(function() {
        sinon.stub(inkyphat, 'setPixel');
      });

      afterEach(function() {
        inkyphat.setPixel.restore();
      });

      it('Should call setPixel for each pixel within the rect', function() {
        inkyphat.drawRect(2, 4, 10, 14, RED);

        expect(inkyphat.setPixel.callCount).to.equal(80);
        for (let x = 2; x < 10; x++) {
          for (let y = 4; y < 14; y++) {
            expect(inkyphat.setPixel).to.have.been.calledWith(x, y, RED);
          }
        }

      });

      it('Should work when dimensions are backwards', function() {
        inkyphat.drawRect(50, 80, 40, 75, RED);

        expect(inkyphat.setPixel.callCount).to.equal(50);
        for (let x = 40; x < 50; x++) {
          for (let y = 75; y < 80; y++) {
            expect(inkyphat.setPixel).to.have.been.calledWith(x, y, RED);
          }
        }
      });
    });
  });
})();
