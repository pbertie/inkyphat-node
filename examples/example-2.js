const inkyphat = require('../lib/inkyphat')({ logToStd: true });

async function main () {
  await inkyphat.init();
  inkyphat.setBorder(inkyphat.RED);

  let color = inkyphat.BLACK;
  for (let x = 0; x < (inkyphat.getWidth() / 2) - 1; x++) {
    for (let y = 0; y < (inkyphat.getHeight() / 2) - 2; y++) {
      inkyphat.drawRect(x * 2, y * 2, (x * 2) + 2, (y * 2) + 2, color);
      if (color === inkyphat.BLACK) {
        color = inkyphat.RED;
      } else if (color === inkyphat.RED) {
        color = inkyphat.WHITE;
      } else {
        color = inkyphat.BLACK;
      }
    }
  }

  inkyphat.drawRect(21, 40, 30, 50, inkyphat.WHITE);

  inkyphat.drawRect(50, 60, 70, 74, inkyphat.RED);

  inkyphat.drawRect(30, 53, 60, 63, inkyphat.BLACK);

  await inkyphat.redraw();
  await inkyphat.destroy();
}
main();
