/**
 * SimpleDataVis
 * 
 *  - JavaScript module for simple data visualizations
 * 
 */

var SimpleDataVis = function(dataSource) {
  'use strict';

  var url = dataSource || window.location.origin;

  if (url.lastIndexOf('/') != url.length - 1) {
    url += '/';
  }

  function shallowCopy(orig) {
    var copy = {};
    for (var key in orig) {
      copy[key] = orig[key];
    }
    return copy;
  }

  function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
  }

  function getErrorMsg(e) {
    var msg;
    if (typeof e === ' string') {
      msg = e;
    }
    else if (e.message) {
      msg = e.message;
    }
    else if (e.response) {
      msg = e.response;
    }
    else if ('status' in e) {
      msg = (e.status ? e.status + ': ' : '') + (e.statusText || 'connection failed');
    }
    else {
      msg = JSON.stringify(e);
    }
    return msg;
  }

  var metricsdata = function(view, opts, callbacks) {
    function getViewData(viewName, options, callbacks) {
      var opts = options || {};
      var params = opts.param || {};

      if (opts.hasOwnProperty('group')) {
        delete params['group_level'];
        if (opts.group.toString().toLowerCase() === 'true') {
          params.group = true;
        }
        else if (opts.group.toString().toLowerCase() === 'false') {
          params.group = false;
        }
        else if (!isNaN(opts.group)) {
          params['group_level'] = opts.group;
          delete params.group;
        }
        else {
          params.group = opts.group;
        }
      }

      if (opts.hasOwnProperty('startkey')) {
        if (isArray(opts.startkey)) {
          var s = opts.startkey.map(function(item) {
            if (typeof item === 'string') return '"' + item + '"';
            else if (typeof item === 'object') return '{}';
            else return item;
          });

          params.startkey = encodeURIComponent('[' + s.join() + ']');
        }
        else {
          params.startkey = opts.startkey;
        }
      }
      
      if (opts.hasOwnProperty('endkey')) {
        if (isArray(opts.endkey)) {
          var e = opts.endkey.map(function(item) {
            if (typeof item === 'string') return '"' + item + '"';
            else if (typeof item === 'object') return '{}';
            else return item;
          });

          params.endkey = encodeURIComponent('[' + e.join() + ']');
        }
        else {
          params.endkey = opts.endkey;
        }
      }

      var u = url + viewName + '?';
      for (var p in params) {
        u += (p + '=' + params[p] + '&');
      }
      if (u.lastIndexOf('?') == u.length - 1 || u.lastIndexOf('&') == u.length - 1 ) {
        u = u.substring(0, u.length - 1);
      }

      if (callbacks && typeof callbacks.onStart === 'function') {
        callbacks.onStart(u);
      }

      d3.json(u, function(error, json) {
        if (error) {
          console.error(error);
          if (callbacks && typeof callbacks.onFail === 'function') {
            callbacks.onFail(getErrorMsg(error));
          }
        }
        else if (callbacks && typeof callbacks.done === 'function') {
          callbacks.done(json);
        }
      });
    };

    return getViewData(view, opts, callbacks);
  };

  var metricscharts = function(type, options, callbacks) {
    var opts = options || {};

    var xScale = d3.scale.linear();
    var yScale = d3.scale.linear();
    var tScale = d3.time.scale();

    var timeformat = d3.time.format('%Y-%m-%d')
    var format = d3.format(',d');
    var percent = d3.format('.0%');
    var duration = 500;

    var container = function(selection) {
      return d3.select(selection).node().getBoundingClientRect();
    };

    var clear = function(selection, exclude, callback) {
      var n = 0, s = selection.select('.simpledatavis'), e = s.selectAll('*');
      if (!s.empty() && (!exclude || !s.classed(exclude)) && (!e.empty())) {
        e.data([]).exit().transition()
          .attr('opacity', 0)
          .attr('width', 0)
          .each('start', function(){ n++; })
          .each('end', function() {
            this.remove();
            if (--n == 0 && callback) {
              s.remove();
              callback();
            } });
      }
      else if (callback) {
        callback();
      }
    };

    var message = function(selection, message) {
      clear(d3.select(selection), 'message', function() {
        var box = container(selection);
        var s = d3.select(selection).selectAll('svg').data([message]);
        s.enter().append('svg');
        s.attr('width', box.width)
          .attr('height', 200)
          .attr('class', 'simpledatavis message');
        var msg = s.selectAll('text.message').data([message]);
        msg.enter().append('text')
          .attr('class', 'message')
          .attr('opacity', 0)
          .attr('x', 50)
          .attr('y', 40);
        msg.transition()
          .attr('opacity', 1)
          .text(message);
        msg.exit().transition().attr('opacity', 0).remove();
      });
    };

    var tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('max-width', '300px')
      .text('tooltip');

    var hint = {
      mouseover: function(d, i, options, text) {
        tooltip
          .text(hint.tooltiptext(d, i, options))
          .style('visibility', 'visible');
      },
      mousemove: function(d, i) {
        tooltip
          .style('top', (d3.event.pageY-10)+'px')
          .style('left',(d3.event.pageX+10)+'px');
      },
      mouseout: function(d, i) {
        tooltip.style('visibility', 'hidden');
      },
      tooltiptext: function(d, i, options, text) {
        return function() {
          if (typeof options.tooltip === 'function') {
            return options.tooltip(d);
          }
          else if (typeof options.tooltip === 'string') {
            return options.tooltip;
          }
          else if (typeof text === 'function') {
            return text(d, i);
          }
          else if (typeof text === 'string') {
            return text;
          }
          else {
            var msg = (d.data && d.data.key ? d.data.key : d.key) + ': ' + d.value;
            if (d.date) msg += ' , date: ' + d.date;
            if (d.geo) msg += ' , geo: ' + (d.geo.length && isArray(d.geo[0]) ? d.geo.length : d.geo);
            return msg;
          }
        }
      }
    };

    var charts = {
      tableChart: function(tabledata, options, callback) {
        var data = tabledata ? (tabledata.data || tabledata) : [];
        var opts = options || {};
        var cols = tabledata.fields || [];

        if (cols.length === 0) {
          data.forEach(function(d) {
            for (var v in d) {
              if (cols.indexOf(v) === -1) cols.push(v);
            }
          });
        }

        var box = container(this);
        var width = Math.max(800, box.width);
        var height = Math.max(500, box.height);
        var margin = {top: 25, right: 25, bottom: 25, left: 25};

        var color = d3.scale.category10();
        var line = d3.svg.line();

        // setup the container element
        var div = d3.select(this).selectAll('div').data([data]);
        div.enter().append('div');
        div.attr('width', width)
          .attr('class', 'simpledatavis tablechart')
          .style('max-height', '600px')
          .style('overflow', 'scroll');

        // table
        var table = div.selectAll('table').data([data]);
        table.enter().append('table');
        table.attr('width', width)
          .attr('height', height)
          .attr('class', 'table table_basic');

        // thead
        var thead = table.selectAll('thead').data([cols]);
        thead.enter()
          .append('thead');

        var theadr = thead.selectAll('tr').data([cols]);
        theadr.enter()
          .append('tr');

        var th = theadr.selectAll('th').data(cols);
        th.enter()
          .append('th');
        th.text(function(d) { return d; });
        th.exit().remove();

        // tbody
        var tbody = table.selectAll('tbody').data([data]);
        tbody.enter()
          .append('tbody');

        var rows = tbody.selectAll('tr').data(data);
        rows.enter()
          .append('tr');

        var cells = rows.selectAll('td')
          .data(function(d) {
            return cols.map(function(c) {
              return {column: c, value: d[c]};
            });
          });

        if (opts.htmlcells) {
          cells.enter().append('td');
          cells.html(function(d) {
            if (typeof d.value === 'number') return format(d.value) || d.value;
            else return d.value;
          });
        }
        else {
          cells.enter().append('td');
          cells.text(function(d) {
            if (typeof d.value === 'number') return format(d.value) || d.value;
            else return d.value;
          });
        }
        
        cells.exit().remove();
      },

      barChart: function (bardata, options, callbacks) {
        var data = bardata ? (bardata.data || bardata) : [];
        var hpb = data.length <= 10 ? 35 : data.length <= 20 ? 25 : 15;

        var box = container(this);
        var width = Math.max(800, box.width);
        var height = Math.max(400, (hpb * data.length));
        var margin = { left: 100, right: 75 };

        var color = d3.scale.category10();

        // set the ranges
        xScale.range([margin.left, width - margin.left - margin.right]);
        yScale.range([0, height]);

        // scale the data
        xScale.domain([0, d3.max(data, function(d) { return d.value; })]);
        yScale.domain([0, Math.max(10, data.length)]);

        // setup the svg element
        var svg = d3.select(this).selectAll('svg').data([data]);
        svg.enter().append('svg');
        svg.attr('width', width)
          .attr('height', height)
          .attr('class', 'simpledatavis barchart');

        var bars = svg.selectAll('rect.bar').data(data);

        // add new bars
        bars.enter().append('rect')
          .attr('class', 'bar')
          .attr('opacity', 0);

        // update bars
        bars.transition()
          .attr('x', xScale(0))
          .attr('y', function(d, i) { return yScale(i + 0.1); })
          .attr('height', function(d, i) {
            return yScale(i + 0.9) - yScale(i + 0.1);
          })
          .attr('width', function(d) { return xScale(d.value); })
          .attr('opacity', 1)
          .style('fill', function(d, i) { return color(i); });

        // remove old bars
        bars.exit().transition()
          .attr('opacity', 0)
          .attr('width', 0)
          .remove();

        // key labels
        var keyLabels = svg.selectAll('text.barkey').data(data);

        // add new key labels
        keyLabels.enter().append('text')
          .attr('class', 'barkey')
          .attr('opacity', 0)
          .attr('dx', '-0.3em')
          .attr('dy', '0.35em')
          .attr('text-anchor', 'end')
          .on('mouseover', function(d, i) {
            hint.mouseover(d, i, options);
          })
          .on('mousemove', hint.mousemove)
          .on('mouseout', hint.mouseout);

        // update key labels
        keyLabels.transition()
          .attr('x', xScale(0))
          .attr('y', function(d, i) { return yScale(i + 0.5); })
          .attr('opacity', 1)
          .text(function(d) {
            var l = margin.left / 10;
            if (d.key.length > l) {
              return d.key.substring(0, l) + '...';
            }
            else {
              return d.key;
            }
          })

        // remove old key labels
        keyLabels.exit().transition()
          .attr('opacity', 0)
          .attr('x', 0)
          .remove();

        // value labels
        var valueLabels = svg.selectAll('text.barvalue').data(data);

        // add new value labels
        valueLabels.enter().append('text')
          .attr('class', 'barvalue')
          .attr('opacity', 0)
          .attr('dx', '0.3em')
          .attr('dy', '0.35em');

        // update value labels
        valueLabels.transition()
          .attr('x', function(d) { return xScale(d.value) + margin.left; })
          .attr('y', function(d, i) { return yScale(i + 0.5); })
          .attr('opacity', 1)
          .text(function(d) { return '(' + d.value + ')' });

        // remove old value labels
        valueLabels.exit().transition()
          .attr('opacity', 0)
          .attr('x', 0)
          .remove();
      },

      donutChart: function(donutchartdata, options, callbacks) {
        var data = donutchartdata ? (donutchartdata.data || donutchartdata) : [];
        var keys = donutchartdata.keys && donutchartdata.keys.length ?
          donutchartdata.keys :
          data.map(function(d) { return d.key });

        data = data.sort(function(a, b) {
          return a.key > b.key ? 1 : (a.key < b.key ? -1 : 0);
        });

        var box = container(this);
        var width = Math.max(800, box.width);
        var height = Math.max(500, (20 * data.length));
        var outerRadius = Math.min(height, width) / 2 - 20;
        var innerRadius = outerRadius / 3;
        var cornerRadius = 10;

        var arc = d3.svg.arc();
        var color = d3.scale.category10();
        var pie = d3.layout.pie()
          .padAngle(.01)
          .value(function(d) { return d.value })
          .sort(null);

        color.domain(keys);

        arc.padRadius(outerRadius)
          .innerRadius(innerRadius);

        function arcExplode(outerRadius, delay) {
          d3.select(this).transition().delay(delay).attrTween('d', function(d) {
            var i = d3.interpolate(d.outerRadius, outerRadius);
            return function(t) { d.outerRadius = i(t); return arc(d); };
          });
        }

        function arcResize(a) {
          var i = d3.interpolate(this._current, a);
          this._current = i(0);
          return function(t) {
            return arc(i(t));
          };
        }
        

        // setup the svg element
        var svg = d3.select(this).selectAll('svg').data([data]);
        svg.enter().append('svg');
        svg.attr('width', width)
          .attr('height', height)
          .attr('class', 'simpledatavis donutchart');

        var graph = svg.selectAll('g').data([data]);
        graph.enter().append('g')
        graph.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

        // pie chart arcs
        var arcs = graph.selectAll('path').data(pie);

        // add new arcs
        arcs.enter().append('path')
          .each(function(d) {
            d.outerRadius = outerRadius - 20;
            this._current = d;
          })
          .attr('d', arc);

        // update arcs
        arcs.transition().attrTween('d', arcResize)
          .each('end', function(d) {
            d.outerRadius = outerRadius - 20;
            this._current = d;
            d3.select(this)
              .attr('fill', function(d, i) {
                return color(d.data.key);
              })
              .on('mouseover', function(d, i) {
                hint.mouseover(d, i, options);
                arcExplode.call(this, outerRadius, 0);
              })
              .on('mousemove', hint.mousemove)
              .on('mouseout', function(d, i) {
                hint.mouseout(d, i);
                arcExplode.call(this, outerRadius - 20, 150);
              });
          });

        // remove old arcs
        arcs.exit().transition()
          .style('opacity', 0)
          .remove();

        // legend key
        var legendkey = svg.selectAll('rect.legend').data(keys);

        // add new keys
        legendkey.enter().append('rect')
          .attr('class', 'legend')
          // .attr('opacity', 0)
          .attr('x', 0)
          .attr('y', function(d, i) { return i*20; })
          .attr('width', 18)
          .attr('height', 18);

        // update keys
        legendkey.transition()
          .style('fill', function(d) { return color(d); });

        // remove old keys
        legendkey.exit().transition()
          .attr('opacity', 0)
          .remove()

        // legend label
        var total = d3.sum(data, function(d) { return d.value });
        var legendlabel = svg.selectAll('text.legend').data(keys);

        // add new labels
        legendlabel.enter().append('text')
          .attr('class', 'legend')
          .attr('x', 24)
          .attr('y', function(d, i) { return (i*20 + 9); })
          .attr('dy', '.35em');

        // update labels
        legendlabel.transition()
          .text(function(d) {
            var current = data.filter(function(_d) { return _d.key === d; });
            var v = current.length > 0 ? current[0].value : 0;
            return d + ': ' + percent(v / total); });

        // remove old labels
        legendlabel.exit().transition()
          .attr('opacity', 0)
          .remove();
      },

      bubbleChart: function(bubblechartdata, options, callbacks) {
        var data = bubblechartdata ? (bubblechartdata.data || bubblechartdata) : [];

        var diameter = 800;
        var box = container(this);
        var width = Math.max(diameter, box.width);
        var height = diameter;

        var color = d3.scale.category20();
        var bubble = d3.layout.pack()
          .sort(null)
          .padding(3);

        bubble.size([width, height]);

        // setup the svg element
        var svg = d3.select(this).selectAll('svg').data([data]);
        svg.enter().append('svg');
        svg.attr('width', width)
          .attr('height', height)
          .attr('class', 'simpledatavis bubblechart');

        var nodes = bubble.nodes({children:data})
          .filter(function(d) { 
            return !d.children;
          });

        var node = svg.selectAll('.node').data(nodes, function(d) { return d.key; });

        // update circle sizes
        svg.selectAll('circle')
          .data(nodes, function(d) { return d.key; })
          .transition()
          .duration(duration)
          .delay(function(d, i) {return i * 7;}) 
          .attr('r', function(d) { return d.r; });

        // update text 
        svg.selectAll('text')
          .data(nodes, function(d) { return d.key; })
          .transition()
          .duration(duration)
          .delay(function(d, i) {return i * 7;}) 
          .text(function(d) {
            var l = d.r / 5;
            if (d.key.length > l) {
              return d.key.substring(0, l) + '...';
            }
            else {
              return d.key;
            }
          });

        // update node positioning
        node.transition()
          .duration(duration)
          .delay(function(d, i) {return i * 7;}) 
          .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          })
          .style('opacity', 1);

        // add new nodes
        var g = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

        // add circles
        g.append('circle')
          .attr('r', function(d) { return d.r; })
          .style('fill', function(d, i) { return color(d.value); })
          .on('mouseover', function(d, i) {
            hint.mouseover(d, i, options);
          })
          .on('mousemove', hint.mousemove)
          .on('mouseout', hint.mouseout);

        // add text
        g.append('text')
          .attr('dy', '.3em')
          .attr('class', 'bubbletext')
          .text(function(d) {
              var l = d.r / 5;
              if (d.key && d.key.length > l) {
                return d.key.substring(0, l) + '...';
              }
              else {
                return d.key;
              }
          });

        // remove old nodes
        node.exit().transition()
          .duration(duration)
          .style('opacity', 0)
          .remove();
      },

      geoChart: function(geodata, options, callbacks) {
        var data = geodata ? (geodata.data || geodata) : [];
        
        if (!geodata.features) {
          message(this, 'Missing map feaures');
          if (typeof callbacks.onFail === 'function') {
            callbacks.onFail('Missing map feaures');
          }
        }
        else {
          var box = container(this);
          var width = Math.max(800, box.width);
          var height = (width / 2);

          var color = d3.scale.category10();
          var radius = d3.scale.ordinal().range([5, 15]);
          var explode = d3.scale.ordinal().range([15, 30]);
          var projection = d3.geo.equirectangular();
          var geopath = d3.geo.path();

          // var geoGroup = data[0].geo && (typeof data[0].geo != 'string') && isNaN(data[0].geo[0]);
          var geoGroup = data[0].geo && isArray(data[0].geo) && isArray(data[0].geo[0]);
          var geoStr = (typeof data[0].geo === 'string') && data[0].geo.split(',').length == 2;
          var geoKeyStr = (typeof data[0].key === 'string') && data[0].key.split(',').length == 2;
          var geoKey = isNaN(data[0].key) && data[0].key.length == 2 && !isNaN(data[0].key[0]) && !isNaN(data[0].key[1])

          var countFunc = geoGroup ? 
            (function(d) { return d.geo.length; }) :
            (function(d) { return d.value; });

          var coordinate = function(d) {
            if (geoGroup) {
              if (geoKey) return d.key;
              else if (geoKeyStr) return d.key.split(',');
              else return d.geo[0];
            }
            else {
              if (geoStr) return d.geo.split(',');
              else if (d.geo) return d.geo;
              else if (geoKey) return d.key;
              else if (geoKeyStr) return d.key.split(',');
            }
          };

          // scale the data
          radius.domain([
            d3.min(data, function(d) { return d.value; }),
            d3.max(data, function(d) { return d.value; })
          ]);

          color.domain([
            d3.min(data, countFunc),
            d3.max(data, countFunc)
          ]);

          explode.domain([
            d3.min(data, countFunc),
            d3.max(data, countFunc)
          ]);

          // setup the svg element
          var svg = d3.select(this).selectAll('svg').data([data]);
          svg.enter().append('svg');
          svg.attr('width', width)
            .attr('height', height)
            .attr('class', 'simpledatavis geochart');

          // setup the map projections
          var proj = geodata.projection ?
            geodata.projection :
            projection
              .scale(height / Math.PI)//153)
              .translate([width / 2, height / 2])
              .precision(.1);

          geopath.projection(proj);

          // paint the land
          if (geodata.features.length && geodata.features[0].type) {
            svg.selectAll('path')
              .data(geodata.features)
              .enter()
              .append('path')
              .attr('class', 'land')
              .attr('d', geopath);
          }
          else {
            svg.append('path')
              .datum(geodata.features)
              .attr('class', 'land')
              .attr('d', geopath);
          }

          // geo points
          var points = svg.selectAll('.pin').data(data);

          // add new points
          points.enter()
            .append('circle', '.pin')
            .attr('r', 0)
            .attr('opacity', 0)
            .style('fill', function(d, i) { return color(geoGroup ? d.geo.length : i); })
            .on('mouseover', function(d, i) {
              d3.select(this).transition()
                .attr('r', function(d) {
                  return explode(geoGroup ? d.geo.length: 1);
                })
                .attr('opacity', 0.5);

              hint.mouseover(d, i, options,
                        (d.value + ' activities near ['+coordinate(d)+']'));
            })
            .on('mousemove', hint.mousemove)
            .on('mouseout', function(d, i) {
              d3.select(this).transition()
                .attr('r', function(d) { return radius(d.value); })
                .attr('opacity', 0.75);
              hint.mouseout(d, i);
            });

          // update points
          points.transition()
            .attr('transform', function(d) {
              var coor = coordinate(d);
              return 'translate(' + proj(coor) + ')'
            })
            .attr('r', function(d) { return radius(d.value); })
            .attr('opacity', 0.75)

          // remove old points
          points.exit().transition()
            .attr('r', 0)
            .attr('opacity', 0)
            .remove();
        }
      },

      timeChart: function(timelinedata, options, callbacks) {
        var data = timelinedata ? (timelinedata.data || timelinedata) : [];
        var opts = options || {};
        var keys = timelinedata.keys || data.map(function(d) { return d.key; });

        var margin = {top: 20, right: 150, bottom: 30, left: 75};
        var box = container(this);
        var width = Math.max(800, box.width) - margin.left - margin.right;
        var height = 500 - margin.top - margin.bottom;

        var color = d3.scale.category10();
        var line = d3.svg.line();

        // set the ranges
        tScale.range([0, width]);
        yScale.range([height, 0]);
        color.domain(keys);

        // scale the data
        tScale.domain([
          d3.min(data, function(c) { return c.date; }),
          d3.max(data, function(c) { return c.date; })
        ]);

        yScale.domain([0, d3.max(data, function(c) { return c.value; })]);

        // define the axes
        var xAxis = d3.svg.axis().scale(tScale).orient('bottom');
        var yAxis = d3.svg.axis().scale(yScale).orient('left');

        // setup the svg element
        var svg = d3.select(this).selectAll('svg').data([data]);
        svg.enter().append('svg');
        svg.attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .attr('class', 'simpledatavis timeline');

        var graph = svg.selectAll('g').data([data]);
        graph.enter().append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // setup the x axis
        var xaxis = graph.selectAll('g.x').data([data]);
        xaxis.enter().append('g').attr('class', 'x axis');
        xaxis.transition()
          .attr('transform', 'translate(0,' + height + ')')
          .attr('opacity', 1)
          .call(xAxis);
        xaxis.exit().remove();

        // setup the y axis
        var yaxis = graph.selectAll('g.y').data([data]);
        yaxis.enter().append('g').attr('class', 'y axis');
        yaxis.transition()
          .attr('opacity', 1)
          .call(yAxis);
        yaxis.exit().remove();

        if (opts.scatter) {
          // timeplot
          var circles = graph.selectAll('circle').data(data);

          // add new points
          circles.enter().append('circle').attr('r', 5);

          // update points
          circles
            .attr('cx', function(d) { return tScale(d.date) })
            .attr('cy', function(d) { return yScale(d.value) })
            .attr('class', function(d) { return 'dot event'+d.key.replace(/\s+/g, ''); })
            .style('fill', function(d) { return color(d.key);})
            .on('mouseover', function(d, i) {
              d3.select(this).transition().attr('r', 10);
              hint.mouseover(d, i, options,
                  (timeformat(new Date(d.date)) + ', ' + d.key + ', ' + d.value));
            })
            .on('mousemove', hint.mousemove)
            .on('mouseout', function(d, i) {
              d3.select(this).transition().attr('r', 5)
              hint.mouseout(d, i);
            });

          // remove old points
          circles.exit().remove();
        }
        else {
          // timeline
          line
            .x(function(d) { return tScale(d.date); })
            .y(function(d) { return yScale(d.value); });

          var keynest = d3.nest().key(function(d) { return d.key }).entries(data);
          var evtgraph = graph.selectAll('g.event').data([keynest]);
          evtgraph.enter().append('g')
            .attr('class', 'event');
          evtgraph.exit().remove();

          // event line
          var evtpath = evtgraph.selectAll('path.line').data(keynest);

          // add new lines
          evtpath.enter()
            .append('path')
              .attr('class', function(d) {
                return 'line event'+d.key.replace(/\s+/g, '');
              })
              .style('stroke', function(d) { return color(d.key); });

          // update lines
          evtpath.transition()
            .attr('d', function(d) { return line(d.values); });

          // remove old lines
          evtpath.exit().remove();
        }

        // legend key
        var legendkey = svg.selectAll('rect.legend').data(timelinedata.keys);

        // add new keys
        legendkey.enter().append('rect')
          .attr('class', 'legend')
          // .attr('opacity', 0)
          .attr('x', width + margin.left + 25)
          .attr('y', function(d, i) { return i*20; })
          .attr('width', 18)
          .attr('height', 18);

        // update keys
        legendkey.transition()
          .style('fill', function(d) { return color(d); });

        // remove old keys
        legendkey.exit().transition()
          .attr('opacity', 0)
          .remove()

        // legend label
        var legendlabel = svg.selectAll('text.legend').data(timelinedata.keys);

        // add new labels
        legendlabel.enter().append('text')
          .attr('class', 'legend')
          .attr('x', width + margin.left + 45)
          .attr('y', function(d, i) { return (i*20 + 9); })
          .attr('dy', '.35em');

        // update labels
        legendlabel.transition()
          .text(function(d) { return d; })
          .each('end', function(d) {
            d3.select(this)
              .on('click', function(d) {
                var path = d3.selectAll('.event'+d.replace(/\s+/g, ''));
                path.transition().duration(100) 
                  .style('display', (this.display = (this.display == 'none' ? '' : 'none')));
              });
          });

        // remove old labels
        legendlabel.exit().transition()
          .attr('opacity', 0)
          .remove();
      }
    };

    var getchart = function() {
      if (typeof type === 'function') {
        return type;
      }
      else if (typeof type === 'string') {
        var chartFunc = type.toLowerCase() + 'Chart';
        if (charts[chartFunc]) {
          return chartFunc;
        }
        else {
          console.warn('invalid chart type specified:', type);
          //default to table
          return 'tableChart';
        }
      }
    }

    return function chart(selection) {
      selection.each(function(chartdata) {
        var that = this;
        var data = chartdata ? (chartdata.data || chartdata) : [];
        if (data.length == 0) {
          message(this, 'No results available');
          if (typeof callbacks.onEnd === 'function') {
            callbacks.onEnd(data);
          }
        }
        else {
          var charttype = getchart();
          var name = typeof charttype === 'string' ? charttype.toLowerCase() : null;
          clear(d3.select(that), name, function() {
            if (name) {
              (charts[charttype]).call(that,chartdata, options, callbacks);
            }
            else if (typeof charttype === 'function') {
              charttype.call(that,chartdata, options, callbacks);
            }
            else {
              console.error('Failed determining chart type.', charttype);
              if (typeof callbacks.onFail === 'function') {
                callbacks.onFail('Failed determining chart type');
              }
            }
          });
        }
      });
    }
  };

  var simpledatavis = function() {
    var options = {};
    var callbacks = {};
    var scope = {};

    var datavis = function(selection) {
      var visOptions = shallowCopy(options);
      var visCallback = shallowCopy(callbacks);

      if (typeof visOptions.tooltip === 'string') {
          if (scope[visOptions.tooltip]) {
            visOptions.tooltip = scope[visOptions.tooltip];
          }
          else if (window[visOptions.tooltip]) {
            visOptions.tooltip = window[visOptions.tooltip]
          }
      }

      var onStart = function() {
        if (typeof visCallback.start === 'function') {
          visCallback.start.apply(selection, arguments);
        }
        else if (typeof visCallback.start === 'string') {
          if (scope[visCallback.start]) {
            scope[visCallback.start].apply(selection, arguments);
          }
          else if (window[visCallback.start]) {
            window[visCallback.start].apply(selection, arguments);
          }
        }
      };

      var onFail = function() {
        if (typeof visCallback.fail === 'function') {
          visCallback.fail.apply(selection, arguments);
        }
        else if (typeof visCallback.fail === 'string') {
          if (scope[visCallback.fail]) {
            scope[visCallback.fail].apply(selection, arguments);
          }
          else if (window[visCallback.fail]) {
            window[visCallback.fail].apply(selection, arguments);
          }
        }
      };

      var onData = function(data) {
        var updated;
        if (typeof visCallback.data === 'function') {
          updated = visCallback.data.apply(selection, arguments);
        }
        else if (typeof visCallback.data === 'string') {
          if (scope[visCallback.data]) {
            updated = scope[visCallback.data].apply(selection, arguments);
          }
          else if (window[visCallback.data]) {
            updated = window[visCallback.data].apply(selection, arguments);
          }
        }
        updated = (typeof updated === 'undefined') ? data : updated;
        return updated;
      };

      var onEnd = function() {
        if (typeof visCallback.end === 'function') {
          visCallback.end.apply(selection, arguments);
        }
        else if (typeof visCallback.end === 'string') {
          if (scope[visCallback.end]) {
            scope[visCallback.end].apply(selection, arguments);
          }
          else if (window[visCallback.end]) {
            window[visCallback.end].apply(selection, arguments);
          }
        }
      };

      var done = function(data) {
        var d = onData(data);
        if (selection) {
          d = (d && d.rows) ? d.rows : d;
          var chart = metricscharts(visOptions.chart, visOptions, { onFail: onFail, onEnd: onEnd });
          selection
            .datum(d)
            .call(chart);
        }
        else {
          onEnd();
        }
      };

      var cb = { onStart: onStart, onFail: onFail, done: done };

      metricsdata(visOptions.view, visOptions, cb);
    }

    datavis.attr = function(option, keyOrValue, value) {
      if (typeof keyOrValue === 'undefined') {
        return options[option];
      }
      else if (option === 'param') {
        if (keyOrValue == null) {
          options['param'] = {};
        }
        else if (typeof value === 'undefined') {
          return options['param'][keyOrValue];
        }
        else {
          var param = (options['param'] || {});
          if (keyOrValue === 'group_level' && options.hasOwnProperty('group')) {
            delete options.group;
          }
          param[keyOrValue] = value;
          options['param'] = param;
        }
      }
      else {
        if (option === 'group' && options.param && options.hasOwnProperty('group_level')) {
          delete options.param['group_level'];
        }
        options[option] = keyOrValue;
      }
      return datavis;
    };

    // callbacks include 'start', 'data', 'end', 'fail'
    datavis.on = function(callback, value) {
      if (typeof value === 'undefined') {
        return callbacks[callback];
      }
      else {
        callbacks[callback] = value;
      }
      return datavis;
    };

    datavis.render = function(selector, context) {
      if (context === null) {
        scope = {};
      }
      else if (typeof context === 'string') {
        scope = window[context];
      }
      else if (typeof context !== 'undefined') {
        scope = context;
      } 

      if (typeof selector === 'string') {
        d3.select(selector).call(datavis);
      }
      else if (!selector) {
        datavis();
      }
      else if (typeof selector.call === 'function') {
        selector.call(datavis);
      }
      else {
        var msg = 'datavis.render invalid selector: ' + selector;
        console.error(msg);
        if (typeof callbacks.fail === 'function') {
          callbacks.fail(msg);
        }
        else if (typeof callbacks.fail === 'string') {
          if (scope[callbacks.fail]) {
            scope[callbacks.fail](msg);
          }
          else if (window[callbacks.fail]) {
            window[callbacks.fail](msg);
          }
        }
      }

      return datavis;
    };

    datavis.init = function(selection, context) {
      // var mv = {};
      var s = selection || d3.selectAll('[data-vis-view]');
      s.each(function() {
        var t = d3.select(this);
        var mvurl = t.attr('data-vis') || url;
        var view =  t.attr('data-vis-view');

        if (mvurl || view) {
          var mv = new SimpleDataVis(mvurl);
          var attributes = this.attributes;
          var onPre = 'data-vis-on';
          var paramPre = 'data-vis-param';
          var attrPre = 'data-vis-';

          for (var i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            if (attr.name.indexOf(onPre) == 0) {
              mv.on(attr.name.substring(onPre.length), attr.value);
            }
            else if (attr.name.indexOf(paramPre) == 0) {
              var param = attr.value.split('=');
              if (param.length == 2) {
                mv.attr('param', param[0], param[1]);
              }
              else {
                mv.attr('param', null);
              }
            }
            else if (attr.name.indexOf(attrPre) == 0) {
              var attrName = attr.name.substring(attrPre.length);
              mv.attr(attrName, attr.value);
            }
          }

          mv.render(d3.select(this), context);
        }
      });
    }

    return datavis;
  };

  return simpledatavis();
};


// find elements with data-vis-view attribute and initiate them
(function() {
  window.addEventListener('DOMContentLoaded', function () {
    var smv = new SimpleDataVis();
    var selections = d3.selectAll('[data-vis-view]').call(smv.init);
  });
}());