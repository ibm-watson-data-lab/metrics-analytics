angular.module('visualizationAppService', [])

.factory('visService', ['$q',
  function($q) {
    var dataVis = new SimpleDataVis('/tracker_db/_design/app/_view');

    var init = function() {
      dataVis.init.apply(dataVis, arguments);
    };

    var summary = function() {
      var deferred = $q.defer();

      dataVis
        .attr('view', 'summary_by_day')
        .attr('param', 'startkey', '[""]')
        .attr('param', 'endkey', '[{}]')
        .attr('group', 1)
        .on('data', function(data) {
          var rows = data.rows || [];
          var allCols = ['siteId'];
          var allCounts = [];

          for (var row in rows) {
            rows[row].value['siteId'] = rows[row].key;
            allCounts.push(rows[row].value);
            for (var value in rows[row].value) {
              if (allCols.indexOf(value) === -1) {
                allCols.push(value);
              }
            }
          }
          return deferred.resolve(allCounts);
        })
        .display();

      return deferred.promise;
    };

    // all time total grouped by location
    var totalPerLocation = function(selector) {
      d3.json('/tracker_db/_design/app/vendor/couchapp/map.world.json',
        function(error, world) {
          if (error) throw error;

          SimpleDataVis('http://127.0.0.1:5984/tracker_db/_design/app/_view')
            .attr('chart', 'geo')
            .attr('view', 'grouped_geos')
            .attr('param', null)
            .attr('group', true)
            .on('data', function(data) {
              var keyfunc = function(d) { return [d.key[0].toFixed(0), d.key[1].toFixed(0)]; };
              var rollupfunc = function(l) {
                return {
                  value: d3.sum(l, function(d) { return d.value; }),
                  geos: l//.map(function(d) { return d.key })
                }
              };

              var rows = data.rows || [];
              var results = [];

              if (rows.length > 0) {
                // format: [{ key:"", values:# }, ...]
                results = d3.nest()
                  .key(keyfunc)
                  .rollup(rollupfunc)
                  .entries(rows);
              }

              results.forEach(function(d) {
                d.value = d.values.value;
                d.geos = d.values.geos;
                delete d.values;
              });

              results.features = topojson.feature(world, world.objects.land);
              return results;
            })
            .display(selector);
        }
      );
    };

    var siteDateKey = function(siteId, date, wildcard) {
      // [siteid, year, month, day, wildcard]
      var key = [];

      var ar = date ? date.split('-') : [];
      if (ar.length == 3) {
        key = [Number(ar[0]), Number(ar[1]), Number(ar[2])];
      }

      if (siteId !== null && typeof siteId !== 'undefined') {
        key.length == 0 ? key.push(siteId) : key.unshift(siteId);
      }

      if (typeof wildcard !== 'undefined' && wildcard !== null) {
        key.push(wildcard);
      } 
      return key;
    };

    var browserKey = function(userAgent) {
      // https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
      if (userAgent.indexOf('Firefox/') > 0 && userAgent.indexOf('Seamonkey/') == -1)
        return 'Firefox';
      if (userAgent.indexOf('Chrome/') > 0 && userAgent.indexOf('Chromium/') == -1)
        return 'Chrome';
      if (userAgent.indexOf('Safari/') > 0 && userAgent.indexOf('Chrome/') == -1 && userAgent.indexOf('Chromium/') == -1)
        return 'Safari';
      if (userAgent.indexOf('MSIE') > 0)
        return 'Internet Explorer';
      return 'Other';
    };

    var keyPrefix = {
      byBrowser: 'useragent',
      bySearchCategories: 'searchcat'
    };

    var attrMap = {
      byDaySummary: { view: 'summary_by_day', scatter: true },
      byBrowser: { view: 'total_by_field' },
      topTenSearches: { view: 'grouped_searches' },
      bySearchCategories: { view: 'total_by_field' }
    };

    var dataMap = {
      byDaySummary: function(data) {
        var rows = data.rows || [];
        var allEvents = ['pageView', 'link', 'search'];
        var events = [];

        if (rows.length > 0) {
          // format: [{ key:"", date:date, value:# }, ...]
          rows.forEach(function(row) {
            allEvents.forEach(function(event) {
              if (row.value.hasOwnProperty(event)) {
                events.push({
                  key: event,
                  date: row.key.length > 3 ?
                        new Date(row.key[1], row.key[2]-1, row.key[3]) :
                        new Date(row.key[0], row.key[1]-1, row.key[2]),
                  value: row.value[event]
                });
              }
            });
          });
        }

        return {
          data: events,
          keys: allEvents
        };
      },
      byBrowser: function(data) {
        var kf = function(d) { return browserKey(d.key[5]); };
        var rf = function(l) { return d3.sum(l, function(d) { return d.value;  }); };

        var rows = data.rows || [];
        var results = [];

        if (rows.length > 0) {
          // format: [{ key:"", values:# }, ...]
          results = d3.nest()
            .key(kf)
            .rollup(rf)
            .entries(rows);
        }

        results.forEach(function(d) {
          d.value = d.values;
          delete d.values;
        });

        return {
          data: results,
          keys: ['Chrome', 'Firefox', 'Safari', 'Internet Explorer', 'Other']
        }
      },
      topTenSearches: function(data) {
        var kf = function(d) { return d.key[d.key.length - 1]; };
        var rf = function(l) {
          return {
            value: d3.sum(l, function(d) { return d.value.count; }),
            topResultCount: d3.max(l, function(d) { return d.value.topResultCount; })
          }
        };

        var rows = data.rows || [];
        var results = [];

        if (rows.length > 0) {
          // format: [{ key:"", values:# }, ...]
          results = d3.nest()
            .key(kf)
            .rollup(rf)
            .entries(rows);
        }

        results.forEach(function(d) {
          d.value = d.values.value;
          d.topResultCount = d.values.topResultCount
          delete d.values;
        });
        results = results.sort(function(a, b) { return b.value - a.value; });

        return results.slice(0, 10);
      },
      bySearchCategories: function(data) {
        var kf = function(d) { return d.key[d.key.length - 1]; };
        var rf = function(l) { return d3.sum(l, function(d) { return d.value;  }); };

        var rows = data.rows || [];
        var results = [];

        if (rows.length > 0) {
          // format: [{ key:"", values:# }, ...]
          results = d3.nest()
            .key(kf)
            .rollup(rf)
            .entries(rows);
        }

        results.forEach(function(d) {
          d.value = d.values;
          delete d.values;
        });

        return results;
      }
    };

    var siteChart = function(selector, options) {
      var opts = options || {};

      var startkey = siteDateKey(opts.siteId, opts.startDate, 0);
      var endkey = siteDateKey(opts.siteId, opts.endDate, {}); 

      if (keyPrefix[opts.visName]) {
        startkey ? startkey.unshift(keyPrefix[opts.visName]) : startkey = [keyPrefix[opts.visName]];
        endkey ? endkey.unshift(keyPrefix[opts.visName]) : endkey = [keyPrefix[opts.visName]] ;
      }

      if (attrMap[opts.visName]) {
        Object.keys(attrMap[opts.visName]).forEach(function(key) {
          dataVis.attr(key, attrMap[opts.visName][key]);
        });
      }

      if (opts.view) dataVis.attr('view', opts.view);

      return dataVis
        .attr('chart', opts.chartType)
        .attr('param', null)
        .attr('startkey', startkey)
        .attr('endkey', endkey)
        .attr('group', true)
        .on('start', function(url) {
          this.select('.spinner').style('visibility', 'initial');
        })
        .on('data', function(data) {
          console.log(data);
          this.select('.spinner').style('visibility', null);
          return dataMap[opts.visName](data);
        })
        .on('end', function() {
          console.log('end', arguments);
        })
        .on('fail', function(err) {
          console.log('fail', err);
          this.select('.spinner').style('visibility', null);
        })
        .display(selector);
    };


    return {
      init: init,
      summary: summary,
      totalPerLocation: totalPerLocation,
      siteChart: siteChart
    }
  }
]);
