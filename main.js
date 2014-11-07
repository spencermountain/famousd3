	define(function(require, exports, module) {

		var Engine = require('famous/core/Engine');
		var Transform = require('famous/core/Transform');
		var Modifier = require('famous/core/Modifier');
		var Surface = require('famous/core/Surface');
		var Transitionable = require('famous/transitions/Transitionable');
		var Easing = require('famous/transitions/Easing');
		var Timer = require('famous/utilities/Timer');
		var mainContext = Engine.createContext();

		var surf = new Surface({
			size: [500, 100],
			properties: {
				backgroundColor: 'steelblue',
				"border-radius": "2px",
			},
		});
		var rotate = new Modifier({
			origin: [0.5, 0.5],
			opacity: 0.75,
			transform: Transform.rotateZ(1)
		});
		mainContext.add(rotate).add(surf)

	})