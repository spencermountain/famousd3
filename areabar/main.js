define(function(require, exports, module) {
	var Engine = require('famous/core/Engine');
	var Transform = require('famous/core/Transform');
	var Modifier = require('famous/core/Modifier');
	var Surface = require('famous/core/Surface');
	var ContainerSurface = require('famous/surfaces/ContainerSurface');
	var Transitionable = require('famous/transitions/Transitionable');
	var Easing = require('famous/transitions/Easing');
	var Scrollview = require('famous/views/Scrollview');
	var Timer = require('famous/utilities/Timer');

	var colours = [
		"#1f77b4", "#aec7e8",
		"#ff7f0e", "#ffbb78",
		"#2ca02c", "#98df8a",
		"#d62728", "#ff9896",
		"#9467bd", "#c5b0d5",
		"#8c564b", "#c49c94",
		"#e377c2", "#f7b6d2",
		"#7f7f7f", "#c7c7c7",
		"#bcbd22", "#dbdb8d",
		"#17becf", "#9edae5"
	];

	//takes data and options and returns a containersurface
	window.Areabar = function(data, options) {
		var the = this
		this.data = data || []
		this.options = options || {}
		the.height = 20
		the.buffer = 5
		the.bars = []
		the.wall_transition = {
			duration: 1000,
			curve: Easing.outExpo
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



		the.recompute_data = function(data) {
			var total = data.reduce(function(s, b) {
				return s + b.value;
			}, 0);
			scale = new Scale({
				size: [0, the.container.getSize()[0] - the.buffer],
				range: [0, total]
			})
			var sum = 0
			return data.map(function(d) {
				d.delta = sum
				d.x = scale.linear(d.delta)
				d.h = the.height
				d.w = scale.linear(d.value) - 1.5
				if (d.w > 50) {
					d.display_label = d.label
				}
				sum += d.value
				return d
			})
		}

		the.areabar_h = function() {
			the.data = the.recompute_data(the.data)

			//method to draw individual bars
			var make_bar = function(d, i) {

				var s = new Surface({
					size: [undefined, undefined],
					// content: d.display_label || '',
					properties: {
						backgroundColor: colours[i],
						textAlign: "left",
						color: "white",
						"font-size": "15px",
					}
				});
				var mod = new Modifier({
					origin: [0, 0.5],
					transform: Transform.translate(d.x, 0),
					opacity: 0.9,
					size: [d.w, d.h]
				});
				the.container.add(mod).add(s)
				return {
					data: d,
					mod: mod,
				}
			}
			the.data.forEach(function(d, i) {
				var b = make_bar(d, i)
				the.bars.push(b)
			})
			return the.container
		}

		the.seperate = function() {
			the.bars.forEach(function(d, i) {
				console.log(d.data)
				var shift = 3
				if (i % 2 == 0) {
					shift = shift * -1
				}
				d.mod.setTransform(Transform.translate(d.data.x, shift), the.wall_transition)
			})
		}
		the.resize = function(new_data) {
			new_data = the.recompute_data(new_data)
			the.bars = the.bars.map(function(d, i) {
				d.data = new_data[i]
				d.mod.setSize([d.data.w, d.data.h], the.wall_transition)
				d.mod.setTransform(Transform.translate(d.data.x, 0), the.wall_transition)
				return d
			})
		}
		the.random_resize = function() {
			var change_values = function(data) {
				return data.map(function(d) {
					d.value = parseInt(Math.random() * 100) + 1
					return d
				})
			}
			the.resize(change_values(the.data))
		}

	}


	var random_data = function() {
		var cities = ["Toronto", "Miami", "Detroit", "St.Petersburg", "Hamilton", "Daytona Beach", "Kent", "Harrisburough", "Jamaica"]
		var arr = []
		var length = 10 //(Math.random() * 10) + 5
		for (var i = 0; i < length; i++) {
			arr.push({
				value: parseInt(Math.random() * 100) + 1,
				label: cities[i % cities.length]
			})
		}
		return arr
	}



	var mainContext = Engine.createContext();
	var data = random_data()
	window.g = new Areabar(data, {
		width: 800,
		height: 200
	});
	var areabar_h = g.areabar_h()
	Timer.every(function() {
		// g.seperate()
		// g.resize(data)
		g.random_resize()
	}, 80)

	window.scroll = new Scrollview({
		direction: 0,
	});
	scroll.sequenceFrom([areabar_h, ]);
	mainContext.add(scroll)

})