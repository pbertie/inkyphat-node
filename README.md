# inkyphat
[![Build Status](https://travis-ci.org/pbertie/inkyphat-node.svg?branch=master)](https://travis-ci.org/pbertie/inkyphat-node) [![Coverage Status](https://coveralls.io/repos/github/pbertie/inkyphat-node/badge.svg?branch=master)](https://coveralls.io/github/pbertie/inkyphat-node?branch=master) [![dependencies Status](https://david-dm.org/pbertie/inkyphat/status.svg)](https://david-dm.org/pbertie/inkyphat) [![devDependencies Status](https://david-dm.org/pbertie/inkyphat/dev-status.svg)](https://david-dm.org/pbertie/inkyphat?type=dev) [![npm version](https://img.shields.io/npm/v/inkyphat.svg)](https://www.npmjs.com/package/inkyphat) [![npm downloads](https://img.shields.io/npm/dt/inkyphat.svg)](https://www.npmjs.com/package/inkyphat)

A NodeJS Module to allow you to control the Inkyphat for Raspberry Pi. Based on the Python code available from [Pimoroni](https://github.com/pimoroni/inky-phat).

## Installation

  `npm install inkyphat`

## Usage

```js
const inkyphat = require('inkyphat')();

async function main() {

  await inkyphat.init();

  inkyphat.setPixel(1, 5, inkyphat.RED);

  inkyphat.drawRect(50, 100, inkyphat.BLACK);

  await inkyphat.redraw();

  await inkyphat.destroy();
}
main();
```


## Tests

  `npm test` - Run Tests.

  `npm run coverage` - Run Tests and display coverage.

  `npm run lint` - Run ES Lint

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.
