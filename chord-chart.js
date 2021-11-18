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

//--------------------------------//
//       GET & PREPARE DATA       //
//--------------------------------//
////// DIAGRAM DATA STUCUTRE
// optimal data structure = { matrix: [ { year: [value] } ],       --- source-target value for their relative index as specified in 'names'
//                  should we switch year-type to minimize headers for data groups? Years add up more easily than methods 
//                            names : [names],                     --- each index de
//                            regions: [regions]                   --- regions index is positioned on head of their subcountries  
//                            type: [dataset] }                    --- type are indexs in matix.value
const getData = async () => {
    try {
      // this parse may fail
      const raw_data = await d3.csv("gf_od.csv");
      const metadata = await d3.csv("data/country-metadata.csv");
      data = {raw_data,metadata}
      return  data
    } catch (err) {
      console.log(err)
      throw Error("Failed to load data")
    }
  }
  
async function prepareData(data,metadata) {
    // format the data
    let labels = metadata.map(d=>{ 
        let countries = {[d.origin_iso] : d.origin_name}
        let regions = {[d.origin_iso] : d.originregion_name}
        
        return {
            countries, 
            regions,
        }
    })
   
    
    let raw_data = data.map(d=>{/* console.log(d) */
        
        return{
            source : d.orig,
            target : d.dest,
            year : d.year0,
            values : ({
                mig_rate: +d.mig_rate,
                da_min_closed: +d.da_min_closed,
                da_min_open: +d.da_min_open,
                da_pb_closed: +d.da_pb_closed,
                sd_rev_neg: +d.sd_rev_neg,
                sd_drop_neg: +d.sd_drop_neg
                })
            // value:  +d.mig_rate,
            // mig_rate: +d.mig_rate,
            // da_min_closed: +d.da_min_closed,
            // da_min_open: +d.da_min_open,
            // da_pb_closed: +d.da_pb_closed,
            // sd_rev_neg: +d.sd_rev_neg,
            // sd_drop_neg: +d.sd_drop_neg,
        };
    })
    function getLabels(data) { 
        // console.log(data)
        console.log(labels)
        // console.log(labels.filter(a=>a.countries["BEL"]).map(a=>Object.values(a.countries)).flat())
        data.label = data.map(d=>{
            let label = labels
                .filter(a=>a.countries[d])
                .map(a=>Object.values(a.countries))
                .flat()
            // console.log(d)
            // console.log(label)
             
            return{ label
        }})
        
        
        
        console.log(data.label,data)
    }
    getLabels(raw_data.map(d=>d.source))
    
    
    /* function lookupLabel(iso){
        console.log(countries.map(d=>d[iso]))
        result = labels.map(d=>{
            let label = d[iso]  
            console.log(d[iso])
            return {label}
        })
        console.log(result)
        // return result
    }

    lookupLabel(labels.map(d=>d.countries)) */
    /*
    let source = aq.from(raw_data)
        .select('source',selectedValue,'year')
        .join_left(aq.from(labels),['source','iso'])
        // .select(aq.not('iso'))
    let target = aq.from(raw_data)
        .select('target',selectedValue)
        .join_left(aq.from(labels),['target','iso','year'])
        // .select(aq.not('iso'))
     let merged = source.join_left(target,selectedValue)
        .rename(({
            region_1: 'source_region',
            country_1: 'source', 
            region_2: 'target_region',
            country_2: 'target',
            [selectedValue]: 'value'
        }))
        // There appear some 'undefined' iso fields, currently exluded as they break the coode
        .filter(d => d.iso_1 != undefined  && d.iso_2 != undefined)
        .orderby('source_region','target')
    // group by regions and sum values
    let grouped = merged
        .select('value','year','source_region','target_region')
        .groupby('source_region','target_region','year')
        .rollup( {value: d => op.sum(d.value)})
        .objects()
        // .print()
    let country_data = merged.objects().map(d=> {
        return {
            source: d.source,
            target: d.target,
            value: +d.value,
            year: d.year 
        }
    })
    let result =  {
        country: country_data, 
        region: grouped, 
        raw: raw_data, 
        merged: merged.objects()
    }
    return result
    */

    console.log(target.objects()) 
}
getData().then(data=> prepareData(data.raw_data,data.metadata))
  

