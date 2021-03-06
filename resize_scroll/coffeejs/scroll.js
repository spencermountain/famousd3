// Generated by CoffeeScript 1.6.3
define(function(require, exports, module) {
  var Engine, Modifier, RenderNode, Scrollview, Surface, Transform, Transitionable, mainContext, scroll, surfaces;
  Engine = require("famous/core/Engine");
  Surface = require("famous/core/Surface");
  RenderNode = require("famous/core/RenderNode");
  Modifier = require("famous/core/Modifier");
  Scrollview = require("famous/views/Scrollview");
  Transform = require("famous/core/Transform");
  Transitionable = require("famous/transitions/Transitionable");
  mainContext = Engine.createContext();
  scroll = new Scrollview();
  surfaces = [];
  scroll.sequenceFrom(surfaces);
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].each(function() {
    var m, node, s;
    s = new Surface({
      content: "Surface",
      size: [void 0, void 0],
      properties: {
        border: "1px solid red",
        lineHeight: "200px",
        textAlign: "center"
      }
    });
    m = new Modifier({
      size: [void 0, 200]
    });
    node = new RenderNode();
    node.add(m).add(s);
    s.pipe(scroll);
    surfaces.push(node);
    return s.on("click", function() {
      return m.setSize([void 0, 400], {
        duration: 800
      });
    });
  });
  return mainContext.add(scroll);
});

/*
//@ sourceMappingURL=scroll.map
*/
