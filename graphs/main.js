define(function(require, exports, module) {
	var Engine = require('famous/core/Engine');
	var Transform = require('famous/core/Transform');
	var Modifier = require('famous/core/Modifier');
	var Surface = require('famous/core/Surface');
	var ContainerSurface = require('famous/surfaces/ContainerSurface');
	var Transitionable = require('famous/transitions/Transitionable');
	var Scrollview = require('famous/views/Scrollview');
	var Timer = require('famous/utilities/Timer');
	var WallTransition = require('famous/transitions/WallTransition');
	Transitionable.registerMethod('wall', WallTransition);


	//takes data and options and returns a containersurface
	window.Graph = function(data, options) {
		var the = this
		this.data = data || []
		this.options = options || {}
		this.type = "horizontal"
		the.bars = []
		the.wall_transition = {
			method: 'wall',
			period: 450,
			dampingRatio: 0.7
		};
		the.sort_transition = {
			method: 'wall',
			period: 750,
			dampingRatio: 0.8
		};
		this.container = new ContainerSurface({
			size: [the.options.width || 400, the.options.height || 400],
			properties: {
				border: "1px solid steelblue",
				overflow: "hidden"
			}
		})

		var Scale = function(obj) {
			if (!obj) {
				obj = {}
			}
			var the = this
			this.size = obj.size || [0, 200]
			this.range = obj.range || [0, 100]
			this.linear = function(num) {
				var full_range = the.range[1] - the.range[0]
				var range_percentage = num / the.range[1]
				var full_size = the.size[1] - the.size[0]
				return (range_percentage * full_size) + the.size[0] //this has some bugs at size=0
			}
		}
		//set our scales up
		var values = the.data.map(function(a) {
			return a.value
		})
		the.max = Math.max.apply(Math, values);
		the.buffer = 5



		the.barchart_h = function() {
			the.type = "horizontal"
			var x_scale = new Scale({
				size: [0, the.container.getSize()[0] - the.buffer],
				range: [0, the.max]
			})
			var y_scale = new Scale({
				size: [0, the.container.getSize()[1] - the.buffer],
				range: [0, the.data.length]
			})
			//method to draw individual bars
			var make_bar = function(d, i) {
				var h = y_scale.linear(0.96)
				var w = x_scale.linear(d.value)
				var y = y_scale.linear(i)
				var s = new Surface({
					size: [undefined, undefined],
					content: d.value || '',
					properties: {
						backgroundColor: "#69b",
						border: "0.5px solid white",
						textAlign: "right",
						color: "white",
						"font-size": "10px",
					}
				});
				var mod = new Modifier({
					origin: [0, 0],
					transform: Transform.translate(0, y),
					opacity: 0.8,
					size: [1, h]
				});
				the.container.add(mod).add(s)
				return {
					data: d,
					mod: mod,
					show: function() {
						Timer.after(function() { //delay the incoming animation
							mod.setSize(
								[w, h], the.wall_transition
							)
						}, i * 1);
					},
					hide: function() {
						Timer.after(function() {
							mod.setSize(
								[0.1, h], the.wall_transition
							)
						}, Math.random() * 12);
					},
					align: function(direction) {
						Timer.after(function() {
							var origin = [0.5, 0]
							if (direction == 'left') {
								origin = [0, 0]
							}
							if (direction == 'right') {
								origin = [1, 0]
							}
							mod.setOrigin(origin, the.wall_transition)
						}, i * 1);
					},
					sort_to: function(new_i) {
						var new_y = y_scale.linear(new_i)
						mod.setTransform(Transform.translate(0, new_y), the.sort_transition)
					}
				}
			}
			data.forEach(function(d, i) {
				var b = make_bar(d, i)
				the.bars.push(b)
			})
			the.show()
			return the.container
		}


		the.barchart_v = function() {
			the.type = "vertical"
			var x_scale = new Scale({
				size: [0, the.container.getSize()[0] - the.buffer],
				range: [0, the.data.length]
			})
			var y_scale = new Scale({
				size: [0, the.container.getSize()[1] - the.buffer],
				range: [0, the.max]
			})
			//method to draw individual bars
			var make_bar = function(d, i) {
				var w = x_scale.linear(0.96)
				var h = y_scale.linear(d.value)
				var x = x_scale.linear(i)
				var s = new Surface({
					size: [undefined, undefined],
					content: d.value || '',
					properties: {
						backgroundColor: "#69b",
						border: "0.5px solid white",
						textAlign: "center",
						color: "white",
						"font-size": "10px"
					}
				});
				var mod = new Modifier({
					origin: [0, 1],
					transform: Transform.translate(x, 0),
					size: [w, 1],
					opacity: 0.8,
				});
				the.container.add(mod).add(s)
				return {
					data: d,
					mod: mod,
					show: function() {
						Timer.after(function() { //delay the incoming animation
							mod.setSize(
								[w, h], the.wall_transition
							)
						}, i * 1);
					},
					hide: function() {
						Timer.after(function() {
							mod.setSize(
								[w, 0.1], the.wall_transition
							)
						}, Math.random() * 12);
					},
					align: function(direction) {
						Timer.after(function() {
							var origin = [0, 0.5]
							if (direction == 'top') {
								origin = [0, 0]
							}
							if (direction == 'bottom') {
								origin = [0, 1]
							}
							mod.setOrigin(origin, the.wall_transition)
						}, i * 1);
					},
					sort_to: function(new_i) {
						var new_x = x_scale.linear(new_i)
						mod.setTransform(Transform.translate(new_x, 0), the.sort_transition)
					}
				}
			}
			data.forEach(function(d, i) {
				var b = make_bar(d, i)
				the.bars.push(b)
			})
			the.show()
			return the.container
		}




		the.show = function() {
			the.bars.forEach(function(b) {
				b.show()
			})
		}
		the.hide = function() {
			the.bars.forEach(function(b) {
				b.hide()
			})
		}
		the.align = function(direction) {
			the.bars.forEach(function(b) {
				b.align(direction)
			})
		}
		the.randomize = function() {
			var arr = []
			for (var l = 0; l < the.bars.length; l++) {
				arr.push(l)
			}
			arr = arr.sort(function() {
				return .5 - Math.random();
			});
			the.bars.forEach(function(b, l) {
				b.sort_to(arr[l])
			})
		}
		the.sort = function() {
			the.bars = the.bars.sort(function(a, b) {
				return b.data.value - a.data.value
			})
			the.bars.forEach(function(b, l) {
				b.sort_to(l)
			})
		}


	}




	var random_data = function() {
		var arr = []
		var length = (Math.random() * 40) + 5
		for (var i = 0; i < length; i++) {
			arr.push({
				value: parseInt(Math.random() * 100) + 1,
				label: ""
			})
		}
		return arr
	}

		function dance(g, aligns) {
			Timer.every(function() {
				var arr = [

					function() {
						g.align(aligns[0])
					},
					function() {
						g.align(aligns[1])
					},
					function() {
						g.align(aligns[2])
					},
					function() {
						g.hide()
						Timer.after(function() {
							g.show()
						}, 70)
					},
					function() {
						g.sort()
					},
					function() {
						g.randomize()
					},
				]
				var r = parseInt(Math.random() * arr.length)
				arr[r]()
			}, 100)
		}

	var mainContext = Engine.createContext();
	window.g1 = new Graph(random_data(), {
		width: 400,
		height: 800
	});
	var chart_h = g1.barchart_h()
	dance(g1, ['left', 'center', 'right'])


	window.g2 = new Graph(random_data(), {
		width: 800,
		height: 400
	});
	var chart_v = g2.barchart_v()
	dance(g2, ["top", "middle", "bottom"])





	window.scroll = new Scrollview({
		direction: 0,
		// clipSize: [400, 400]
	});
	scroll.sequenceFrom([chart_h, chart_v]);
	mainContext.add(scroll)

})