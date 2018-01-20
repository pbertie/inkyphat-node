# inkyphat [![Build Status](https://travis-ci.org/pbertie/inkyphat-node.svg?branch=master)](https://travis-ci.org/pbertie/inkyphat-node) [![Coverage Status](https://coveralls.io/repos/github/pbertie/inkyphat-node/badge.svg?branch=master)](https://coveralls.io/github/pbertie/inkyphat-node?branch=master)

A NodeJS Module to allow you to control the Inkyphat for Raspberry Pi. Based on the Python code available here: https://github.com/pimoroni/inky-phat

## Installation

  `npm install inkyphat`

## Usage

    let Inkyphat = require('inkyphat');
    let inkyphat - new Inkyphat();

    await inkyphat.init();
    
    inkyphat.setPixel(1, 5, Inkyphat.RED);
    
    inkyphat.drawRect(50, 100, Inkyphat.BLACK);
    
    await inkyphat.update();
    
    inkyphat.close();


## Tests

  `npm test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.
