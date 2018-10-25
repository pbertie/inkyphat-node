const { WIDTH, HEIGHT, writePin, pollPin, writeSpi, sleep, SPI_COMMAND, SPI_DATA, LOW, HIGH } = require('./inkyphat-utils');

module.exports = class Renderer {
  constructor ({ logger, pinReset, pinBusy, pinDC, spi, freeState }) {
    this.logger = logger;
    this.pinReset = pinReset;
    this.pinBusy = pinBusy;
    this.pinDC = pinDC;
    this.spi = spi;
    this.freeState = freeState;

    const bytes = (WIDTH * HEIGHT) / 8;
    this.blackBuffer = new Array(bytes);
    this.redBuffer = new Array(bytes);
  }

  async _spiWrite (dc, values) {
    await writePin(this.pinDC, dc);
    if (!(values instanceof Array)) {
      values = [values];
    }
    return writeSpi(this.spi, Buffer.from(values));
  }

  async _sendCommand (cmd, data) {
    await this._spiWrite(SPI_COMMAND, [cmd]);
    if (data !== undefined) {
      await this._spiWrite(SPI_DATA, data);
    }
  }

  async _sendReset () {
    await writePin(this.pinReset, LOW);
    await sleep(100);
    await writePin(this.pinReset, HIGH);
    await sleep(100);
    await this._sendResetCommand();
    await this._whenFree(200);
  }

  _sendResetCommand () {

  }

  async _whenFree (timeout, interval) {
    try {
      this.logger.info('Busy...')
      await pollPin(this.pinBusy, this.freeState, timeout, interval, () => this.logger.info('.'));
      this.logger.info('Done\n')
    } catch (error) {
      console.error(error);
      this.logger.error(error.toString());
      throw error;
    }
  }
}
