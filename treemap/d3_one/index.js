$(document).ready(function() {

  var treemap = function() {
    var color, height, margin, position, width;
    position = function() {
      return this.style("left", function(d) {
        return d.x + "px";
      }).style("top", function(d) {
        return d.y + "px";
      }).style("width", function(d) {
        return Math.max(0, d.dx - 1) + "px";
      }).style("height", function(d) {
        return Math.max(0, d.dy - 1) + "px";
      });
    };
    margin = {
      top: 40,
      right: 10,
      bottom: 10,
      left: 10
    };
    width = 960 - margin.left - margin.right;
    height = 500 - margin.top - margin.bottom;
    color = d3.scale.category20c();
    treemap = d3.layout.treemap().size([width, height]).sticky(true).value(function(d) {
      return d.size;
    });
    window.div = d3.select("body").append("div").style("position", "relative").style("width", (width + margin.left + margin.right) + "px").style("height", (height + margin.top + margin.bottom) + "px").style("left", margin.left + "px").style("top", margin.top + "px");
    return d3.json("flare.json", function(error, root) {
      var change, node;
      node = div.datum(root).selectAll(".node").data(treemap.nodes).enter().append("div").attr("class", "node").call(position).style("background", function(d) {
        if (d.children) {
          return color(d.name);
        } else {
          return null;
        }
      }).text(function(d) {
        if (d.children) {
          return null;
        } else {
          return d.name;
        }
      });
      return d3.selectAll("input").on("change", change = function() {
        var value;
        value = (this.value === "count" ? function() {
          return 1;
        } : function(d) {
          return d.size;
        });
        return node.data(treemap.value(value).nodes).transition().duration(1500).call(position);
      });
    });
  };
  treemap();


})