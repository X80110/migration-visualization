// TODO JAN 12 2022
// !!  - gender data
//      - label orientation
//           - country
//           - south pole
//      - unify filtering
//      - tooltips
//      - flow map
//      - tweens and transitions


// MAIN SETTINGS AND HELPERS
// Canvas
var width = 550;
var height = width;
const textId = "O-text-1"; 

// Define
var innerRadius = Math.min(width, height) *0.5-25;
var outerRadius = innerRadius + 10;
const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);



// Standard chord settings    
var chord = d3.chordDirected()
    .padAngle(1 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);
var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
var ribbon = d3.ribbonArrow()
    .radius(innerRadius - 6)
    .padAngle(1 / innerRadius);
var formatValue = x => `${x.toFixed(0)}`;

// Set a matrix of the data data to pass to the chord() function
function getMatrix(names,data) {
    const index = new Map(names.map((name, i) => [name, i]));
    const matrix = Array.from(index, () => new Array(names.length).fill(0));

    for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
        return matrix;
}

//--------------------------------//
//       GET & PREPARE DATA       //
//--------------------------------//
////// DIAGRAM DATA STUCUTRE
// optimal data structure = { matrix: [ {
    //                           year0: {
    //                              dimension1: [values],
    //                              dimension2: [values]
    //                              ... },                                  --- source-target value for their relative index as specified in 'names'
    //                           year1: {
    //                              dimension1: [values],
    //                              dimension2: [values]
    //                              ... },  
//                               } ]                                        --- should we switch year-type to minimize headers for data groups? Years add up more easily than methods 
//                            names : [names],                              
//                            regions: [regions],                           --- regions index is positioned on head of their subcountries  
//                            dimensions: [dimension1,dimension2...]
//                            type: [dataset] }                             --- type are indexs in matix.value

