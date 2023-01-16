/* // Set up the map projection
var projection = d3.geoMercator()
  .scale(100)
  .translate([400, 250]);

// Create the path generator
var path = d3.geoPath()
  .projection(projection);

// Bind the data to the path element


  // Select the map container and bind the data
d3.select("#map")
    .selectAll("path")
    
    .data(data.features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("fill", "lightgray")
    .style("stroke", "white");

  
    // Select the map container and bind the data
map = d3.select("#map")
      .selectAll("line")
      .data(data)
      .enter()
      .append("line")
      .attr("x1", function(d) { return projection(d.source)[0]; })
      .attr("y1", function(d) { return projection(d.source)[1]; })
      .attr("x2", function(d) { return projection(d.target)[0]; })
      .attr("y2", function(d) { return projection(d.target)[1]; })
      .style("stroke", "black")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

 */