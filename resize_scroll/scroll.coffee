#a minimalist working resizable scrollview based on http://stackoverflow.com/questions/24354064/resizing-surfaces-in-a-famo-us-scrollview/24378591
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
    s= new Surface({
        content: "Surface"
        size: [undefined, undefined]
        properties:
          border: "1px solid red"
          lineHeight: "200px"
          textAlign: "center"
    })
    m= new Modifier({
      size:[undefined, 200]
      })
    node = new RenderNode()
    node.add(m).add(s)

    s.pipe(scroll) #pipe with the surface

    surfaces.push(node) #but push the rendernode

    s.on "click", ->
        m.setSize(
          [undefined, 400],
          { duration : 800 }
        )

  mainContext.add(scroll)

