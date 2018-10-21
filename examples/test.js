const inkyphat = require('../lib/inkyphat')({logToStd: true});
async function main () {
  await inkyphat.init()

  inkyphat.setBorder(inkyphat.BLACK);

  // Default profile is quick (profiles only work with v2 screen)...
  console.log('Modes: ', inkyphat.getModes());
  // inkyphat.setMode('quick');
  // inkyphat.setMode('pimoroni');
  // inkyphat.setMode('noFlash');
  // inkyphat.setMode('clear');

  let color = inkyphat.BLACK;
  for (let x = 0; x < (inkyphat.getWidth() / 4) - 0; x++) {
    for (let y = 1; y < (inkyphat.getHeight() / 4) - 1; y++) {
      inkyphat.drawRect(x * 4, y * 4, (x * 4) + 4, (y * 4) + 4, color);
      if (color === inkyphat.BLACK) {
        color = inkyphat.RED;
      } else if (color === inkyphat.RED) {
        color = inkyphat.LIGHT_RED;
      } else if (color === inkyphat.LIGHT_RED) {
        color = inkyphat.WHITE;
      } else {
        color = inkyphat.BLACK;
      }
    }
  }

  // inkyphat.drawRect(150, 20, 210, 60, inkyphat.BLACK);
  // inkyphat.drawRect(30, 30, 90, 70, inkyphat.RED);
  // inkyphat.drawRect(90, 100, 160, 70, inkyphat.LIGHT_RED);
  // inkyphat.drawRect(100, 90, 105, 85, inkyphat.BLACK);
  // inkyphat.drawRect(60, 5, 80, 50, inkyphat.RED);

  // inkyphat.drawRect(5, 25, 210, 40, inkyphat.RED);
  // inkyphat.drawRect(5, 45, 210, 60, inkyphat.LIGHT_RED);
  // inkyphat.drawRect(5, 65, 210, 80, inkyphat.BLACK);
  // inkyphat.drawRect(5, 85, 210, 100, inkyphat.WHITE);

  await inkyphat.redraw();

  await inkyphat.destroy();
};
main();
