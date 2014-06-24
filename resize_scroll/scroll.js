define(function(require, exports, module) {
    var Engine = require("famous/core/Engine");
    var Surface = require("famous/core/Surface");
    var RenderNode = require("famous/core/RenderNode");
    var Modifier = require("famous/core/Modifier");

    var Scrollview = require("famous/views/Scrollview");
    var Transitionable = require("famous/transitions/Transitionable");
    var SnapTransition = require("famous/transitions/SnapTransition");

    Transitionable.registerMethod('snap', SnapTransition);

    var snap = {
        method: 'snap',
        period: 300,
        dampingRatio: 0.6
    }

    var mainContext = Engine.createContext();

    var scrollview = new Scrollview();

    var surfaces = [];

    scrollview.sequenceFrom(surfaces);

    for (var i = 0; i < 20; i++) {

        var surface = new Surface({
            content: "Surface: " + (i + 1),
            size: [undefined, undefined],
            properties: {
                border: "1px solid red",
                lineHeight: "200px",
                textAlign: "center"
            }
        });

        surface.open = false;

        surface.state = new Modifier();

        surface.trans = new Transitionable(200);

        surface.state.sizeFrom(function() {
            return [undefined, this.trans.get()];
        }.bind(surface));

        surface.node = new RenderNode();

        surface.node.add(surface.state).add(surface);

        surface.pipe(scrollview);

        surface.on('click', function(e) {
            if (this.open) {
                this.trans.halt();
                this.trans.set(200, snap);
            } else {
                this.trans.halt();
                this.trans.set(400, snap);
            }
            this.open = !this.open;

        }.bind(surface));

        surfaces.push(surface.node);
    }

    mainContext.add(scrollview);
})