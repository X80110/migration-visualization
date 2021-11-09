// IMOPORTED FROM APP.JS
    // // arc path generator
    // var textPathArc = d3.svg.arc()
    //     .innerRadius(config.outerRadius + 10)
    //     .outerRadius(config.outerRadius + 10);
    // var textPathArc2 = d3.svg.arc()
    //     .innerRadius(config.outerRadius + 18)
    //     .outerRadius(config.outerRadius + 18);



// Main settings
var width = 600;
var height = width;

var innerRadius = Math.min(width, height) *0.5-30;
var outerRadius = innerRadius + 17;
const textId = "O-text-1";

// Define
const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

// Standard chord settings    
var chord = d3.chordDirected()
    .padAngle(12 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);
var arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
var ribbon = d3.ribbonArrow()
    .radius(innerRadius - 0.5)
    .padAngle(1 / innerRadius);
var formatValue = x => `${x.toFixed(0)}`;

// Set a matrix of the data data to pass to the chord() function
function getMatrix(names,data) {
    const index = new Map(names.map((name, i) => [name, i]));
    const matrix = Array.from(index, () => new Array(names.length).fill(0));

    for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
        return matrix;
}

//-----------------//
// GET SOURCE DATA //
//-----------------//
d3.csv("gf_od.csv").then( (data) => {
   raw_data = data.map(d=>{return{
      source : d.orig,
      target : d.dest,
      year : d.year0,
      value : +d.mig_rate,
      //   value : {mig_rate : +d.mig_rate, da_pb_closed: +d.da_pb_closed},
    };})
    // Filter here to be removed. If data reach svg rendering
    // without filtering it collapses browser's memory
    .filter(d=> d.value >1  /* && d.year === "2010" */ && d.source.includes("A") )//|| d.source.includes("S") )//||"1990")
    // console.log(raw_data)
    return raw_data
})
//--------------------------------//
// PIPE SOURCE DATA WITH METADATA //
//--------------------------------//
// TODO: create a function loaded with the iso - name - region arrays to convert on the fly
.then(raw=>{                                
    // the use of then serves the ongoing processes to the function vars 
    // required for sequenced steps
    let metadata = d3.csv("data/country-metadata.csv")
    metadata.then(meta =>{
        let countries = meta.map(d=>{ return {
            iso : d.origin_iso,
            region : d.originregion_name,
            country : d.origin_name
            }
        })
    // console.log(countries)
    // join contry names and regions to the iso codes, for both source and target
        let source = aq.from(raw)
            .select('source','value','year')
            .join_left(aq.from(countries),['source','iso'])
            // .select(aq.not('iso'))
        let target = aq.from(raw).
            select('target','value')
            .join_left(aq.from(countries),['target','iso','year'])
            // .select(aq.not('iso'))
        let merged = source.join_left(target,'value')
            .rename(({
                region_1: 'source_region',
                country_1: 'source', 
                region_2: 'target_region',
                country_2: 'target' 
            }))
            // There appear some 'undefined' iso fields, currently exluded as they break the coode
            .filter(d => d.iso_1 != undefined  && d.iso_2 != undefined)

        // group by regions and sum values
        let grouped = merged
            .select('value','year','source_region','target_region')
            .groupby('source_region','target_region','year')
            .rollup( {value: d => op.sum(d.value)})
            .objects()
        
        let country_data = merged.objects().map(d=> {return{
            source: d.source,
            target: d.target,
            value: +d.value,
            year: d.year,
        

        }})


    return {country: country_data, region: grouped, raw: raw}
    })
    .then( (data)  => {
        //----------------------------------//
        // the filtering should happen here //
        //              ...                 //
        //----------------------------------//

        // List al years and pass them to the selector
        const allYears = [...new Set(data.raw.map((d) => d.year))];
        
        d3.select("#selectButton")
          .selectAll('myOptions')
            .data(allYears.reverse())
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu
            .attr("value",d=> { return d; }) // 

        

        // Preparing the convenient structure to plot chords
        let columns =  {0: "source",1:"target",2:"value"}
        let input_data = aq.from(data.region).rename({source_region: 'source',target_region: 'target'}).objects()
        input_data['columns'] = columns

        var names = Array.from(new Set(input_data.flatMap(d => [d.source, d.target])));

        
        var matrix = getMatrix(names,input_data);
        // console.log(matrix)
        const chords = chord(matrix);

        // starting visualization and its settings
        var color = d3.scaleOrdinal(
            names,
            ["#1f77b4", "#d62728", "#ff7f0e", "#2ca02c",  "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]);

        // Get matrix from most recent period
        // console.log( 
        // getMatrix(names,input_data.filter(d=> d.year === allYears[allYears.length - 1])))
        // let lastData = getMatrix(names,input_data.filter(d=> d.year === allYears[allYears.length - 1]))
        
        function filterData(year){
            const data = getMatrix(names,input_data.filter(d=> d.year === year))
            return data
        } 
        console.log(filterData("2000"))

        // Get matrix from most recent period
        // console.log(
            // getMatrix(names,input_data.filter(d=> d.year === allYears[0])))
        // var firstData = getMatrix(names,input_data.filter(d=> d.year === allYears[0]))
        
        function draw(year){
            svg.append("path")
            .attr("id", textId)
            .attr("fill", "none")
            .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle: 2 * Math.PI }));
        
            // Add ribbons for each chord and its tooltip content <g> <path> <title>
            svg.append("g")
                .attr("fill-opacity", 0.75)
                .selectAll("g")
                .data(chord(filterData(year)))
                .join("path")
                .attr("class", "path-item")
                .attr("d", ribbon)
                .attr("fill", d => color(names[d.source.index]))
                .style("mix-blend-mode", "multiply")
                .append("title")
                .text(d => `${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`);
            
            // Add outter arcs for each region and its titles
            svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .selectAll("g")
                .data(chord(filterData(year)).groups)
                .join("g")
                // On each <g> we set a <path> for the arc
                .call(g => g.append("path")
                    .attr("d", arc)
                    .attr("fill", d => color(names[d.index]))
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 3))
                // On each <g> we set a <text> for the titles around the previous arc <path> linking to it with id 
                .call(g => g.append("text")
                    .attr("dy", -3)
                    .append("textPath")
                    .attr("xlink:href", "#"+textId)
                    .attr("startOffset", d => d.startAngle * outerRadius)   /*  this helps   */
                    .text(d => names[d.index]))
                // On each <g> we set a <title> for the region outflow
                .call(g => g.append("title")
                    .text(d => {
                        return `${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
                    }));

            svg.selectAll(".path-item")
                .on("mouseover", function (evt, d) {
                    svg.selectAll(".path-item")
                        .style("opacity", 0.2);

                    d3.select(this)
                        .style("opacity", 1)
                })
                .on("mouseout", function (evt, d) {
                    svg.selectAll(".path-item")
                        .style("opacity", 1);
                });
         
            
        }
        // Create a non-visible arc where we'll tie after the region names
        
        draw(allYears[0])
        d3.select("#selectButton").on("change", function(d) {
                d3.selectAll("g")
                    .remove()
                    .transition()
                    .duration(1000)
                // recover the option that has been chosen
                var selectedOption = d3.select(this).property("value")
                // var selectedData = getMatrix(names,input_data.filter(d=> d.year === selectedOption))
                draw(selectedOption)
                // run the updateChart function with this selected option
                // function update(selected){
                //     d3.selectAll("g")
                //         .data(selectedData)
                //         .join()

                // }
            })      
    });
})
