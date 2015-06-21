function getTotalEventsChartBuilder(){
	return {
		//Returns custom view options
		init: function( params ){
			var nodeSelector = params.selector;
			var visualization = params.visualization;
			var presentationStyle = params.presentationStyle;
			
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
			
			if ( presentationStyle == "table" ){
				return {include_docs:true};
			}else{
				return {group:true};
			}
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
			chartContainer.append("div").attr("class", "label label-info").text( data.length + " records");
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
		},
		
		renderLine: function (data ){
			if ( data.length == 0 ){
				return;
			}
			
			var x = this.x;
			var y = this.y;
			var xAxis = this.xAxis;
			var yAxis = this.yAxis;
			
			var chart = this.chart;
			var height = this.height;
			var width = this.width;
			
			var color = d3.scale.category20();	//20 categorical colors
			
			//Prep the data for multi-series line charts
			data.forEach(function(d) {
			    d.date = d.key[1] + "-" + d.key[2] + "-" + d.key[3];
			});
			
			var nested = d3.nest().key(
				function(d){
					return d.date;
				}
			).entries(data);
			
			nested.forEach( function(d){
				d.values.forEach( function(f){ 
					d[f.key[4]]=f.value;	//f.key[4] is the event type
				});
				d.date = d.key;		//nested object use field key, reset to date
				delete d.key;
				delete d.values;	//don't need it anymore
			});
			
			data = nested;
			
			//Set the domain
			color.domain(
				d3.keys( data[0] ).filter(function(key) { 
					return key !== "date"; 
				})
			);
			
			var series = color.domain().map(function(name) {
				return {
					name: name,
					values: data.map(function(d) {
						return {date: d.date, count: +d[name]};
					})
				};
			});
			
			var domainData = [];
			data.forEach( function(d){
				domainData.push( d.date );
			});
			x.domain( domainData );
			
			//Prepare the line
			var line = d3.svg.line()
				.interpolate("basis")
				.x(function(d) { 
					return x(d.date); 
				})
				.y(function(d) { 
					return y(d.count); 
				});
			
			y.domain([
		          d3.min(series, function(c) { return d3.min(c.values, function(v) { return v.count; }); }),
		          d3.max(series, function(c) { return d3.max(c.values, function(v) { return v.count; }); })
	        ]);

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
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Events Count");

			var serie = chart.selectAll(".serie")
				.data(series)
				.enter().append("g")
				.attr("class", "serie");

			serie.append("path")
				.attr("class", "line")
				.attr("d", function(d) { 
					return line(d.values); 
				})
				.style("stroke", function(d) { 
					return color(d.name); 
				});

			serie.append("text")
				.datum(function(d) { 
					return {name: d.name, value: d.values[d.values.length - 1]}; }
				)
				.attr("transform", function(d) { 
					return "translate(" + x(d.value.date) + "," + y(d.value.count) + ")"; 
				})
				.attr("x", 3)
				.attr("dy", ".35em")
				.text(function(d) { 
					return d.name; 
				});
		}
	};
}