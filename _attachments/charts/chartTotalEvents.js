function getTotalEventsChartBuilder(){
	return {
		//Returns custom view options
		init: function( params ){
			var nodeSelector = params.selector;
			var visualization = params.visualization;
			var presentationStyle = params.presentationStyle;
			
			this.colorMap = {};
			
			//Remember which series the user wants to enable/disable
			this.$scope.userSeriesSelections = this.$scope.userSeriesSelections || {};
			this.$scope.toggleSerieSelection = function(serie){
				this.$scope.userSeriesSelections[serie].selected = !this.$scope.userSeriesSelections[serie].selected;
				this.$scope.selectVisualization();
			}.bind(this);
			
			var margin = this.margin = {top: 20, right: 30, bottom: 130, left: 40};
			var w = 700;
			var h = 500;
			if ( params.presentationStyle == "chart"){
				w = 1100;
				ht = 500;
			}else if ( params.presentationStyle == "pie"){
				margin = this.margin = {top: 20, right: 30, bottom: 100, left: 100};
			}
			var width = this.width = w - margin.left - margin.right;
			var height = this.height = h - margin.top - margin.bottom;

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
		
		randomColor : function(){
			var golden_ratio_conjugate = 0.618033988749895;
			var h = Math.random();

			var hslToRgb = function (h, s, l){
				var r, g, b;
				if(s == 0){
					r = g = b = l; // achromatic
				}else{
					function hue2rgb(p, q, t){
						if(t < 0) t += 1;
						if(t > 1) t -= 1;
						if(t < 1/6) return p + (q - p) * 6 * t;
						if(t < 1/2) return q;
						if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
						return p;
					}

					var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
					var p = 2 * l - q;
					r = hue2rgb(p, q, h + 1/3);
					g = hue2rgb(p, q, h);
					b = hue2rgb(p, q, h - 1/3);
				}
				return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
			};


			h += golden_ratio_conjugate;
			h %= 1;
			var ret = hslToRgb(h, 0.5, 0.60);
			if ( this.colorMap.hasOwnProperty(ret) ){
				return randomColor();
			}
			return ret;
		},
		
		generateCustomHTML : function(){
			var customHTML = "<div class='control-group'>" +
				"<div class='controls span2'>";
	
			for ( var key in this.uniqValues ){
				customHTML += "<label class='checkbox'>" +
						"<input type='checkbox' value='option1' " + (this.$scope.userSeriesSelections[key].selected ? "checked" : "" )+ " ng-click='toggleSerieSelection(\"" + key + "\")'>" +
						key + "</label>";
			}
		
			customHTML += "</div></div>";
			return customHTML;
		},
		
		applyUserSelections: function( data ){
			var uniqValues = this.uniqValues = {};
			return data.filter( function(d){
				var v = d.key[4];
				uniqValues[v] = true;
				if ( this.$scope.userSeriesSelections.hasOwnProperty(v) ){
					return this.$scope.userSeriesSelections[v].selected;
				}else{
					this.$scope.userSeriesSelections[v] = {selected:true};
				}
				return true;
			}.bind(this));
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
			var $scope = this.$scope;

			//Prep the data
			var nested = d3.nest().key(
					function(d){
						return d.key[4];
					}
				).entries(data);
			
			nested.forEach( function(d){
				d.value = 0;
				d.values.forEach( function(f){ 
					d.value += f.value;
				});
				delete d.values;	//don't need it anymore
			});
			
			data = nested;
			
			var domainValues = data.map(
					function(d) {
						return d.key; 
					}
				);
			x.domain( domainValues );
			y.domain([0, d3.max(data, function(d) { 
							return d.value; 
						 })
				     ]
			);

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
				.attr("x", function(d) { return x(d.key); })
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
		},
		renderPie: function(data){
			
			//Prep the data
			var totalValue = 0;
			var nested = d3.nest().key(
					function(d){
						totalValue += d.value;
						return d.key[4];
					}
				).entries(data);
			
			nested.forEach( function(d){
				if ( !this.$scope.userSeriesSelections[ d.key ] ){
					this.$scope.userSeriesSelections[ d.key ] = {selected: true};
				}
				if ( !this.$scope.userSeriesSelections[ d.key ].color){
					this.$scope.userSeriesSelections[ d.key ].color = this.randomColor();
				}
				d.color = this.$scope.userSeriesSelections[ d.key ].color;
				d.value = 0;
				d.values.forEach( function(f){ 
					d.value += f.value;
				});
				d.key += " (" + (d.value/totalValue * 100).toFixed(0) + "%)";
				delete d.values;	//don't need it anymore
			}.bind(this));
			
			data = nested;
			
			!function(){
				var gradPie={};
				
				var pie = d3.layout.pie().sort(null)
					.value(
						function(d) {
							return d.value;
						}
					);
						
				createGradients = function(defs, colors, r){	
					var gradient = defs.selectAll('.gradient')
						.data(colors).enter().append("radialGradient")
						.attr("id", function(d,i){return "gradient" + i;})
						.attr("gradientUnits", "userSpaceOnUse")
						.attr("cx", "0").attr("cy", "0").attr("r", r).attr("spreadMethod", "pad");
						
					gradient.append("stop").attr("offset", "0%").attr("stop-color", function(d){ return d;});

					gradient.append("stop").attr("offset", "30%")
						.attr("stop-color",function(d){ return d;})
						.attr("stop-opacity", 1);
						
					gradient.append("stop").attr("offset", "70%")
						.attr("stop-color",function(d){ return "black";})
						.attr("stop-opacity", 1);
				}
				
				gradPie.draw = function(id, data, cx, cy, r){
					var arc = d3.svg.arc().innerRadius(r * .6).outerRadius(r);
					var labelr = r; // radius for label anchor
					var gPie = d3.select("#"+id).append("g")
						.attr("transform", "translate(" + cx + "," + cy + ")")
						
					createGradients(
						gPie.append("defs"), 
						data.map(
							function(d){ 
								return d.color; 
							}
						), 
						2.5*r
					);

					gPie.selectAll("path")
						.data(pie(data))
						.enter().append("path")
						.attr("fill", function(d,i){ 
								return "url(#gradient"+ i+")";
						})
						.attr("d", d3.svg.arc().outerRadius(r))
						.each(
							function(d) { 
								this._current = d; 
							}
						);
					
					gPie.selectAll(".percent")
						.data( pie(data) )
						.enter().append("text")
						.attr("class", "percent")
						.attr("dy", ".35em")
					    .attr("text-anchor", function(d) {
					        return (d.endAngle + d.startAngle)/2 > Math.PI ? "end" : "start";
					    })
						.text( function(d){
							return d.data.key;
						})
						.attr("transform", function(d){
							var c = arc.centroid(d),
				            x = c[0],
				            y = c[1],
				            h = Math.sqrt(x*x + y*y);
					        return "translate(" + (x/h * (r + 10)) +  ',' + (y/h * (r+10)) +  ")"; 
						})
						.each(
							function(d){
								this._current=d;
							}
						);		
				}
				
				this.gradPie = gradPie;
			}();

			var chart = this.chart;
			chart.append("g").attr("id","pie");

			gradPie.draw("pie", data, 200, 200, 180);
		}
	};
}