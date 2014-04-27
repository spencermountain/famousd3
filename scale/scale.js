var Scale = function() {
	var the = this
	this.size = [0, 200]
	this.range = [0, 100]
	this.linear = function(num) {
		var full_range = the.range[1] - the.range[0]
		var range_percentage = num / the.range[1]
		var full_size = the.size[1] - the.size[0]
		return (range_percentage * full_size) + the.size[0]
	}
}

// x = new Scale()
// x.size = [0, 10]
// x.range = [0, 100]
// console.log(x.linear(50) == 5)
// console.log(x.linear(0) == 0)
// console.log(x.linear(150) == 15)
// console.log(x.linear(-150) == -15)

// x.size = [0, 100]
// x.range = [-10, 10]
// console.log(x.linear(0) == 0)
// console.log(x.linear(10) == 100)
// console.log(x.linear(-10) == -100)
// console.log(x.linear(20) == 200)


// x.size = [50, 100]
// x.range = [0, 100]
// console.log(x.linear(0) == 50)
// console.log(x.linear(50) == 75)

// x.size = [-100, 0]
// x.range = [0, 10]
// console.log(x.linear(0) == -100)
// console.log(x.linear(10) == 0)

// x.size = [-10, 10]
// x.range = [0, 10]
// console.log(x.linear(0) == -10)
//has bugs when size=[..,0]