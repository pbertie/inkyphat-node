const { getLogger, WHITE, BLACK, LIGHT_RED, RED, WIDTH, HEIGHT, MODES } = require('./inkyphat-utils');

/**
 * Create Multidimensional array.
 * @param {...number} length - Size of the array to create, each argument defines a dimension.
 */
const createArray = (length, ...rest) => {
  const arr = new Array(length);

  if (rest.length > 0) {
    for (let i = 0; i < length; i++) {
      arr[i] = createArray(...rest);
    }
  }
  return arr;
}

module.exports = function ({
  ControllerFactory = require('./inkyphat-controller'),
  logToStd = false,
  logToConsole = false,
  debugLogging = false,
  mode = 'quick',
  border = WHITE
} = {}) {
  // Some privates...
  let controller = null;
  const logger = getLogger({ debugLogging, logToStd, logToConsole });
  // Create buffer and blank to white...
  const buffer = createArray(WIDTH, HEIGHT);
  buffer.forEach(col => col.fill(WHITE));

  if (!MODES[mode]) {
    logger.warn(`Unknown mode: ${mode}\nDefaulting to quick\n`);
    mode = 'quick';
  }

  class Inkyphat {
    constructor () {
      this.WHITE = WHITE;
      this.BLACK = BLACK;
      this.LIGHT_RED = LIGHT_RED;
      this.RED = RED;
    }

    async init ({ spiDevice } = {}) {
      await this.destroy();
      controller = ControllerFactory({ ...(spiDevice && { spiDevice }), ...(logger && { logger }) });
      return controller.init();
    }

    async destroy () {
      if (controller === null) {
        return;
      }
      const result = await controller.destroy();
      controller = null;
      return result;
    }

    async redraw (useMode = mode) {
      if (controller === null) {
        await this.init();
      }
      return controller.redraw(buffer, border, useMode);
    }

    async clearScreen () {
      if (controller === null) {
        await this.init();
      }
      return controller.clear();
    }

    clearBuffer () {
      buffer.forEach(col => col.fill(WHITE));
    }

    drawRect (x1, y1, x2, y2, color) {
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

      if (startX >= 0 && startY >= 0 && startX < WIDTH && startY < HEIGHT && endX >= 0 && endY >= 0 && endX < WIDTH && endY < HEIGHT) {
        for (let x = startX; x < endX; x++) {
          buffer[x].fill(color, startY, endY);
        }
      }
    }

    setPixel (x, y, color) {
      if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
        buffer[x][y] = color;
      }
    }

    setBorder (color) {
      border = color;
    }

    getWidth () {
      return WIDTH;
    }

    getHeight () {
      return HEIGHT;
    }

    getModes () {
      return Object.keys(MODES);
    }

    setMode (newMode) {
      if (!MODES[newMode]) {
        throw new Error('Unknown Mode: ' + newMode);
      }
      mode = newMode;
    }
  }

  const instance = new Inkyphat();

  process.on('exit', function () {
    if (instance) {
      instance.destroy();
    }
  });

  return instance;
};
