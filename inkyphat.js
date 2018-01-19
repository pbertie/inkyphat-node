(function () {
  const Gpio = require('onoff').Gpio;
  const SPI = require('pi-spi');
  //const util = require('util');
  //const sleep = util.promisify(setTimeout);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  function terminator () {
    console.log('Node server stopping.');
    RESET_PIN.unexport();
    BUSY_PIN.unexport();
    DC_PIN.unexport();
  }
  process.on('exit', terminator);

  //const RESET_PIN = 2; //27;
  //const BUSY_PIN = 0;  //17;
  //const DC_PIN = 3;    //22;
  
  const HIGH = 1;
  const LOW = 0;
  
  // Define RESET_PIN as OUTPUT...
  const RESET_PIN = new Gpio(27, 'out');
  // Define BUSY_PIN as INPUT with no Pull Up or Down...
  const BUSY_PIN =  new Gpio(17, 'in', 'both');
  // Define DC_PIN as OUTPUT...
  const DC_PIN =    new Gpio(22, 'out');

  const SPI_COMMAND = LOW;
  const SPI_DATA = HIGH;

  const V2_RESET = 0x12;

  const BOOSTER_SOFT_START = 0x06;
  const POWER_SETTING = 0x01;
  const POWER_OFF = 0x02;
  const POWER_ON = 0x04;
  const PANEL_SETTING = 0x00;
  const OSCILLATOR_CONTROL = 0x30;
  const TEMP_SENSOR_ENABLE = 0x41;
  const RESOLUTION_SETTING = 0x61;
  const VCOM_DC_SETTING = 0x82;
  const VCOM_DATA_INTERVAL_SETTING = 0x50;
  const DATA_START_TRANSMISSION_1 = 0x10;
  const DATA_START_TRANSMISSION_2 = 0x13;
  const DATA_STOP = 0x11;
  const DISPLAY_REFRESH = 0x12;
  const DEEP_SLEEP = 0x07;
  
  const PARTIAL_ENTER = 0x91;
  const PARTIAL_EXIT = 0x92;
  const PARTIAL_CONFIG = 0x90;
  
  const POWER_SAVE = 0xe3;

  const WHITE = 0;
  const BLACK = 1;
  const RED = 2;

  function createArray(length) {
    var arr = new Array(length || 0);
    
    if (arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      for (var i = 0; i < length; i++)
        arr[i] = createArray.apply(this, args);
    }
    return arr;
  }


  var Inkyphat = function (props) {
    // Ensure the _destroy function is called when node stops.
    process.on('exit', this._destroy.bind(this));
    this._spiDevice = undefined;
    this._border = WHITE;
  };

  Inkyphat.WHITE = WHITE;
  Inkyphat.BLACK = BLACK;
  Inkyphat.RED = RED;

  Inkyphat.prototype._destroy = function () {
    this.close();
  }


  Inkyphat.prototype.setBorder = function (color) {
    this._border = color;
  }
  
  Inkyphat.prototype.setPixel = function (x, y, color) {
    if (x >= 0 && y >= 0 && x < this._width && y < this._height) {
      this._buffer[x][y] = color;
    }
  }

  Inkyphat.prototype.drawRect = function (x1, y1, x2, y2, color) {
    let startX, startY,
    endX, endY;
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
    
    for (let i = startX; i < endX; i++) {
      for (let j = startY; j < endY; j++) {
        this.setPixel(i, j, color);
      }
    }
  }

  const BUF_RED = {
    WHITE: LOW,
    BLACK: LOW,
    RED: HIGH
  };
  const BUF_BLACK = {
    WHITE: HIGH,
    BLACK: LOW,
    RED: HIGH
  };
  
  function bufferValue(bufPalette, color) {
    return bufPalette[color === BLACK ? 'BLACK' : (color === RED ? 'RED' : 'WHITE')];
  }

  const bitPow = [128, 64, 32, 16, 8, 4, 2, 1];

  function createBuffers(buffer) {
    const width = buffer.length;
    const height = buffer[0].length;
    
    console.log('width: ' + width  + ', height: ' + height);
    const bytes = (width * height) / 8;
    const ret = {
      red: new Array(bytes),
      black: new Array(bytes)
    };
    
    let bytePos = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y += 8) {
        let valueRed = 0x00;
        let valueBlack = 0x00;
        
        for (let a = 0; a < 8; a++) {
          valueRed = valueRed +     (bufferValue(BUF_RED, buffer[x][y+a]) * bitPow[a]);
          valueBlack = valueBlack + (bufferValue(BUF_BLACK, buffer[x][y+a]) * bitPow[a]); 
        }
        
        ret.red[bytePos] = valueRed;
        ret.black[bytePos] = valueBlack;
        bytePos++;
      }
    }
    
    return ret;
  }


  Inkyphat.prototype.init = async function () {
    // Get version and configure palette...
    this._version = await this.getVersion();
    if (this._version === 1) {
      this._palette = [BLACK, WHITE, RED];
    } else {
      this._palette = [WHITE, BLACK, RED];
    }
    
    // Ensure any existing SPI Devices are closed before we start...
    this.close();
    
    // Setup SPI Device...
    this._spiDevice = "/dev/spidev0.0";
    this._spi = SPI.initialize(this._spiDevice);
    this._spi.clockSpeed(500000);
    if (this._spiDevice === -1) {
      throw new Error('Failed to Setup SPI Device');
    }
    console.info('SPI Device setup: ' + this._spiDevice);
    
    // Create buffers...
    this._width = 212;
    this._height = 104;
    this._buffer = createArray(this._width, this._height);
    //var bytes = (this._height * this._width) / 8;
    //this._bufBlack = new Array(bytes);
    //this._bufRed = new Array(bytes);
    //this._bufBlack.fill(0xff);
    //this._bufRed.fill(0x00);
  }
  
  Inkyphat.prototype.getWidth = function () {
    return this._width;
  }
  
  Inkyphat.prototype.getHeight = function () {
    return this._height;
  }

  Inkyphat.prototype.close = function () {
    if (this._spiDevice !== undefined) {
      console.info('Closing SPI Device: ' + this._spiDevice);
      this._spiDevice = undefined;
    }
  }

  Inkyphat.prototype.getVersion = async function () {
    
    DC_PIN.writeSync(LOW);
    RESET_PIN.writeSync(HIGH);
    
    
    
    RESET_PIN.writeSync(LOW);
    await sleep(100);
    
    RESET_PIN.writeSync(HIGH);
    await sleep(100);
    
    this.getVersion = function () {
      return this._version;
    };
    if (BUSY_PIN.readSync() === LOW) {
      console.log('InkyPhat Version 2');
      return 2;
    } else {
      console.log('InkyPhat Version 1');
      return 1;
    }
  }
  
  Inkyphat.prototype._busyWait = function (ms) {
    ms = ms | 2000;
    let waitFor = this.getVersion() === 1 ? HIGH : LOW;
    return new Promise(async function (resolve, reject) {
      let timedOut = false;
      let handle = setTimeout(function () {
        timedOut = true;
        console.log('Timed out');
        reject();
      }, ms);
      process.stdout.write('Busy...');
      while(BUSY_PIN.readSync() !== waitFor && !timedOut) {
        process.stdout.write('.');
        await sleep(500);
      }
      if (!timedOut) {
        clearTimeout(handle);
        process.stdout.write('Done\n');
        resolve();
      }
    });
  }

  Inkyphat.prototype.reset = async function () {
    RESET_PIN.writeSync(LOW);
    await sleep(100);
    
    RESET_PIN.writeSync(HIGH);
    await sleep(100);
    
    if (this.getVersion() == 2) {
      await this._sendCommand(V2_RESET);
    }
    return this._busyWait();
  }
  
  Inkyphat.prototype._spiWrite = function (dc, values) {
    var self = this;
    DC_PIN.writeSync(dc);
    if (values instanceof Array) {
    } else {
      values = [values];
    }
    return new Promise(function (resolve, reject) {
      self._spi.write(Buffer.from(values), function (e, d) {
        if (e) {
          console.error(e);
          reject(e);
        } else {
          resolve(d)
        }
      });
    });
  }
  
  Inkyphat.prototype._sendCommand = async function (cmd, data) {
    await this._spiWrite(SPI_COMMAND, [cmd]);
    if (data) {
      await this._sendData(data);
    }
  }
  
  Inkyphat.prototype._sendData = async function (data) {
    await this._spiWrite(SPI_DATA, data);
  }

  Inkyphat.prototype.update = async function () {
    await this._v2_init();
    
    //for (var i = 0; i < bytes; i++) {
    //  bufBlack[i] = 0b10110110;
    //  bufRed[i]   = 0b00100100;
    //}
    //bufBlack.fill(0x00, bufBlack.length -5);
    //bufRed.fill(0x00, bufBlack.length -5);
    
    //bufRed.fill(0xff, 0, 60);
    //bufRed.fill(0xff, bytes - 120, bytes);
    
    //bufBlack.fill(0x00, 0, 60);
    //bufBlack.fill(0x00, bytes - 240, bytes);
    const buffers = createBuffers(this._buffer);
    await this._v2_update(buffers.black, buffers.red);
    await this._v2_fini();
  }



  Inkyphat.prototype._v2_init = async function (data) {
    await this.reset();
    // Set analog control block...
    await this._sendCommand(0x74, 0x54);
    // Sent by dev board but undocumented...
    await this._sendCommand(0x75, 0x3b);
    
    // Driver output control (See page 22 of datasheet)...
    await this._sendCommand(0x01, [0xd3, 0x00, 0x00]);
    
    // Dummy line period...
    await this._sendCommand(0x3a, 0x07);
    
    // Gate line width...
    await this._sendCommand(0x3b, 0x04);
    
    // Data Entry Mode...
    await this._sendCommand(0x11, 0x03);
    
  }

  Inkyphat.prototype._v2_update = async function (bufBlack, bufRed) {
    // Set RAM X Address...
    await this._sendCommand(0x44, [0x00, 0x0c]);
    
    // Set RAM Y Address + erroneous extra byte...
    await this._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00, 0x00]);
    
    // Source driving voltage control...
    await this._sendCommand(0x04, [0x2d, 0xb2, 0x22]);
    
    // VCOM register -1.5v...
    await this._sendCommand(0x2c, 0x3c);
    
    // Border control...
    await this._sendCommand(0x3c, 0x00);
    if (this._border === BLACK) {
      await this._sendCommand(0x3c, 0x00);  // Black
    } else if (this._border === RED)  {
      await this._sendCommand(0x3c, 0x33);  // Red
    } else {
      await this._sendCommand(0x3c, 0xFF);  // White
    }
    
    // This is what the bit patten below is made up of...
    //const VSS  = 0b00;
    //const VSH1 = 0b01;
    //const VSL  = 0b10;
    //const VSH2 = 0b11;
    
    // Send LUTs
    await this._sendCommand(0x32, [
    //  Phase 0     Phase 1     Phase 2     Phase 3     Phase 4     Phase 5     Phase 6
    //  A B C D     A B C D     A B C D     A B C D     A B C D     A B C D     A B C D
  //  0b01001000, 0b10100000, 0b00010000, 0b00010000, 0b00010011, 0b00000000, 0b00000000, // LUT0 - Black
  //  0b01001000, 0b10100000, 0b10000000, 0b00000000, 0b00000011, 0b00000000, 0b00000000, // LUT1 - White
  //  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // IGNORE
  //  0b01001000, 0b10100101, 0b00000000, 0b10111011, 0b00000000, 0b00000000, 0b00000000, // LUT3 - Red
  //  0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, // LUT4 - VCOM
      
    //Pha0  Pha1  Pha2  Pha3  Pha4  Pha5  Pha6
      0x48, 0xa0, 0x10, 0x10, 0x13, 0x00, 0x00, // LUT0 - Black
      0x48, 0xa0, 0x80, 0x00, 0x03, 0x00, 0x00, // LUT1 - White
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // IGNORE
      0x48, 0xa5, 0x00, 0xbb, 0x00, 0x00, 0x00, // LUT3 - Red
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // LUT4 - VCOM
      
      
  //  Duration        | Repeat
  //  A   B   C   D   | 
      67, 10, 31, 10,   4,  // 0 Flash
      16,  8,  4,  4,   6,  // 1 Clear
       4,  8,  8, 32,  16,  // 2 Black
       4,  8,  8, 64,  32,  // 3 Red
       6,  6,  6,  2,   2,  // 4 Black sharpen
       0,  0,  0,  0,   0,  // 5
       0,  0,  0,  0,   0,  // 6
       0,  0,  0,  0,   0,  // 7
       0,  0,  0,  0,   0,  // 8
    ]);
    
    // Set RAM X Address...
    await this._sendCommand(0x44, [0x00, 0x0c]);
    // Set RAM Y Address...
    await this._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00]);
    // Set RAM X address counter...
    await this._sendCommand(0x4e, 0x00);
    // Set RAM Y address counter...
    await this._sendCommand(0x4f, [0x00, 0x00]);
    
    // Black Buffer...
    await this._sendCommand(0x24, bufBlack);
    
    
    // Set RAM X Address...
    await this._sendCommand(0x44, [0x00, 0x0c]);
    // Set RAM Y Address...
    await this._sendCommand(0x45, [0x00, 0x00, 0xd3, 0x00]);
    // Set RAM X address counter...
    await this._sendCommand(0x4e, 0x00);
    // Set RAM Y address counter...
    await this._sendCommand(0x4f, [0x00, 0x00]);
    
    // Red Buffer...
    await this._sendCommand(0x26, bufRed);
    
    
    // Display update setting...
    await this._sendCommand(0x22, 0xc7);
    // Display update activate...
    await this._sendCommand(0x20);
    await sleep(50);
    // Wait for the update to complete or reject the promise if
    // it takes more than 35 sec...
    await this._busyWait(35000);
  }
  
  Inkyphat.prototype._v2_fini = async function () {
    return true;
  }



  module.exports = Inkyphat;
})();
