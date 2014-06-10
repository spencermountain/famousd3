define (require, exports, module) ->
  Engine = require("famous/core/Engine")
  Transform = require("famous/core/Transform")
  Modifier = require("famous/core/Modifier")
  Surface = require("famous/core/Surface")
  ContainerSurface = require("famous/surfaces/ContainerSurface")
  Transitionable = require("famous/transitions/Transitionable")
  Easing = require("famous/transitions/Easing")
  Timer = require("famous/utilities/Timer")
  EventHandler = require('famous/core/EventHandler')
  RenderController = require("famous/views/RenderController");
  SequentialLayout = require("famous/views/SequentialLayout");
  Timer = require("famous/utilities/Timer")
  mainContext = Engine.createContext()
  eventHandler = new EventHandler();

  build=->
    container= new ContainerSurface({
      size:[800,60]
      properties:{
        border:"1px solid steelblue"
        "background-color":"white"
        "border-radius":"5px"
        "z-index":"30"
      }
    })
    l= new SequentialLayout({
      direction:0
    })
    parts= []
    l.sequenceFrom(parts)

    str= "this size=true"
    s1= new Surface({
        size:[true, 50]
        content: "<div style='white-space:nowrap;'>#{str}</div>",
        properties:{
          "font-size":"30px"
          "background-color":"lightsteelblue"
          "whitespace":"nowrap"
        }
      })
    parts.push(s1)

    str= "and this is too!"
    s2= new Surface({
        size:[true, 50]
        content: "<div style='white-space:nowrap;'>#{str}</div>",
        properties:{
          "font-size":"30px"
          "background-color":"steelblue"
          "whitespace":"nowrap"
        }
      })
    console.log s2.getSize()
    console.log s2.getSize(true)
    parts.push(s2)

    container.add(l)
    return container


  mainContext.add(build())