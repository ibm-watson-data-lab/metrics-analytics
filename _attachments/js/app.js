'use strict';

//Visualization App
var mainApp = angular.module('visualizationApp',
  ['ngRoute', 'visualizationAppService'],
  function($locationProvider) {
    //$locationProvider.html5Mode({'enabled': true, 'requireBase': false});
  }
)

.config(function($sceProvider) {
  $sceProvider.enabled(false);
})

.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: '/tracker_db/_design/app/pages/home.html'
    })
    .when('/summary', {
      templateUrl: '/tracker_db/_design/app/pages/summary.html',
      controller: 'summaryCtrl'
    })
    .when('/dashboard', {
      templateUrl: '/tracker_db/_design/app/pages/dashboard.html',
      controller: 'dashboardCtrl',
      reloadOnSearch: false,
      resolve: {
        sitesSummary: ['visService', function(visService) {
          return visService.summary();
        }]
      }
    })
    .otherwise({
      redirectTo: '/tracker_db/_design/app/index.html'
    });
})

.controller('navCtrl', ['$scope',
  function($scope) {
    $scope.$root.$on('$routeChangeSuccess', function(event, current, previous) {
      $scope.currentPath = current.$$route.originalPath;
    });
  }]
)

.controller('summaryCtrl', ['$scope', '$timeout', 'visService',
  function($scope, $timeout, visService) {
    // six month daily total of all sites combined
    $scope.startkey = moment().subtract(5, 'month').startOf('month')
      .format('[[]YYYY,M,D[]]');
    $scope.endkey = moment().endOf('month')
      .format('[[]YYYY,M,D[]]');

    var callbacks = {};
    
    callbacks.dailyOnData = function(data) {
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

      return { data: events, keys: allEvents };
    };

    callbacks.totalOnData = function(data) {
      var rows = data.rows || [];
      var allCols = ['siteId'];
      var allCounts = [];

      for (var row in rows) {
        rows[row].value['siteId'] = 
          '<a href="#/dashboard?site=' + rows[row].key + '" class="type_link">' + rows[row].key + '</a>';

        allCounts.push(rows[row].value);

        for (var value in rows[row].value) {
          if (allCols.indexOf(value) === -1) {
            allCols.push(value);
          }
        }
      }

      return { fields: allCols, data: allCounts };
    };

    // all time total grouped by location
    visService.totalPerLocation('#geolocation');

    $scope.$on('$viewContentLoaded', function(event) {
      console.log(event);
      $timeout(function() {
        visService.init(null, callbacks);
      }, 0);
    });
  }]
)

.controller('dashboardCtrl', ['$scope', 'sitesSummary', '$location',
  function($scope, sitesSummary, $location) {
    $scope.sitesSummary = sitesSummary;
    $scope.sites = sitesSummary.map(function(s) {
      return {
        siteId: s.siteId[0],
        search: !!s.search
      };
    });
    
    var initStart = moment().subtract(59, 'days');
    var initEnd = moment();
    var minDate = moment().subtract(2, 'year').startOf('year');
    var maxDate = moment().add(1, 'day');
    
    $('input[name="daterange"]')
      .val(initStart.format('YYYY-MM-DD') + ' - ' + initEnd.format('YYYY-MM-DD'));
    
    $('input[name="daterange"]')
      .daterangepicker({
        format: 'YYYY-MM-DD',
        startDate: initStart,
        endData: initEnd,
        minDate: minDate,
        maxDate: maxDate,
        // dateLimit: { days: 180 },
        ranges: {
          'Today': [moment(), moment()],
          'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
          'Last 7 Days': [moment().subtract(6, 'days'), moment()],
          'Last 30 Days': [moment().subtract(29, 'days'), moment()]
        },
        locale: {
          applyLabel: 'Submit'
        },
        buttonClasses: ['button_calendar'],
        applyClass: 'button_primary',
        cancelClass: 'button_secondary',
        opens: 'left'
      },
      function(startDate, endDate, label) {
        $scope.$apply(function() {
          $scope.dashboard.startDate = startDate.format('YYYY-MM-DD');
          $scope.dashboard.endDate = endDate.format('YYYY-MM-DD');
        });
      });

    var siteid = '', visname = null, charttype = null;
    var search = $location.search();
    if (search.hasOwnProperty('site')) {
      siteid = search.site;
    }
    else if ($scope.sites.length > 0) {
      siteid = $scope.sites[0].siteId;
    }
    if (search.hasOwnProperty('view')) {
      visname = search.view;
    }
    if (search.hasOwnProperty('chart')) {
      charttype = search.chart;
    }

    $scope.updateVis = function(visname, charttype) {
      if (visname) {
        $scope.dashboard.visName = visname;
      }
      if (charttype) {
        $scope.dashboard.chartType = charttype;
      }

      $location.search({ site: $scope.dashboard.siteId });

      $scope.disableSearches = $scope.sites.some(function(s) {
        return $scope.dashboard.siteId == s.siteId && !s.search; 
      });
    }

    $scope.dashboard = {
      siteId: siteid,
      startDate: initStart.format('YYYY-MM-DD'),
      endDate: initEnd.format('YYYY-MM-DD'),
      visName: visname || 'byBrowser',
      chartType: charttype || 'donut'
    };

    $scope.disableSearches = $scope.sites.some(function(s) {
      return $scope.dashboard.siteId == s.siteId && !s.search; 
    });
  }]
)

.directive('siteViz', ['visService', function(visService) {
    return {
      restrict: 'A',
      scope: {
        siteViz: '=',
      },
      replace: true,
      templateUrl: '/tracker_db/_design/app/pages/vis.html',
      link: function(scope, elem, attrs) {
        var visElem = d3.select(elem[0]).select('.vis');

        visService.siteChart(visElem, scope.siteViz);

        scope.$watch('siteViz', function(newValue, oldValue) {
          if (oldValue !== newValue) {
            visService.siteChart(visElem, newValue);
          }
        }, true);
      }
    };
  }]
);
