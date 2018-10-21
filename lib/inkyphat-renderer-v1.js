const { WHITE, BLACK, RED, HIGH, flushBuffer } = require('./inkyphat-utils');
const Renderer = require('./inkyphat-renderer');

const BOOSTER_SOFT_START = 0x06;
const POWER_SETTING = 0x01;
const POWER_OFF = 0x02;
const POWER_ON = 0x04;
const PANEL_SETTING = 0x00;
const OSCILLATOR_CONTROL = 0x30;
const RESOLUTION_SETTING = 0x61;
const VCOM_DC_SETTING = 0x82;
const VCOM_DATA_INTERVAL_SETTING = 0x50;
const DATA_START_TRANSMISSION_1 = 0x10;
const DATA_START_TRANSMISSION_2 = 0x13;
const DISPLAY_REFRESH = 0x12;

const PARTIAL_ENTER = 0x91;
const PARTIAL_EXIT = 0x92;
const PARTIAL_CONFIG = 0x90;

module.exports = class RendererV1 extends Renderer {
  constructor (props) {
    super({...props, freeState: HIGH});
    this.partial_mode = false;
    this.partial_config = null;
  }

  async _prepare () {
    await this._sendReset();
    // Wait for driver to be ready to talk
    await this._whenFree(1000);
    await this._sendCommand(POWER_SETTING, [0x07, 0x00, 0x0A, 0x00]);
    await this._sendCommand(BOOSTER_SOFT_START, [0x07, 0x07, 0x07]);
    await this._sendCommand(POWER_ON);
    // Wait for driver to be ready to talk
    await this._whenFree(1000);
    await this._sendCommand(PANEL_SETTING, [0b11001111]);
  }

  async _draw (border = WHITE) {
    // Pick border color...
    if (border === BLACK) {
      await this._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b11000000]); // Black
    } else if (border === RED) {
      await this._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b01000000]); // Red
    } else if (border === WHITE) {
      await this._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b10000000]); // White
    } else {
      await this._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0b00000000]); // None
    }
    await this._sendCommand(OSCILLATOR_CONTROL, [0x29]);
    await this._sendCommand(RESOLUTION_SETTING, [0x68, 0x00, 0xD4]);
    await this._sendCommand(VCOM_DC_SETTING, [0x0A]);
    if (this.partial_mode) { // TODO: Partial Mode not implemented
      await this._sendCommand(PARTIAL_CONFIG, this.partial_config);
      await this._sendCommand(PARTIAL_ENTER);
    } else {
      await this._sendCommand(PARTIAL_EXIT);
    }
    // Start black data transmission
    await this._sendCommand(DATA_START_TRANSMISSION_1, this.blackBuffer);
    // Start red data transmission
    await this._sendCommand(DATA_START_TRANSMISSION_2, this.redBuffer);
    await this._sendCommand(DISPLAY_REFRESH);
    await this._whenFree(35000);
  }

  async _finish () {
    await this._sendCommand(VCOM_DATA_INTERVAL_SETTING, [0x00]);
    await this._sendCommand(POWER_SETTING, [0x02, 0x00, 0x00, 0x00]);
    await this._sendCommand(POWER_OFF);
  }

  async render (buffer, border) {
    await this._prepare();
    await flushBuffer(buffer, this.blackBuffer, this.redBuffer);
    await this._draw(border);
    await this._finish();
  }

  async clear () {
    await this._prepare();
    this.blackBuffer.fill(WHITE);
    this.redBuffer.fill(WHITE);
    await this._draw(WHITE);
    await this._finish();
  }
}
