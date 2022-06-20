

function SplineGraph(splineGraphName){ //, mainData

	var data = [{
	    "scans": 0,
	    year: 6
	}, {
	    "scans": 100,
	    year: 9
	}, {
	    "scans": 500,
	    year: 9.5
	}, {
	    "scans": 500,
	    year: 16.5
	}, {
	    "scans": 100,
	    year: 17
	},{
	    "scans": 0,
	    year: 21
	}];
	
	
	/*var mainData2 = [{
	    "scans": "200",
	    "year": 6
	}, {
	    "scans": "1890",
	    "year": 7
	}, {
	    "scans": "1790",
	    "year": 10
	}, {
	    "scans": "2390",
	    "year": 13
	}, {
	    "scans": "2134",
	    "year": 16
	}, {
	    "scans": "1476",
	    "year": 20
	}];*/
	
	//jQuery('.splineChartColor path').remove();
	
	var maxHeight = 1000;

	var vis = d3.select("#" + splineGraphName),
	    WIDTH = 400,
	    HEIGHT = 200,
	    MARGINS = {
	        top: 20,
	        right: 20,
	        bottom: 25,
	        left: 40
	    },
	    xScale = d3.scale.linear().range(
	        [MARGINS.left, WIDTH - MARGINS.right]).domain([6,21]),
	    yScale = d3.scale.linear().range(
	        [HEIGHT - MARGINS.top, MARGINS.bottom]).domain([-20,maxHeight]), //max = 3600
	    xAxis = d3.svg.axis()
	        .scale(xScale),
	  
	    yAxis = d3.svg.axis()
	    	.ticks(5)
	        .scale(yScale)
	        .orient("left");
	
	// console.log("VIS:");        
	// console.log(vis);
	//vis.append("svg:g")
	//    .call(xAxis);
	
	// add xy-axis to the svg
	//console.log("Grab Area");

	//vis.select("svg").empty();
	//vis.remove();
	
	vis.append("svg:g")
	    .attr("class","axis")
	    .attr("class", "splineChartColor")
	    .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
	    .attr("grid", true)
	    .call(xAxis);
	 
	vis.append("svg:g")
	    .attr("class","axis")
	    .attr("class", "splineChartColor")
	    .attr("transform", "translate(" + (MARGINS.left) + ",0)")
	    .call(yAxis);
	
	// draw the data
	var lineGen = d3.svg.line().x(function(d) {
	    return xScale(d.year);
	  })
	  .y(function(d) {
	    return yScale(d.scans);
	  })
	  .interpolate("basis");
	
	//vis.remove();
	
	// add data
	var dataOne = vis.append('svg:path') //Yellow
	  .attr('d', lineGen(data))
	  .attr('stroke', '#F0AB00')
	  .attr('stroke-width', 3)
	  .attr('fill', 'none');
	
	// add data 2
	var dataTwo = vis.append('svg:path')
	  //.attr('d', lineGen(data)) //mainData
	  .attr('stroke', '#008FD3')
	  .attr('stroke-width', 3)
	  .attr('fill', 'none');


	this.generateSplineGraph = function(main, id) {
		//console.log(main);
		splineGraphName = id;
		
		if(main[main.length-1].scans >10){
			maxHeight = 800;
		}
	
		dataOne.attr('d', lineGen(data));
		dataTwo.attr('d', lineGen(main));
	};
	

}





