// $(document).ready(function() {
define(function(require, exports, module) {




  var make_treemap = function(root, cb) {
    var position = function() {
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
    var width = 960;
    var height = 500
    window.treemap = d3.layout.treemap().size([width, height]).sticky(true).value(function(d) {
      return d.size;
    });
    window.div = d3.select("body")

    div.datum(root).selectAll(".node").data(treemap.nodes).enter().append("div").attr("class", "node").call(position).style("background", 'steelblue');
    cb(div.data())
  };





  return make_treemap






})