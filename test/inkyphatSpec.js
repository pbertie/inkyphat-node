/*jshint esversion: 6*/
let expect = require('chai').expect;
let Inkyphat = require('../lib/inkyphat');
(function(){
  "use strict";

  /* gloabl describe,it*/

  describe('inkyphatSpec', function () {
    it('blank test', function () {
      let inkyphat = new Inkyphat();
      expect(1).to.equal(1);
    });
  });
})();
