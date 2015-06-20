function getTotalEventsChartBuilder(){
	return {
		init: function( nodeSelector, visualization ){
			var margin = this.margin = {top: 20, right: 30, bottom: 130, left: 40};
			var width = this.width = (visualization.width || 500) - margin.left - margin.right;
			var height = this.height = (visualization.height || 500) - margin.top - margin.bottom;

			var x = this.x = d3.scale.ordinal().rangeRoundBands([0, width], .1);

			var y = this.y = d3.scale.linear().range([height, 0]);

			var xAxis = this.xAxis = d3.svg.axis().scale(x).orient("bottom");

			var yAxis = this.yAxis = d3.svg.axis().scale(y).orient("left");

			var chartContainer = this.chartContainer = d3.select( "#chartContainer" );
			var chart = this.chart = d3.select(nodeSelector)
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		},
		
		renderChart: function( data ){
			var x = this.x;
			var y = this.y;
			var chart = this.chart;
			var margin = this.margin;
			var width = this.width;
			var height = this.height;
			var xAxis = this.xAxis;
			var yAxis = this.yAxis;
			x.domain( 
				data.map(
					function(d) {
						return d.key[4]; 
					}
				)
			);
			y.domain([0, d3.max(data, function(d) { return d.value; })]);

			chart.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.selectAll("text")  
				.style("text-anchor", "end")
				.attr("dx", "-.8em")
				.attr("dy", ".15em")
				.attr("transform", function(d) {
					return "rotate(-65)" 
                });

			chart.append("g")
				.attr("class", "y axis")
				.call(yAxis);

			chart.selectAll(".bar")
				.data(data)
				.enter().append("rect")
				.attr("class", "bar")
				.attr("x", function(d) { return x(d.key[4]); })
				.attr("y", function(d) { return y(d.value); })
				.attr("height", function(d) { return height - y(d.value); })
				.attr("width", x.rangeBand());
		},
		
		renderTable: function( data ){
			var colName = ["date", "type", "ip", "Platform", "Browser"];
			var chartContainer = this.chartContainer;
			var table = chartContainer.append("div")
				.attr("class", "container")
				.style("width", "100%")
				.append("table").attr("class", "table table-striped table-condensed table-bordered");
			table
				.append("thead").append("tr")
				.selectAll("th").data(colName).enter()
				.append("th").text( function(d) {return d;});
			
			var trEnter = table.append("tbody").selectAll("tr")
				.data(data).enter().append("tr");
			
			trEnter.append("td").text( function(d) {return d.doc.date} )
			trEnter.append("td").text( function(d) {return d.doc.type} )
			trEnter.append("td").text( function(d) {return d.doc.ip} )
			trEnter.append("td").text( function(d) {return d.doc.uap} )
			trEnter.append("td").text( function(d) {return d.doc.uab} )
		}
	};
}