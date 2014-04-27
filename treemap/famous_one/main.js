define(function(require, exports, module) {


	var data = {
		"name": "flare",
		"children": [{
			"name": "cluster",
			"children": [{
				"name": "oh ya poppie",
				"size": 743
			}, {
				"name": "happy lisa",
				"size": 743
			}]
		}, {
			"name": "hardyboys",
			"children": [{
				"name": "nancy drew",
				"size": 7074
			}]
		}]
	}

	var d3one = require("./d3one")
	var famousone = require("./famousone")
	d3one(data, function(tree_data) {
		console.log(tree_data)
	})
	// make_treemap(data, function(tree_data) {
	//   console.log(tree_data)
	//   famous_tree(tree_data)
	// });

})