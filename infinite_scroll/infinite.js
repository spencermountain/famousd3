define(function(require, exports, module) {

  var Engine = require('famous/core/Engine');
  var Surface = require('famous/core/Surface');
  var Scrollview = require('famous/views/Scrollview');
  var SequentialLayout = require('famous/views/SequentialLayout');

  var context = Engine.createContext();

  var scrollview = new Scrollview({
    direction: 0,
    friction: 0.9001,
    drag: 0.9001
  });
  var cells = [];

  scrollview.sequenceFrom(cells);

  var sequence = new SequentialLayout({
    direction: 0
  });
  var surfaces = [];
  sequence.sequenceFrom(surfaces);

  var imageWidth = 4000;

  for (var i = 0; i < 2; i++) {
    var surface = new Surface({
      size: [imageWidth, undefined],
      content: "<img style='width:100%' src='http://www.olivewhite.com/photographies/album_040_panoramas/Le_Pano_de_la_Roche_Parstire_gamma.jpg' />"
    });
    surface.pipe(scrollview);
    surfaces.push(surface);
  };

  cells.push(sequence);

  scroller_prerender = function() {
    var pos = scrollview.getPosition();
    if (pos > imageWidth) {
      scrollview.setPosition(1);
      console.log('bip')
    } else if (pos < 1) {
      scrollview.setPosition(imageWidth);
    }
  }

  Engine.on('prerender', scroller_prerender);

  context.add(scrollview);

});