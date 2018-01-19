var Inkyphat = require('../inkyphat.js');
var inkyphat = new Inkyphat();

main();

async function main() {
  await inkyphat.init();
  inkyphat.setBorder(Inkyphat.WHITE);
  
  let color = Inkyphat.BLACK;
  for (let x = 0; x < inkyphat.getWidth() / 4; x++) {
    for (let y = 0; y < inkyphat.getHeight() / 4; y++) {
      inkyphat.drawRect(x*4, y*4, (x*4)+4, (y*4)+4, color);
      if (color === Inkyphat.BLACK) {
        color = Inkyphat.RED;
      } else if (color === Inkyphat.RED) {
        color = Inkyphat.WHITE;
      } else {
        color = Inkyphat.BLACK;
      }
    }
  }
  
  //inkyphat.drawRect(20, 20, 60, 60, Inkyphat.BLACK);
  
  //inkyphat.drawRect(30, 30, 90, 70, Inkyphat.RED);
  
  inkyphat.drawRect(21, 40, 80, 50, Inkyphat.WHITE);
  
  await inkyphat.update();
  inkyphat.close();
}