const getData = async () => {
    try {
        const raw_data = await d3.csv("gf_od.csv");
        const metadata = await d3.csv("data/country-metadata-flags.csv");
        // output example json data structure in console
        //   const ref = await d3.json("json/migrations.json");
        //   console.log("JSON",ref)
        
        let labels = metadata.map(d=>{ 
          let flag = d.origin_flag
          let country = d.origin_name
          let region =  d.originregion_name
          return {
              [d.origin_iso]:  d.origin_iso,
              iso :  d.origin_iso,
              country: flag + " " + country ,
              region: region
          }
        })
        // console.log(raw_data)    
        // console.log(labels)    
        let result = raw_data.map(d=>{
            //        Replace SUDAN ISO CODE "SUD" -> "SDN"
            //                CHILE ISO CODE "CHI" -> "CHL"
            //                SERBIA AND MONTENEGRO ISO CODE "" -> "SCG"
            //                FINALLY SOLVED DIRECTLY IN CSV
            //        
            //        let origin = d.orig.replace("SUD","SDN")
            //        let destination = d.dest.replace("SUD","SDN")
            //
            //        Equivalent Vlookup or leftjoin labels <-> iso
            let origin = new Object(labels.filter(a=>a[d.orig])[0])
            let destination = new Object(labels.filter(a=>a[d.dest])[0])
            return{
                source :[ origin.iso, origin.country , origin.region],
                target : [ destination.iso, destination.country , destination.region],
                year : d.year0,
                values : ({
                    mig_rate: +d.mig_rate,
                    da_min_closed: +d.da_min_closed,
                    da_min_open: +d.da_min_open,
                    da_pb_closed: +d.da_pb_closed,
                    sd_rev_neg: +d.sd_rev_neg,
                    sd_drop_neg: +d.sd_drop_neg
                    })
            }
        }) 
        data = {raw_data:result/* ,labels */}
        return  data
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
}
  

getData().then((data)=>{ 
    const allYears = [...new Set(data.raw_data.map((d) => d.year))].reverse();
    const allVars = ['mig_rate', 'da_min_closed', 'da_min_open','da_pb_closed', 'sd_rev_neg', 'sd_drop_neg']
    
    let selectedYear = allYears[0] 
    let selectedRegion = []
    let selectedValues = 'mig_rate'
    var raw_data = data.raw_data.flat()
    
    // CREATE SELECTORS
    d3.select("#selectYear")
        .selectAll('myOptions')
        .data(allYears)
        .enter()
        .append('option')
        .text(d=>{ return d; })    // text showed in the menu dropdown
        .attr("value",d=> { return d; }) 
    
    d3.select("#selectValues")
        .selectAll('myOptions')
        .data(allVars)
        .enter()
        .append('option')
        .text(d=>{ return d; })    // text showed in the menu dropdown
        .attr("value",d=> { return d; }) 
   
    
    // DRAW CHART
    draw(selectedYear,selectedRegion,selectedValues)    
    
    // PREPARE DATA GIVEN SELECTED VALUES
    function prepareData(year,region,values) {
        // filter selected yeaar and values by regions (or country if a region is clicked)
        let selectedData = aq.from(raw_data)
            .orderby(d=>d.source[2] )
            .objects()
            .filter(d=> d.year === year)
            .map(d=> { 
            // d.source ---> [0] isocodes // [1] countrylabels // [2] region 
            return{
                // (if) d.source = selected region (then) d.source = country (else)  d.source = region
                source: d.source[2] === region ? d.source[1] : d.source[2],
                // same as before
                target: d.target[2] === region ? d.target[1] : d.target[2],
                value: +d.values[values],
                year: d.year,
        }})
        selectedData = selectedData.filter(d=> d.target !=='none' && d.source !== 'none' && d.value > 100)
        
        let groupedValues = aq.from(selectedData)
            .select('value','year','source','target')
            .groupby('source','target','year')
            .rollup( {value: d => op.sum(d.value)})       
            .objects()

        // create graph structure for sankey
        let graph = () => {
            let keys = ["source", "target"]
            let index = -1;
            const nodes = [];
            const nodeByKey = new Map;
            const indexByKey = new Map;
            const links = [];
          
            for (const k of keys) {
              for (const d of groupedValues) {
                const key = JSON.stringify([k, d[k]]);
                if (nodeByKey.has(key)) continue;
                const node = {name: d[k]};
                nodes.push(node);
                nodeByKey.set(key, node);
                indexByKey.set(key, ++index);
              }
            }
          
            for (let i = 1; i < keys.length; ++i) {
              const a = keys[i - 1];
              const b = keys[i];
              const prefix = keys.slice(0, i + 1);
              const linkByKey = new Map;
              for (const d of groupedValues) {
                const names = prefix.map(k => d[k]);
                const key = JSON.stringify(names);
                const value = d.value || 1;
                let link = linkByKey.get(key);
                if (link) { link.value += value; continue; }
                link = {
                  source: indexByKey.get(JSON.stringify([a, d[a]])),
                  target: indexByKey.get(JSON.stringify([b, d[b]])),
                  names,
                  value
                };
                links.push(link);
                linkByKey.set(key, link);
              }
            }
          
            return {nodes, links};
          }

        let sankeyData = graph(groupedValues)
        
        return {chord: groupedValues, sankey: sankeyData}
    }

    
    

    //// CHART RENDERING
    function draw(year,region,values){
        
        let groupedValues = prepareData(year,region,values).chord
        // console.lo#00bcffg(groupedValues)
        // console.log(prepareData(year,region,values).sankey)
        // prepare data for matrix
        let columns =  {0: "source",1:"target",2:"value"}
        groupedValues['columns'] = columns
        names = Array.from(new Set(groupedValues.flatMap(d => [d.source, d.target])));
        // console.log("NAMES!",names)
        const data = getMatrix(names,groupedValues.filter(d=> d.year === year))    
        // console.log(data)

        // output final data to html table so we can debug values easily 
        let table = aq.from(groupedValues).toHTML()

        // Visualization settings
        const colorScale = chroma.scale(['#e85151', '#51aae8', '#F0E754', '#55e851'])
              .mode('hsl').colors(10)
              .map(color => chroma(color).saturate(0.1));
  
        const color = d3.scaleOrdinal(names, colorScale)
        // var color = d3.scaleOrdinal(
        //     names,
        //     ["#1f77b4", "#d62728", "#ff7f0e", "#2ca02c",  "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]);

        chordDiagram.append("path")
            .attr("id", textId)
            .attr("fill", "none")
            .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle:   2 * Math.PI  }));

        // Add ribbons for each chord and its tooltip content <g> <path> <title>
        chords = chordDiagram.append("g")
            .attr("fill-opacity", 0.75)
            .selectAll("g")
            .data(chord(data))
            .join("path")
            .attr("class", "path-item")
            .attr("d", ribbon)
            .attr("fill", d => color(names[d.source.index]))
            .style("mix-blend-mode", "multiply")
            .append("title")
            .text(d => `${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`);
        
        // Add outter arcs for each region and its titles
        arcs = chordDiagram.append("g")
            .attr("font-family", "Proxima+Nova")
            .attr("font-size", 10)
            .selectAll("g")
            .data(chord(data).groups)
            .join("g")
            .attr("class","chord")
            .call(g => g.append("path")
            .attr("d", arc)
            .attr("fill", d => color(names[d.index]))
            // On each <g> we set a <path> for the arc
            .attr("stroke", "#fff")
            .attr("stroke-width", 3))
            // On each <g> we set a <text> for the titles around the previous arc <path> linking to it with id º
            .call(g => g.append("text")
                .attr("dy", -3)
                // .attr("dx", 17)
                .append("textPath")
                // .attr("startOffset", d => d.startAngle/2 * outerRadius 
                .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
                .style("text-anchor","middle")
                .attr("xlink:href", "#"+textId) 
                .text(d => names[d.index]))
            // On each <g> we set a <title> for the region outflow
            .call(g => g.append("title")
                .text(d => {
                    return `${names[d.index]} outflow ${formatValue(d3.sum(data[d.index]))} people and inflow ${formatValue(d3.sum(data, row => row[d.index]))} people`
            }))

        d3.select("#table").append("table").html(table)
        
        // INTERACTIONS
        chordDiagram.selectAll(".path-item, .chord")
            .on("mouseover", function (evt, d) {
                chordDiagram.selectAll(".path-item, .chord")
                    .transition()
                    .style("opacity", 0.2);

                d3.select(this)
                    .transition()
                    .style("opacity", 1)
                })       

            .on("mouseout", function (evt, d) {
                chordDiagram.selectAll(".path-item, .chord")
                    .transition()
                    .style("opacity", 1);
                })  

        chordDiagram.selectAll(".chord")            
            .on("click", function (evt, d) {
                region = names[d.index]
                
                // print selected criteria on console
                console.log(region,year,values)
                
                // remove current content
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity',0)
                    .remove()
                
                d3.selectAll("table").remove()
                // d3.selectAll("#sankey").remove()
                
                // draw new chart 
                draw(year,region,values)
                // drawSankey(year,region,values)
            });   

        d3.selectAll("#selectYear")
            .on("change", function(d) {
                // Get selected year
                year = d3.select(this).property("value")
                // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
                // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity', 0)
                    .remove();
                
                d3.selectAll("table").remove()

                draw(year,region,values)
            })        
        d3.selectAll("#selectValues")
            .on("change", function(d) {
                // Get selected value
                values = d3.select(this).property("value")
                // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
                // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity', 0)
                    .remove();
                
                d3.selectAll("table").remove()

                draw(year,region,values)
            })
        // print last active filters
        let activeRegion = selectedRegion === region ? '<span style="color: grey">Non selected</span>' : region
        d3.selectAll("#activeData")
            .html("<br><strong>Last region selected:</strong>  "+activeRegion+"<br>"+
                   "<strong>Year:</strong> "+year+"<br>"+
                   "<strong>Value:</strong> "+values)
    }
    //// SANKEY CHART 
    function drawSankey(year,region,values){
        let graph = prepareData(year,region,values).sankey
        let names = Array.from(new Set(prepareData(year,region,values).chord.flatMap(d => [d.source, d.target])));
        
        const colorScale = chroma.scale(['#e85151', '#51aae8', '#F0E754', '#55e851'])
              .mode('hsl').colors(10)
              .map(color => chroma(color).saturate(0.01));
  
        const color = d3.scaleOrdinal(names, colorScale)
        // let color = d3.scaleOrdinal(
        //     names,
        //     ["#1f77b4", "#d62728", "#ff7f0e", "#2ca02c",  "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]);
        let sankey = d3.sankey()
            .nodeSort(null)
            .linkSort(null)
            .nodeWidth(4)
            .nodePadding(20)
            .extent([[0, 5], [width, height - 5]])
        const svg = d3.select("#sankey")
            .append("svg")
            .attr("viewBox", [0, 0, width, height]);

        const {nodes, links} = sankey({
            nodes: graph.nodes.map(d => Object.assign({}, d)),
            links: graph.links.map(d => Object.assign({}, d))
        });

        svg.append("g")
            .selectAll("rect")
            .data(nodes)
            .join("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.name))
            .append("title")
            .text(d => `${d.name}\n${d.value.toLocaleString()}`);

        svg.append("g")
            .attr("fill", "none")
            .selectAll("g")
            .data(links)
            .join("path")
            .attr("class","chord")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => color(d.names[0]))
            .attr("stroke-width", d => d.width)
            .attr("stroke-opacity", 0.7)
            .style("mix-blend-mode", "multiply")
            .append("title")
            .text(d => `${d.names.join(" → ")}\n${d.value.toLocaleString()}`);

        svg.append("g")
            .style("font", "18px")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => d.name)
            .append("tspan")
            .attr("fill-opacity", 0.7)
            .text(d => ` ${d.value.toLocaleString()}`);

        svg.selectAll(".path-item, .chord")
            .on("mouseover", function (evt, d) {
                svg.selectAll(".path-item, .chord")
                    .transition()
                    .style("opacity", 0.2);

                d3.select(this)
                    .transition()
                    .style("opacity", 1)
                })       

            .on("mouseout", function (evt, d) {
                svg.selectAll(".path-item, .chord")
                    .transition()
                    .style("opacity", 1);
                })  
        return svg.node();
        
            
    }
    drawSankey(selectedYear,selectedRegion,selectedValues)
});
    // })
    
    /* .tween('circumference', function(d) {
        let currentAngle = getCurrentAngle(this);
        let targetAngle = d;

        // Ensure shortest path is taken
        if (targetAngle - currentAngle > Math.PI) {
            targetAngle -= 2 * Math.PI;
        }
        else if (targetAngle - currentAngle < -Math.PI) {
            targetAngle += 2 * Math.PI;
        }

        let i = d3.interpolate(currentAngle, targetAngle);

        return function(t) {
            let angle = i(t);

            d3.select(this)
                .attr('cx', majorRadius * Math.cos(angle))
                .attr('cy', majorRadius * Math.sin(angle));
        }
    }); */
// function getCurrentAngle(el) {
// 	let x = d3.select(el).attr('cx');
// 	let y = d3.select(el).attr('cy');
// 	return Math.atan2(y, x);
// }

// UX & animation
// - Tween arcs && ribbons
// - Click -> Countries + regions matrix
// - Arc (text names) -> from 0.5 to 1.5 rads text for names: reverse vertically
// - Global styles and selectors

// Data 
// - Data_input -> json structure (ask Guy)
// - Filters: 
//      (X) Year
//      Type
//      Gender