let mainData = d3.csv("gf_od.csv").then( (data) => {

    raw_data = data.map(d=>{/* console.log(d) */
        return{
            source : d.orig,
            target : d.dest,
            year : d.year0,
            values : ({
                mig_rate: +d.mig_rate,
                da_min_closed: +d.da_min_closed,
                da_min_open: +d.da_min_open,
                da_pb_closed: +d.da_pb_closed,
                sd_rev_neg: +d.sd_rev_neg,
                sd_drop_neg: +d.sd_drop_neg,
                    
                }),
            value:  +d.mig_rate,
            mig_rate: +d.mig_rate,
            da_min_closed: +d.da_min_closed,
            da_min_open: +d.da_min_open,
            da_pb_closed: +d.da_pb_closed,
            sd_rev_neg: +d.sd_rev_neg,
            sd_drop_neg: +d.sd_drop_neg,
        };})
        // .filter(d=> d.value >1  /* && d.year === "2010" */ && d.source.includes("L") )//|| d.source.includes("S") )//||"1990")
        // Filter here to be removed. If data reach svg rendering
        // without filtering it collapses browser's memory

    // console.log(raw_data)
    return raw_data
    })

let metaData = d3.csv("data/country-metadata.csv").then(meta =>{
        let labels = meta.map(d=>{ return {
            iso : d.origin_iso,
            region : d.originregion_name,
            country : d.origin_name
            }
        })
    return labels
    })

/* function finale(){
    let finalData = metaData.then(labels => {
        selectedValue = 'values'
        result = mainData.then(raw_data => {
            // console.log(raw_data,labels)x
            // join contry names and regions to the iso codes, for both source and target
            let source = aq.from(raw_data)
                .select('source',selectedValue,'year')
                .join_left(aq.from(labels),['source','iso'])
                // .select(aq.not('iso'))
            let target = aq.from(raw_data)
                .select('target',selectedValue)
                .join_left(aq.from(labels),['target','iso','year'])
                // .select(aq.not('iso'))
            let merged = source.join_left(target,selectedValue)
                .rename(({
                    region_1: 'source_region',
                    country_1: 'source', 
                    region_2: 'target_region',
                    country_2: 'target',
                    [selectedValue]: 'value'
                }))
                // There appear some 'undefined' iso fields, currently exluded as they break the coode
                .filter(d => d.iso_1 != undefined  && d.iso_2 != undefined)
                .orderby('source_region','target')

            
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
            parsedData = {
                country: country_data, 
                region: grouped, 
                raw: raw_data, 
                merged: merged.objects()
            }
            return parsedData
        })
        
        return result
    })
    return finalData
} */


let finalData = metaData.then(labels => {
    selectedValue = 'values'
    result = mainData.then(raw_data => {
        // console.log(raw_data,labels)x
        raw_data = raw_data.filter(d=> d.value >1  /* && d.year === "2010" */ && d.source.includes("L") )//|| d.source.includes("S") )//||"1990")// join contry names and regions to the iso codes, for both source and target
        let source = aq.from(raw_data)
            .select('source',selectedValue,'year')
            .join_left(aq.from(labels),['source','iso'])
            // .select(aq.not('iso'))
        let target = aq.from(raw_data)
            .select('target',selectedValue)
            .join_left(aq.from(labels),['target','iso','year'])
            // .select(aq.not('iso'))
        let merged = source.join_left(target,selectedValue)
            .rename(({
                region_1: 'source_region',
                country_1: 'source', 
                region_2: 'target_region',
                country_2: 'target',
                [selectedValue]: 'value'
            }))
            // There appear some 'undefined' iso fields, currently exluded as they break the coode
            .filter(d => d.iso_1 != undefined  && d.iso_2 != undefined)
            .orderby('source_region','target')

        
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
        parsedData = {
            country: country_data, 
            region: grouped, 
            raw: raw_data, 
            merged: merged.objects()
        }
        return parsedData
    })
    
    return result
})
//--------------------------------//
        

