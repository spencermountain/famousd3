define (require, exports, module) ->
  Engine = require("famous/core/Engine")
  Surface = require("famous/core/Surface")
  RenderNode = require("famous/core/RenderNode")
  Modifier = require("famous/core/Modifier")
  Scrollview = require("famous/views/Scrollview")
  Transform = require("famous/core/Transform")
  Transitionable = require("famous/transitions/Transitionable")
  mainContext = Engine.createContext()

  scroll = new Scrollview()
  surfaces = []
  scroll.sequenceFrom surfaces
  [0..20].each ()->
    w= 300
    s= new Surface({
        content: "Surface:"
        size: [undefined, undefined]
        properties:
          border: "1px solid red"
          lineHeight: "200px"
          textAlign: "center"
    })
    m= new Modifier({
      size:[w, 200]
      })
    node = new RenderNode()
    node.add(m).add(s)
    s.pipe scroll
    s.on "click", ->
        m.setSize(
          [w, 400],
          { duration : 800 }
        )
    surfaces.push(node)

  mainContext.add(scroll)

