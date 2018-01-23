/*jshint esversion: 6*/
const inkyphat = require('../lib/inkyphat').getInstance();
(function() {
  "use strict";

  inkyphat.init().then(function() {
    inkyphat.setBorder(inkyphat.WHITE);

    let color = inkyphat.BLACK;
    for (let x = 0; x < inkyphat.getWidth() / 4; x++) {
      for (let y = 0; y < inkyphat.getHeight() / 4; y++) {
        inkyphat.drawRect(x * 4, y * 4, (x * 4) + 4, (y * 4) + 4, color);
        if (color === inkyphat.BLACK) {
          color = inkyphat.RED;
        } else if (color === inkyphat.RED) {
          color = inkyphat.WHITE;
        } else {
          color = inkyphat.BLACK;
        }
      }
    }

    //inkyphat.drawRect(20, 20, 60, 60, Inkyphat.BLACK);

    //inkyphat.drawRect(30, 30, 90, 70, Inkyphat.RED);

    inkyphat.drawRect(21, 40, 80, 50, inkyphat.WHITE);

    return inkyphat.redraw();
  }).then(function() {
    return inkyphat.destroy();
  }).then(function() {
    console.log('Complete');
  }).catch(function(error) {
    console.log('Error', error);
  });

})();