//----------------------------------//
//         Start diagram flow       //
//----------------------------------//
finalData.then(src => {
    // prepare input data matix
   
    console.log(src)
    
    // Selector for years
    const allYears = [...new Set(src.raw.map((d) => d.year))];
    const allValues = ['mig_rate', 'da_min_closed', 'da_min_open','da_pb_closed', 'sd_rev_neg', 'sd_drop_neg']
    var selectedYear = allYears.reverse()[0]
    var selectedRegion = []
    var selectedValues = 'mig_rate'

    d3.select("#selectYear")
        .selectAll('myOptions')
        .data(allYears)
        .enter()
        .append('option')
        .text(d=>{ return d; })    // text showed in the menu
        .attr("value",d=> { return d; }) 
    
    d3.select("#selectValues")
        .selectAll('myOptions')
        .data(allValues)
        .enter()
        .append('option')
        .text(d=>{ return d; })    // text showed in the menu
        .attr("value",d=> { return d; }) 
   
    
    ////// Draw diagram
    function draw(year,region,values){
        // Prepare data matrix    
        const merged = src.merged
        region = selectedRegion             // will be [] unless a region is clicked
        values = selectedValues 
        const dataSelection = merged.map(d=> {
            // returns all values, but with region name as source and target for regions selected
            return{
                source: d.source_region === region ? d.source : d.source_region,
                target: d.target_region === region ? d.target : d.target_region,
                value: +d.value[values],
                year: d.year,
            }})
        console.log(dataSelection)
        const groupedValues = aq.from(dataSelection)
            .select('value','year','source','target')
            .groupby('source','target','year')
            .rollup( {value: d => op.sum(d.value)})                
            .objects()
        
        // input_data = groupedValues
        // console.log(region,input_data)
        
        // aq.from(input_data).print()
        let columns =  {0: "source",1:"target",2:"value"}
        groupedValues['columns'] = columns
        names = Array.from(new Set(groupedValues.flatMap(d => [d.source, d.target])));
        const data = getMatrix(names,groupedValues.filter(d=> d.year === year))    
        // console.log(data)


        // Visualization settings
        var color = d3.scaleOrdinal(
            names,
            ["#1f77b4", "#d62728", "#ff7f0e", "#2ca02c",  "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]);

        svg.append("path")
            .attr("id", textId)
            .attr("fill", "none")
            .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle: 2 * Math.PI }));

        // Add ribbons for each chord and its tooltip content <g> <path> <title>
        chords = svg.append("g")
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
        arcs = svg.append("g")
            .attr("font-family", "sans-serif")
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
            .append("textPath")
            .attr("xlink:href", "#"+textId)
            .attr("startOffset", d => d.startAngle * outerRadius)   /*  this helps   */
            .text(d => names[d.index]))
            // On each <g> we set a <title> for the region outflow
            .call(g => g.append("title")
            .text(d => {
                return `${names[d.index]} outflow ${formatValue(d3.sum(data[d.index]))} people and inflow ${formatValue(d3.sum(data, row => row[d.index]))} people`
            }))
        /* d3.select('body')
            .selectAll('#activeData')
            .text("no region selected"); */
        // Interaction
        svg.selectAll(".path-item")
            .on("mouseover", function (evt, d) {
                svg.selectAll(".path-item")
                    .transition()
                    .style("opacity", 0.2);

                d3.select(this)
                    .transition()
                    .style("opacity", 1)
                })
                
            .on("mouseout", function (evt, d) {
                svg.selectAll(".path-item")
                    .transition()
                    .style("opacity", 1);
                })
            


        svg.selectAll(".chord")            
            .on("click", function (evt, d) {
                selectedRegion = names[d.index]
                
                // print selected criteria on console
                console.log(selectedRegion,selectedYear,selectedValues)
                
                // remove current graphics
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity',0)
                    .remove()
                
                // print selected region on screen
                d3.selectAll("#activeData")
                    .text("region: "+selectedRegion+ " | year: "+selectedYear +"| value: "+selectedValues)
                
                // draw new chart 
                draw(selectedYear,selectedRegion,selectedValues)
            });   
        d3.selectAll("#selectYear")
            .on("change", function(d) {
                // Get selected value
                selectedYear = d3.select(this).property("value")


                // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
                // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity', 0)
                    .remove();

                draw(selectedYear,selectedRegion,selectedValues)
                
            })        
        d3.selectAll("#selectValues")
            .on("change", function(d) {
                // Get selected value
                selectedValues = d3.select(this).property("value")


                // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
                // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(1500)
                    .style('opacity', 0)
                    .remove();

                draw(selectedYear,selectedRegion,selectedValues)    
            })
        let table =aq.from(groupedValues).toHTML()
         
        
        // console.log(aq.from(groupedValues).print())
        
        }   

        
        
        // Filter input chart data
        
        
        
        // Run initial chart
        draw(allYears[0])
        
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



