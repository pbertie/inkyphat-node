const inkyphat = require('../lib/inkyphat')({ logToStd: true });
async function main () {
  await inkyphat.init();

  inkyphat.setBorder(inkyphat.BLACK);

  // Default profile is quick (profiles only work with v2 screen)...
  console.log('Modes: ', inkyphat.getModes());
  inkyphat.setMode('pimoroni_yellow');

  let color = inkyphat.BLACK;
  for (let x = 0; x < (inkyphat.getWidth() / 4) - 2; x++) {
    for (let y = 1; y < (inkyphat.getHeight() / 4) - 1; y++) {
      inkyphat.drawRect(x * 4, y * 4, (x * 4) + 4, (y * 4) + 4, color);
      if (color === inkyphat.BLACK) {
        color = inkyphat.YELLOW;
      } else if (color === inkyphat.YELLOW) {
        color = inkyphat.WHITE;
      } else {
        color = inkyphat.BLACK;
      }
    }
  }

  await inkyphat.redraw();

  await inkyphat.destroy();
}
main();
