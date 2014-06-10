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
  SpringTransition = require('famous/transitions/SpringTransition');
  Transitionable.registerMethod('spring', SpringTransition);
  WallTransition = require('famous/transitions/WallTransition');
  Transitionable.registerMethod('wall', WallTransition);
  mainContext = Engine.createContext()
  eventHandler = new EventHandler();
  fns= {}
  fns.spring_transition = {
    method: 'spring',
    period: 450,
    dampingRatio: 0.7
  };
  fns.wall_transition = {
    method: 'wall',
    period: 450,
    dampingRatio: 0.7
  };
  fns.expo= {
    duration:1000,
    curve: Easing.outExpo
  }


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
    s2.on 'click',->
      alert(str)

    container.add(l)
    return container


  m= new Modifier({
  })
  mainContext.add(m).add(build())
  m.setTransform(
    Transform.translate(100, 100),
    fns.wall_transition
  )