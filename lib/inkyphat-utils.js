// When initialised as a test this will be set to 0 and reduce all sleeps to 0...
module.exports.enableDelays = 1;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms * module.exports.enableDelays));
module.exports.sleep = sleep;
const promiseCallback = (resolve, reject) => (err, data) => err ? reject(err) : resolve(data);
module.exports.writePin = (pin, val) => new Promise((resolve, reject) => pin.write(val, promiseCallback(resolve, reject)));
const readPin = pin => new Promise((resolve, reject) => pin.read(promiseCallback(resolve, reject)));
module.exports.readPin = readPin;
module.exports.writeSpi = (spi, val) => new Promise((resolve, reject) => spi.write(val, promiseCallback(resolve, reject)));

module.exports.pollPin = (pin, waitFor, timeout = 2000, interval = 500, progressCallback = () => {}) => new Promise((resolve, reject) => {
  const handle = setTimeout(function () {
    reject(new Error('Timeout'));
  }, timeout);

  const checkPin = (busyValue) => {
    if (busyValue === waitFor) {
      clearTimeout(handle);
      resolve();
    } else {
      progressCallback();
      return sleep(interval).then(() => readPin(pin)).then(checkPin);
    }
  }

  return readPin(pin).then(checkPin);
});

const stdoutLog = process.stdout.write.bind(process.stdout);
const consoleLog = (type) => console[type].bind(console);
const noLog = () => {};
const setLogFn = ({ logToStd, logToConsole, type }) => {
  if (logToStd) {
    return stdoutLog;
  } else if (logToConsole) {
    return consoleLog(type);
  } else {
    return noLog;
  }
}

module.exports.getLogger = ({ debugLogging, ...props } = {}) => ({
  log: setLogFn({ ...props, type: 'log' }),
  info: setLogFn({ ...props, type: 'info' }),
  warn: setLogFn({ ...props, type: 'warn' }),
  debug: debugLogging ? setLogFn({ ...props, type: 'debug' }) : noLog,
  error: setLogFn({ ...props, type: 'error' })
});

// const PIMORONI = 'pimoroni';
// const QUICK = 'quick';
// const NO_FLASH = 'noFlash';
// const CLEAR = 'clear';

module.exports.MODES = {
  pimoroni: 'p',
  quick: 'q',
  noFlash: 'nf',
  clear: '_'
};

const HIGH = 1;
const LOW = 0;
module.exports.HIGH = HIGH;
module.exports.LOW = LOW;

module.exports.RESET_PIN = 27;
module.exports.BUSY_PIN = 17;
module.exports.DC_PIN = 22;

module.exports.SPI_COMMAND = LOW;
module.exports.SPI_DATA = HIGH;

module.exports.WHITE = 0;
module.exports.BLACK = 1;
module.exports.LIGHT_RED = 3;
module.exports.RED = 2;

const WIDTH = 212;
const HEIGHT = 104;
module.exports.WIDTH = WIDTH;
module.exports.HEIGHT = HEIGHT;

const RED_PALETTE = {
  WHITE: LOW,
  BLACK: LOW,
  LIGHT_RED: HIGH,
  RED: HIGH
};
const BLACK_PALETTE = {
  WHITE: HIGH,
  BLACK: LOW,
  LIGHT_RED: LOW,
  RED: HIGH
};
const bitValue = [128, 64, 32, 16, 8, 4, 2, 1];

function bufferValue (palette, color) {
  return palette[color === module.exports.BLACK ? 'BLACK' : (color === module.exports.RED ? 'RED' : (color === module.exports.LIGHT_RED ? 'LIGHT_RED' : 'WHITE'))];
}

/**
   * Takes a Two Dimensional array where each element represents a pixel and
   * sets the black and red buffers ready to be set to the display.
   * If the Black and Red buffers are provided they will be updated, otherwise
   * new arrays will be created.
   * @param {byte[][]} buffer - Two Dimensional Array (212,104).
   * @param {byte[]} [blackBuffer] - Black Buffer to be updated.
   * @param {byte[]} [redBuffer] - Red Buffer to be updated.
   */
module.exports.flushBuffer = function (buffer, blackBuffer, redBuffer) {
  blackBuffer = blackBuffer || new Array(WIDTH * (HEIGHT / 8));
  redBuffer = redBuffer || new Array(WIDTH * (HEIGHT / 8));
  let bytePos = 0;
  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y += 8) {
      let valueBlack = 0x00;
      let valueRed = 0x00;

      for (let a = 0; a < 8; a++) {
        valueBlack = valueBlack + (bufferValue(BLACK_PALETTE, buffer[x][y + a]) * bitValue[a]);
        valueRed = valueRed + (bufferValue(RED_PALETTE, buffer[x][y + a]) * bitValue[a]);
      }

      blackBuffer[bytePos] = valueBlack;
      redBuffer[bytePos] = valueRed;
      bytePos++;
    }
  }
  return {
    black: blackBuffer,
    red: redBuffer
  };
};
