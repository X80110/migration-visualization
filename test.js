// Set up SVG
var svg = d3.select('svg');
var width = +svg.attr('width');
var height = +svg.attr('height');
var margin = { top: 10, left: 50, bottom: 10, right: 50 };

var i = -1;
var layout = d3.sankey()
               .linkValue(function (d) { return d.values[i]; })
               .extent([
                 [margin.left, margin.top],
                 [width - margin.left - margin.right, height - margin.top - margin.bottom]]);

// Render
var color = d3.scaleOrdinal(d3.schemeCategory10);
var diagram = d3.sankeyDiagram()
                .linkMinWidth(function(d) { return 0.1; })
                .linkColor(function(d) { return color(d.type); });

update();
d3.interval(update, 1500);

function update() {
  if (++i > 4) i = 0;
  layout(graph);

  svg
    .datum(graph)
    .transition().duration(1000).ease(d3.easeCubic)
    .call(diagram);
}