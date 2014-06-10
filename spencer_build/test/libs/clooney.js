function d3_rebind(a, b, c) {
  return function() {
    var d = c.apply(b, arguments);
    return d === b ? a : d
  }
}

function d3_layout_hierarchyRebind(a, b) {
  return d3.rebind(a, b, "sort", "children", "value"), a.nodes = a, a.links = d3_layout_hierarchyLinks, a
}

function d3_layout_hierarchyChildren(a) {
  return a.children
}

function d3_layout_hierarchyValue(a) {
  return a.value
}

function d3_layout_hierarchySort(a, b) {
  return b.value - a.value
}

function d3_layout_hierarchyLinks(a) {
  return d3.merge(a.map(function(a) {
    return (a.children || []).map(function(b) {
      return {
        source: a,
        target: b
      }
    })
  }))
}

function d3_layout_treemapPadNull(a) {
  return {
    x: a.x,
    y: a.y,
    dx: a.dx,
    dy: a.dy
  }
}

function d3_layout_treemapPad(a, b) {
  var c = a.x + b[3],
    d = a.y + b[0],
    e = a.dx - b[1] - b[3],
    f = a.dy - b[0] - b[2];
  return 0 > e && (c += e / 2, e = 0), 0 > f && (d += f / 2, f = 0), {
    x: c,
    y: d,
    dx: e,
    dy: f
  }
}
d3 = {}, d3.layout = {}, d3.merge = function(a) {
  for (var b, c, d, e = a.length, f = -1, g = 0; ++f < e;) g += a[f].length;
  for (c = new Array(g); --e >= 0;)
    for (d = a[e], b = d.length; --b >= 0;) c[--g] = d[b];
  return c
}, d3.rebind = function(a, b) {
  for (var c, d = 1, e = arguments.length; ++d < e;) a[c = arguments[d]] = d3_rebind(a, b, b[c]);
  return a
}, d3.layout.hierarchy = function() {
  function a(b, g, h) {
    var i = e.call(c, b, g);
    if (b.depth = g, h.push(b), i && (j = i.length)) {
      for (var j, k, l = -1, m = b.children = new Array(j), n = 0, o = g + 1; ++l < j;) k = m[l] = a(i[l], o, h), k.parent = b, n += k.value;
      d && m.sort(d), f && (b.value = n)
    } else delete b.children, f && (b.value = +f.call(c, b, g) || 0);
    return b
  }

  function b(a, d) {
    var e = a.children,
      g = 0;
    if (e && (h = e.length))
      for (var h, i = -1, j = d + 1; ++i < h;) g += b(e[i], j);
    else f && (g = +f.call(c, a, d) || 0);
    return f && (a.value = g), g
  }

  function c(b) {
    var c = [];
    return a(b, 0, c), c
  }
  var d = d3_layout_hierarchySort,
    e = d3_layout_hierarchyChildren,
    f = d3_layout_hierarchyValue;
  return c.sort = function(a) {
    return arguments.length ? (d = a, c) : d
  }, c.children = function(a) {
    return arguments.length ? (e = a, c) : e
  }, c.value = function(a) {
    return arguments.length ? (f = a, c) : f
  }, c.revalue = function(a) {
    return b(a, 0), a
  }, c
}, d3.layout.treemap = function() {
  function a(a, b) {
    for (var c, d, e = -1, f = a.length; ++e < f;) d = (c = a[e]).value * (0 > b ? 0 : b), c.area = isNaN(d) || 0 >= d ? 0 : d
  }

  function b(c) {
    var f = c.children;
    if (f && f.length) {
      var g, h, i, j = l(c),
        k = [],
        m = f.slice(),
        o = 1 / 0,
        p = "slice" === n ? j.dx : "dice" === n ? j.dy : "slice-dice" === n ? 1 & c.depth ? j.dy : j.dx : Math.min(j.dx, j.dy);
      for (a(m, j.dx * j.dy / c.value), k.area = 0;
        (i = m.length) > 0;) k.push(g = m[i - 1]), k.area += g.area, "squarify" !== n || (h = d(k, p)) <= o ? (m.pop(), o = h) : (k.area -= k.pop().area, e(k, p, j, !1), p = Math.min(j.dx, j.dy), k.length = k.area = 0, o = 1 / 0);
      k.length && (e(k, p, j, !0), k.length = k.area = 0), f.forEach(b)
    }
  }

  function c(b) {
    var d = b.children;
    if (d && d.length) {
      var f, g = l(b),
        h = d.slice(),
        i = [];
      for (a(h, g.dx * g.dy / b.value), i.area = 0; f = h.pop();) i.push(f), i.area += f.area, null != f.z && (e(i, f.z ? g.dx : g.dy, g, !h.length), i.length = i.area = 0);
      d.forEach(c)
    }
  }

  function d(a, b) {
    for (var c, d = a.area, e = 0, f = 1 / 0, g = -1, h = a.length; ++g < h;)(c = a[g].area) && (f > c && (f = c), c > e && (e = c));
    return d *= d, b *= b, d ? Math.max(b * e * o / d, d / (b * f * o)) : 1 / 0
  }

  function e(a, b, c, d) {
    var e, f = -1,
      g = a.length,
      h = c.x,
      j = c.y,
      k = b ? i(a.area / b) : 0;
    if (b == c.dx) {
      for ((d || k > c.dy) && (k = c.dy); ++f < g;) e = a[f], e.x = h, e.y = j, e.dy = k, h += e.dx = Math.min(c.x + c.dx - h, k ? i(e.area / k) : 0);
      e.z = !0, e.dx += c.x + c.dx - h, c.y += k, c.dy -= k
    } else {
      for ((d || k > c.dx) && (k = c.dx); ++f < g;) e = a[f], e.x = h, e.y = j, e.dx = k, j += e.dy = Math.min(c.y + c.dy - j, k ? i(e.area / k) : 0);
      e.z = !1, e.dy += c.y + c.dy - j, c.x += k, c.dx -= k
    }
  }

  function f(d) {
    var e = g || h(d),
      f = e[0];
    return f.x = 0, f.y = 0, f.dx = j[0], f.dy = j[1], g && h.revalue(f), a([f], f.dx * f.dy / f.value), (g ? c : b)(f), m && (g = e), e
  }
  var g, h = d3.layout.hierarchy(),
    i = Math.round,
    j = [1, 1],
    k = null,
    l = d3_layout_treemapPadNull,
    m = !1,
    n = "squarify",
    o = .5 * (1 + Math.sqrt(5));
  return f.size = function(a) {
    return arguments.length ? (j = a, f) : j
  }, f.padding = function(a) {
    function b(b) {
      var c = a.call(f, b, b.depth);
      return null == c ? d3_layout_treemapPadNull(b) : d3_layout_treemapPad(b, "number" == typeof c ? [c, c, c, c] : c)
    }

    function c(b) {
      return d3_layout_treemapPad(b, a)
    }
    if (!arguments.length) return k;
    var d;
    return l = null == (k = a) ? d3_layout_treemapPadNull : "function" == (d = typeof a) ? b : "number" === d ? (a = [a, a, a, a], c) : c, f
  }, f.round = function(a) {
    return arguments.length ? (i = a ? Math.round : Number, f) : i != Number
  }, f.sticky = function(a) {
    return arguments.length ? (m = a, g = null, f) : m
  }, f.ratio = function(a) {
    return arguments.length ? (o = a, f) : o
  }, f.mode = function(a) {
    return arguments.length ? (n = a + "", f) : n
  }, d3_layout_hierarchyRebind(f, h)
};
var Scale;
Scale = function() {
  function a(a) {
    null == a && (a = {}), this.size = a.size || 200, this.range = a.range || [0, 100], "object" == typeof this.size && this.size.length && (this.size = this.size[1])
  }
  return a.prototype.linear = function(a) {
    var b, c, d;
    return d = this, b = d.range[1], d.range[0] < 0 && (b += Math.abs(d.range[0]), a += Math.abs(d.range[0])), c = a / b, c * d.size
  }, a
}(), define(function(a, b, c) {
  var d, e, f, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, A, B;
  return h = a("famous/core/Engine"), v = a("famous/core/Transform"), n = a("famous/core/Modifier"), t = a("famous/core/Surface"), e = a("famous/surfaces/ContainerSurface"), w = a("famous/transitions/Transitionable"), m = a("famous/surfaces/ImageSurface"), f = a("famous/transitions/Easing"), k = a("famous/views/GridLayout"), q = a("famous/views/Scrollview"), u = a("famous/utilities/Timer"), p = a("famous/core/RenderNode"), i = a("famous/core/EventHandler"), l = a("famous/views/HeaderFooterLayout"), o = a("famous/views/RenderController"), r = a("famous/views/SequentialLayout"), x = a("famous/core/View"), s = a("famous/transitions/SpringTransition"), y = a("famous/transitions/WallTransition"), w.registerMethod("spring", s), w.registerMethod("wall", y), mainContext = h.createContext(), eventHandler = new i, B = {
    method: "wall",
    period: 450,
    dampingRatio: .7
  }, A = {
    method: "spring",
    period: 450,
    dampingRatio: .7
  }, z = {
    method: "wall",
    period: 750,
    dampingRatio: .8
  }, d = function() {
    function a(a) {
      var b, c, d;
      null == a && (a = {}), d = this, this.d = a.d || {
        value: 0,
        label: ""
      }, this.i = a.i, this.graph = a.graph, this.killed = !1, this.compute(), c = new t({
        size: [void 0, void 0],
        content: this.d.value || "",
        properties: {
          backgroundColor: this.d.color || "steelblue",
          overflow: "hidden",
          textAlign: "right",
          color: "white",
          "font-size": "10px"
        }
      }), c.on("mouseenter", function() {
        return console.log("hi"), d.show_label(), d.focus()
      }), c.on("mouseout", function() {
        return d.hide_label(), d.unfocus()
      }), c.on("click", function() {
        return d.killed ? d.unkill_others() : d.kill_others()
      }), this.mod = new n({
        origin: this.origin,
        transform: v.translate(this.x, this.y),
        size: [.1, .1],
        opacity: .8
      }), this.mod.setSize([this.w, this.h], B), this.graph.node.add(this.mod).add(c), this.label_mod = new n({
        origin: this.origin,
        transform: v.translate(this.x, this.y),
        size: [.1, .1]
      }), b = new t({
        content: this.d.label || "fun yeah",
        properties: {
          color: "#5c6056",
          "z-index": "4",
          overflow: "hidden"
        }
      }), this.graph.node.add(this.label_mod).add(b)
    }
    return a.prototype.compute = function() {
      var a, b, c;
      if (b = this, "vertical_bar" === this.graph.type) {
        if (this.y = 0, this.h = this.graph.y_scale.linear(b.d.value), this.x = this.graph.x_scale.linear(b.i), this.w = this.graph.x_scale.linear(1) - 1, this.origin = [0, 1], "middle" === this.graph.align && (this.origin = [0, .5]), "end" === this.graph.align && (this.origin = [0, 0]), this.graph.hidden) return this.h = .1
      } else if ("horizontal_bar" === this.graph.type) {
        if (this.x = 0, this.y = -this.graph.y_scale.linear(b.i), this.h = this.graph.y_scale.linear(1) - 1, this.w = this.graph.x_scale.linear(b.d.value), this.origin = [0, 1], "middle" === this.graph.align && (this.origin = [.5, 1]), "end" === this.graph.align && (this.origin = [1, 1]), this.graph.hidden) return this.w = .1
      } else if ("area_bar" === this.graph.type) {
        if (a = 0 === b.i ? 0 : function() {
          c = [];
          for (var a = 0, d = b.i - 1; d >= 0 ? d >= a : a >= d; d >= 0 ? a++ : a--) c.push(a);
          return c
        }.apply(this).reduce(function(a, c) {
          return a + b.graph.data[c].value
        }, 0), this.x = this.graph.x_scale.linear(a), this.w = this.graph.x_scale.linear(b.d.value), this.y = 0, this.h = 50, this.origin = [0, 1], "middle" === this.graph.align && (this.origin = [0, .5]), "end" === this.graph.align && (this.origin = [0, 0]), this.graph.hidden) return this.h = .1
      } else if ("treemap" === this.graph.type && (this.x = b.d.x, this.y = b.d.y, this.h = b.d.dy, this.w = b.d.dx, this.origin = [0, 0], this.graph.hidden)) return this.h = .1
    }, a.prototype.draw = function(a, b) {
      var c;
      return null == a && (a = B), null == b && (b = function() {}), c = this, c.mod.setOrigin(c.origin, a), c.mod.setTransform(v.translate(c.x, c.y), a), c.mod.setSize([c.w, c.h], a, b), c.draw_label()
    }, a.prototype.draw_label = function() {
      var a, b, c;
      return a = this, "vertical_bar" === this.graph.type && (b = this.x, c = -this.h, this.graph.bars[this.i + 1] || (b -= 50), 1 !== this.origin[1] && (c = -this.graph.height / 1.5)), "horizontal_bar" === this.graph.type && (b = this.w, c = this.y, 0 !== this.origin[0] && (b = this.graph.width / 2), b + 100 > a.graph.width && (b = a.graph.width - 120)), "area_bar" === this.graph.type && (b = this.x, c = this.y - 60, 0 === this.origin[1] && (c = -this.graph.width / 2), .5 === this.origin[1] && (c = -(this.graph.width / 2) + 30), this.graph.bars[this.i + 1] || (b -= 50)), "treemap" === this.graph.type && (b = this.d.dx, c = this.d.dy), this.label_mod.setTransform(v.translate(b, c), B)
    }, a.prototype.hide_label = function() {
      return this.killed ? void 0 : this.label_mod.setSize([.1, .1])
    }, a.prototype.show_label = function() {
      return this.killed ? void 0 : this.label_mod.setSize([100, 20])
    }, a.prototype.focus = function() {
      var a, b;
      return this.killed ? void 0 : (("vertical_bar" === this.graph.type || "area_bar" === this.graph.type) && (a = this.w, b = this.h + 3), "horizontal_bar" === this.graph.type && (a = this.w + 3, b = this.h), "treemap" === this.graph.type && (a = this.d.dx, b = this.d.dy, this.mod.setOpacity(1)), this.mod.setSize([a, b], {
        duration: 100
      }))
    }, a.prototype.unfocus = function() {
      return this.killed || this.mod.setSize([this.w, this.h], {
        duration: 100
      }), this.mod.setOpacity(.8)
    }, a.prototype.kill = function() {
      var a;
      return a = this, a.killed = !0, ("vertical_bar" === this.graph.type || "area_bar" === this.graph.type) && a.mod.setSize([a.w, .1 * a.h], B), "horizontal_bar" === this.graph.type && a.mod.setSize([.1 * a.w, a.h], B), "treemap" === this.graph.type ? a.mod.setSize([.2 * a.w, .2 * a.h], B) : void 0
    }, a.prototype.unkill = function() {
      var a;
      return a = this, a.killed = !1, a.draw(), u.after(function() {
        return a.hide_label()
      }, 5)
    }, a.prototype.kill_others = function() {
      var a;
      return a = this, a.graph.bars.forEach(function(b) {
        return b.killed = !0, b.i !== a.i ? b.kill() : void 0
      })
    }, a.prototype.unkill_others = function() {
      var a;
      return a = this, a.graph.bars.forEach(function(a) {
        return a.unkill()
      })
    }, a.prototype.sort_to = function(a, b, c) {
      return null == b && (b = z), null == c && (c = function() {}), this.i = a, this.compute(), this.draw(b, c)
    }, a
  }(), j = function() {
    function a(a) {
      null == a && (a = {}), this.data = a.data || [], this.width = a.width || 400, this.height = a.height || 400, this.bars = [], this.align = a.align || "start", this.type = a.type || "vertical_bar", this.hidden = null !== a.hidden && a.hidden === !0, this.label_size = 50, this.node = new e({
        size: [this.width, this.height],
        properties: {
          overflow: "hidden",
          border: "1px solid steelblue",
          "border-radius": "2px"
        }
      }), this.compute(), this.bars = this.data.map(function(a, c) {
        return new d({
          graph: b,
          d: a,
          i: c
        })
      }), this.draw()
    }
    var b;
    return b = a, a.prototype.update = function(a) {
      return null == a && (a = {}), a.transition = a.transition || B, (a.width || a.height) && (void 0 !== a.width && (this.width = a.width), void 0 !== a.height && (this.height = a.height), this.node.setSize([this.width, this.height])), null === a.hidden && (a.hidden = !1), this.data = a.data || this.data, this.width = a.width || this.width, this.height = a.height || this.height, this.align = a.align || this.align, this.type = a.type || this.type, this.hidden = a.hidden, this.compute(), this.draw(a.transition)
    }, a.prototype.compute = function() {
      var a, c, d, e, f, g;
      return b = this, g = b.data.map(function(a) {
        return a.value
      }), c = Math.max.apply(Math, g), "vertical_bar" === b.type ? (b.x_scale = new Scale({
        size: [0, b.width],
        range: [0, b.data.length]
      }), b.y_scale = new Scale({
        size: [0, b.height - this.label_size],
        range: [0, c]
      })) : "horizontal_bar" === b.type ? (b.x_scale = new Scale({
        size: [0, b.width - this.label_size],
        range: [0, c]
      }), b.y_scale = new Scale({
        size: [0, b.height],
        range: [0, b.data.length]
      })) : "area_bar" === b.type ? (e = b.data.reduce(function(a, b) {
        return a + b.value
      }, 0), b.x_scale = new Scale({
        size: [0, b.width],
        range: [0, e]
      }), b.y_scale = new Scale({
        size: [0, b.height - this.label_size],
        range: [0, 100]
      })) : "treemap" === b.type && (f = d3.layout.treemap().size([b.width, b.height]).sticky(!0).value(function(a) {
        return a.value
      }), d = {
        children: b.data
      }, a = f(d), a = a.slice(1, a.length), b.data = a, b.x_scale = {}, b.y_scale = {}), this.bars.forEach(function(a, c) {
        return a.d = b.data[c], a.compute(c)
      })
    }, a.prototype.build = function() {
      return this.node
    }, a.prototype.draw = function() {
      return this.bars.forEach(function(a, b) {
        return u.after(function() {
          return a.draw()
        }, b)
      })
    }, a.prototype.append = function(a) {
      var c;
      return null == a && (a = {}), b = this, a.value = a.value || 0, a.color = a.color || "rgba(42,111,180,0.7)", b.data.push(a), this.compute(), c = new d({
        graph: g,
        i: b.bars.length,
        d: a
      }), this.bars.push(c), this.update(), this.update()
    }, a.prototype.show = function() {
      return this.update({
        hidden: !1
      })
    }, a.prototype.hide = function() {
      return this.update({
        hidden: !0
      })
    }, a.prototype.resize = function(a) {
      return null == a && (a = {}), this.update(a)
    }, a.prototype.align = function(a) {
      return null == a && (a = "start"), "left" === a && (a = "start"), "right" === a && (a = "end"), "center" === a && (a = "middle"), "top" === a && (a = "end"), "bottom" === a && (a = "start"), this.update({
        align: !0
      })
    }, a.prototype.update_order = function() {
      return this.bars.forEach(function(a, b) {
        return u.after(function() {
          return a.sort_to(b)
        }, 1.5 * b), data[b] = a.d
      })
    }, a.prototype.sort = function(a) {
      return a && "string" != typeof a || (a = function(a, b) {
        return b.d.value > a.d.value ? 1 : b.d.value === a.d.value ? 0 : -1
      }), this.bars = this.bars.sort(a), "desc" === a && (this.bars = this.bars.reverse()), ("area_bar" === this.type || "treemap" === this.type) && this.compute(), this.update_order()
    }, a.prototype.randomize = function() {
      return this.sort(function() {
        return Math.round(Math.random())
      })
    }, a.prototype.random_walk = function() {
      return b = this, this.bars.forEach(function(a, c) {
        var d, e, f;
        return d = 2500 * Math.random() + 1e3, f = {
          duration: d
        }, e = Math.random() * b.bars.length, a.sort_to(e, f, function() {
          return a.sort_to(c, f)
        })
      })
    }, a.prototype.wave = function(a) {
      var c;
      return null == a && (a = 1.2), b = this, c = {
        duration: 200
      }, this.bars.forEach(function(d, e) {
        return u.after(function() {
          return "vertical_bar" === b.type || "area_bar" === b.type ? d.mod.setSize([d.w, d.h * a], c, function() {
            return d.mod.setSize([d.w, d.h], c)
          }) : "treemap" === b.type ? d.mod.setSize([d.w * a, d.h * a], c, function() {
            return d.mod.setSize([d.w, d.h], c)
          }) : d.mod.setSize([d.w * a, d.h], c, function() {
            return d.mod.setSize([d.w, d.h], c)
          })
        }, 1.4 * e)
      })
    }, a
  }(), window.Bar = d, c.exports = j
});