'use strict';

//Visualization App
var mainApp = angular.module('visualizationApp', [
  'ui.bootstrap'
],function($locationProvider) {
    $locationProvider.html5Mode({'enabled': true, 'requireBase': false});
})

.config(function($sceProvider) {
  $sceProvider.enabled(false);
})

.controller('vizModel', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
	
	$scope.presentationStyle = "chart";
	var startDateFilter = null;
	var endDateFilter = null;
	
	function updateDates( start, end ){
		startDateFilter = start.format('YYYY-MM-DD');
		endDateFilter = end.format('YYYY-MM-DD');
	}
	
	updateDates( initStartDate, initEndDate );
	configureDateFilter( function( start, end, label ){
		updateDates( start, end );
		$scope.selectVisualization();
	});
	
	
	var couchApp = null;
	//Acquire the app
    $.couch.app(function(app) {
    	couchApp = app;
    	
    	$scope.retrieveApps();
    	
    	//Boostrap
    	$scope.selectVisualization();
    });
    
    //Selected application
	$scope.selectedApp = null;
	
	$scope.contextualChartHTML = "";
	
	//Contains all the supported visualization
	$scope.visualizations=[
	    {name:"By Events - total", view: "grouped_events", builder: getTotalEventsChartBuilder() },
	    {name:"By Search Category", view: "search_by_categories", builder: getTotalEventsChartBuilder() },
	    {name:"By Platform", view: "events_by_platform", builder: getTotalEventsChartBuilder() },
	    {name:"By Browser", view: "events_by_browser", builder: getTotalEventsChartBuilder() }
	];
	
	$scope.selectedVisualization=$scope.visualizations[0];
	
    var path = unescape(document.location.pathname).split('/');
    var design = path[3];
    
	$scope.selectVisualization = function(visualization){
		
		//Reset node
		d3.select("#chart").html("").style("display","none");
		d3.select("#chartContainer").html("").style("display", "none");
		
		$scope.selectedVisualization = visualization || $scope.selectedVisualization;
		
		if ( $scope.selectedApp == null ){
			//No app selected, nothing to show
			return;
		}
		
		function getLookupKey( date, wildcard ){
			var ar = date ? date.split("-") : [];
			if ( ar.length == 3 ){
				return [$scope.selectedApp.key, Number(ar[0]), Number(ar[1]), Number(ar[2]), wildcard];
			}else{
				return [0, 0, 0, $scope.selectedApp.key, wildcard];
			}
		}
		
		if ( $scope.selectedVisualization ){
			//Render now
			var builder = $scope.selectedVisualization.builder;
			//Set the angular scope
			builder.$scope = $scope;
	    	var customOptions = builder.init( {
	    		selector: "#chart", 
	    		visualization: $scope.selectedVisualization,
	    		presentationStyle: $scope.presentationStyle
	    	});
	    	var options = {
    			startkey:getLookupKey( startDateFilter, 0 ),
	      		endkey: getLookupKey( endDateFilter, {} ),
	        	success: function( data ){
	        		if ( builder.applyUserSelections ){
	        			data = builder.applyUserSelections(data.rows);
	        		}else{
	        			data = data.rows;
	        		}
	        		
	        		if ( data.length == 0 ){
	    				return;
	    			}
	        		
	        		if ( !istable ){
	        			d3.select("#chart").style("display","");
	        			var customHTML = null;
	        			if ( $scope.presentationStyle == "chart" ){
	        				customHTML = builder.renderChart( data );
	        			}else if ( $scope.presentationStyle == "pie" ){
	        				if ( builder.renderPie ){
	        					customHTML = builder.renderPie( data );
	        				}
	        			}
	        			else{
	        				if ( builder.renderLine ){
	        					customHTML = builder.renderLine( data );
	        				}
	        			}
	        		}else{
	        			d3.select("#chartContainer").style("display", "");
	        			customHTML = builder.renderTable( data );
	        		}
	        		
	        		if ( !customHTML && builder.generateCustomHTML ){
	        			customHTML = builder.generateCustomHTML();
	        		}
	        		
	        		$scope.contextualChartHTML = "<div>" + (customHTML || "") + "</div>";
	        		$scope.$apply();
	        	},
	        	error: function( status, errMessage ){
	        		console.log( "error: " + errMessage );
	        		$scope.contextualChartHTML = "<div class='alert alert-danger' role='alert'" + errMessage + "</div>";
	        		$scope.$apply();
	        	}
	    	};
	    	angular.extend( options, customOptions || {} );
	    	
	    	var istable = $scope.presentationStyle == "table";
	    	var viewName = (istable ? "all_events_table" : $scope.selectedVisualization.view );
	    	couchApp.db.view( design + "/" + viewName,options);
		}
	}
	
	$scope.retrieveApps = function(){
		couchApp.db.view( design + "/grouped_apps",{
			group:true,
			success:function(data){
				$scope.apps = data.rows;
				//Select the first app
				if ( data.rows.length > 0 ){
					$scope.selectApp( data.rows[0] );
				}
				$scope.$apply();
			},
			error: function( status, errMessage ){
				console.log("error: " + errMessage );
			}
		});
	}
	$scope.selectedClass = function( app ){
    	if ( app == $scope.selectedApp){
    		return "active";
    	}
    	return "";
    }
	$scope.selectApp = function(app){
		if ( $scope.selectedApp != app ){
			$scope.selectedApp = app;
			$scope.selectVisualization();
		}
	}
	
	$scope.togglePresentation = function( style ){
		if ( $scope.presentationStyle != style ){
			$scope.presentationStyle = style;
			$scope.selectVisualization();
		}
	}
  }]
)

.directive('customhtml', function($compile, $parse) {
	return {
		restrict: 'E',
		link: function(scope, element, attr) {
			scope.$watch(attr.bindmodel, function() {
				element.html(
					$parse(
						attr.bindmodel
					)(scope)
				);
				$compile(element.contents())(scope);
			}, true);
		}
	}
  })