define(function(require, exports, module) {
	var Engine = require('famous/core/Engine');
	var Transform = require('famous/core/Transform');
	var Modifier = require('famous/core/Modifier');
	var Surface = require('famous/core/Surface');
	var ContainerSurface = require('famous/surfaces/ContainerSurface');
	var Transitionable = require('famous/transitions/Transitionable');
	var Easing = require('famous/transitions/Easing');
	var GridLayout = require("famous/views/GridLayout");
	var Timer = require('famous/utilities/Timer');
	var RenderNode = require('famous/core/RenderNode');
	var mainContext = Engine.createContext();

	//wrap d3's wicked layout algorithm
	function compute_treemap(arr) {
		var treemap = d3.layout.treemap().size([400, 400]).sticky(true).value(function(d) {
			return d.value
		});
		var obj = {
			children: arr
		}
		arr = treemap(obj)
		arr = arr.slice(1, arr.length) //remove pesky top one
		return arr
	}


	var Treemap = function(arr, options) {
		the = this
		the.options = options || {}
		the.width = the.options.width || 400
		the.height = the.options.height || 400
		the.wall_transition = {
			duration: 800,
			curve: Easing.outExpo
		};
		the.data = compute_treemap(arr)

		the.make_square = function(d) {
			d.node = new RenderNode({})
			if (d.children) {
				return d.node
			}
			var s = new Surface({
				// content: d.label||'',
				size: [undefined, undefined],
				properties: {
					"background-color": d.color || "steelblue",
					"text-align": "center",
					color: "white"
				}
			})
			d.mod = new Modifier({
				origin: [0, 0],
				transform: Transform.translate(d.x, d.y),
				opacity: 0.7,
				size: [d.dx, d.dy]
			});
			s.on('click', function() {})
			d.node.add(d.mod).add(s)
			return d
		}

		the.build = function() {
			var main_node = new ContainerSurface({
				origin: [0.5, 0.5],
			})
			the.data = the.data.map(function(d, i) {
				return the.make_square(d)
			})
			//draw
			the.data.forEach(function(d) {
				main_node.add(d.node)
			})
			return main_node
		}

		the.change_data = function() {
			the.data = the.data.map(function(d) {
				d.value = parseInt(Math.random() * 100) + 1
				return d
			})
			the.data = compute_treemap(the.data)
		}

		the.update = function(data) {
			the.change_data()
			the.data.forEach(function(d, i) {
				Timer.after(function() {
					d.mod.setTransform(Transform.translate(d.x, d.y), the.wall_transition)
					d.mod.setSize([d.dx, d.dy], the.wall_transition)
				}, i * 5)
			})

		}

	}


		function randomdata() {
			var l = (Math.random() * 8) + 4
			var labels = ["lisa it's your birthday", "happy birthday lisa"]
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
			var arr = []
			for (var i = 0; i < l; i++) {
				arr.push({
					label: labels[i % 2],
					value: Math.random() * 100,
					color: colours[i % colours.length]
				})
			}
			return arr
		}

	arr = randomdata()
	window.t = new Treemap(arr)
	var map_node = t.build()
	Timer.every(function() {
		t.update()
	}, 150)


	var header = new Surface({
		content: "<h2>hello.</h2><h3>this is a D3js treemap layout rendered with famo.us</h3><h3>it's cool because it's fast and new</h3> <h3>see my insides with <a style='color:steelblue; text-decoration:none;' href='https://github.com/spencermountain/famo.us_scratch'>the githubs</a></h3>",
		properties: {
			color: "grey"
		}
	})
	var g = new GridLayout({
		size: [1200, 1200],
		dimensions: [2, 1]
	})
	g.sequenceFrom([map_node, header])

	mainContext.add(g)


})