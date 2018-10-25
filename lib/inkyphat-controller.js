const OnOffGpio = require('onoff').Gpio;
const piSpi = require('pi-spi');
const { getLogger, RESET_PIN, BUSY_PIN, DC_PIN, LOW, HIGH, writePin, readPin, sleep } = require('./inkyphat-utils');

const ControllerFactory = function ({ spiDevice = '/dev/spidev0.0', Gpio = OnOffGpio, Spi = piSpi, logger = getLogger() } = {}) {
  // Some privates...
  let pinReset;
  let pinBusy;
  let pinDC;
  let spi;
  let version;
  let renderer;

  class Controller {
    async init () {
      logger.info('initialising\n');

      // Define Reset Pin as OUTPUT...
      pinReset = new Gpio(RESET_PIN, 'out');
      // Define Busy Pin as INPUT with no Pull Up or Down...
      pinBusy = new Gpio(BUSY_PIN, 'in', 'both');
      // Define Data/Command Pin as OUTPUT...
      pinDC = new Gpio(DC_PIN, 'out');

      // Setup SPI Device...
      try {
        spi = Spi.initialize(spiDevice);
      } catch (e) {
        logger.error('Failed to Setup SPI Device:\n');
        logger.error(e);
        throw new Error('Failed to Setup SPI Device');
      }
      spi.clockSpeed(500000);

      logger.info('SPI Device setup: ' + spiDevice + '\n');

      // Reports the version but also loads in versions renderer...
      logger.info(`initialised (v${await this.getVersion()})\n`);
    }

    async destroy () {
      logger.info('destroying\n');
      if (pinReset) {
        pinReset.unexport();
        pinReset = null;
      }
      if (pinBusy) {
        pinBusy.unexport();
        pinBusy = null;
      }
      if (pinDC) {
        pinDC.unexport();
        pinDC = null;
      }
      logger.info('destroyed\n');
    }

    async getVersion () {
      if (!version) {
        await writePin(pinDC, LOW);
        await writePin(pinReset, HIGH);
        await writePin(pinReset, LOW);
        await sleep(100);
        await writePin(pinReset, HIGH);
        await sleep(100);
        const busyValue = await readPin(pinBusy);

        let Renderer;
        if (busyValue === LOW) {
          version = 2;
          Renderer = require('./inkyphat-renderer-v2');
        } else {
          version = 1;
          Renderer = require('./inkyphat-renderer-v1');
        }
        renderer = new Renderer({ logger, pinReset, pinBusy, pinDC, spi });
      }
      return version
    }

    async redraw (buffer, border, mode) {
      await renderer.render(buffer, border, mode);
    }

    async clear () {
      await renderer.clear();
    }
  }
  return new Controller();
};

module.exports = ControllerFactory;
