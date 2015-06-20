'use strict';

//Visualization App
var mainApp = angular.module('visualizationApp', [
  'ui.bootstrap'
],function($locationProvider) {
    $locationProvider.html5Mode({'enabled': true, 'requireBase': false});
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
	
	//Contains all the supported visualization
	$scope.visualizations=[
	    {name:"By Events - total", view: "grouped_events", builder: getTotalEventsChartBuilder() },
	    {name:"By Search Category", view: "search_by_categories", builder: getTotalEventsChartBuilder(), width: 1100, height: 700 },
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
	    	builder.init( "#chart", $scope.selectedVisualization );
	    	var istable = $scope.presentationStyle == "table";
	    	var viewName = (istable ? "all_events_table" : $scope.selectedVisualization.view );
	    	couchApp.db.view( design + "/" + viewName,{
	      		group:!istable,
	      		include_docs: istable,
	      		startkey:getLookupKey( startDateFilter, 0 ),
	      		endkey: getLookupKey( endDateFilter, {} ),
	        	success: function( data ){
	        		if ( !istable ){
	        			d3.select("#chart").style("display","");
	        			builder.renderChart( data.rows );
	        		}else{
	        			d3.select("#chartContainer").style("display", "");
	        			builder.renderTable( data.rows );
	        		}
	        	},
	        	error: function( status, errMessage ){
	        		console.log( "error: " + errMessage );
	        	}
	    	 });
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