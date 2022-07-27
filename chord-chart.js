

// ##########################################################
//  INITIAL PARAMETERS
// ##########################################################
var width = 800;
var height = width-50;
const textId = "O-text-1"; 

// Create svg 
const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr('preserveAspectRatio', 'xMinYMid')
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

let regionIndex = 1        

var innerRadius = Math.min(width, height) *0.35+10;
var outerRadius = innerRadius + 17;
var labelRadius = labelRadius || (outerRadius + 10);

let threshold = []
let regionColors = []


// ##########################################################
// Functions and initial config
// ##########################################################
/* let config = {} */
config.year = 1990 || ""
config.stockflow = config.stockflow
config.sex 
config.type 
config.method = "da_pb_closed" || ""
config.regions = []

var chord = chord(true,false)
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
      
var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

var ribbon = d3.ribbonArrow()
    .sourceRadius(innerRadius)
    .targetRadius(innerRadius -10) 
    .headRadius(15)

function formatValue(nStr, seperator) {
    seperator = seperator || ','
    nStr += ''
    x = nStr.split('.')
    x1 = x[0]
    x2 = x.length > 1 ? '.' + x[1] : ''
    var rgx = /(\d+)(\d{3})/

    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + seperator + '$2');
    }
    return x1 + x2;
  }
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n
  };

function labelPosition(angle) {
    var temp = angle.mod(2*Math.PI);
    return {
        x: Math.cos(temp - Math.PI / 2) * labelRadius,
        y: Math.sin(temp - Math.PI / 2) * labelRadius,
        r: angle > Math.PI ? (temp + Math.PI / 2) * 180 / Math.PI : (temp - Math.PI / 2) * 180 / Math.PI
      };
    }


function filterYear(input,year){ 

    year = +year || 1990
    nodes = input
    const selectedMatrix  = nodes.matrix[year]
    let names = nodes.names
        
    let result = { matrix: selectedMatrix, names: names,  regions: nodes.regions};
    return result;
}

// build the data filename (json) with config values
let fileName = (configs) => {
    configs = {...config}
    // build filename hierarchy
    let stockflow = config.stockflow 
    sex = config.sex === "all" || ""  
        ? ""
        : "_"+config.sex
    type = config.type+"_"
    method = stockflow === "stock" 
        ? ""
        : "_"+config.method || "_da_pb_closed"
    let json = 'json/'+stockflow+'_'+sex+type+method+'.json'
    
    // clean non-lineal irregularities
    json = json.replace("__","_").replace("_.",".").replace("__","_").replace("__","_")
    // console.log( config.method, config.stockflow)
    return {
         json:json,
         values: stockflow, sex, type, method,
         type: config.type
        }
}

let filename = fileName(config).json


/* const getMetaData = async () => {
    const metadata = await d3.csv("data/country-metadata-flags.csv");
    return  metadata
} */

/* // gets the data from files
async function getData(filename) {
    // console.log(filename)
    try {
        let datasets =  [];			// promises
        files.forEach(url => datasets.push(d3.json(url)));
        const data = d3.json(filename) 
        const metadata = d3.csv("data/country-metadata-flags.csv")
        return  {raw_data:await Promise.all(datasets), metadata: await metadata}
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
} */


// ##########################################################
//  DATA PREPARE
// ##########################################################
function dataPrepare(input, config){

    var input_data = {...input} 
    console.log(input_data)
    meta = input_data.metadata 
    threshold = input_data.raw_data.threshold
    colors = input_data.raw_data.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE']
    flags = meta.map(d=>{return { [d.origin_name]:d.origin_flag }})
    input = input_data.raw_data    
    console.log(input)

    year = +config.year
    sex = config.sex
    

    var data = filterYear(input,year)   
    /* console.log("RAW FILTERED YEAR INPUT ---", data) */
    
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names,data) {

        const index = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
            return matrix;
    }

    // Assign region to each index
    function getRegion(index) {
        var r = 0;
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index) {
            break;
            }
            r = i;
        }
        return input.regions[r];
    }
    
    // Returns true if the name is a region
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
    
    function filteredMatrix(input){
        data = input

        const countryNames = data.names
        // GET SOURCE-TARGET STRUCTURE 
        // Create array of name & connections objects
        let matrix = data.names.map((d,i)=> {
                let name = d
                let regionName = countryNames[getRegion(i)]
                let matrix = data.matrix.map(a=>a[i])
                    // console.log(regionName)
                return{ name:name,
                        region: regionName,
                        connections:matrix }
        })
        let nodes = matrix 
        /* console.log(nodes) */
        // Create object to push links during loop
        let links = []
        let l = 0 // <- iterator         
        for (let j in matrix){
            let target_region = matrix[j].region    // <- include region why not
            let target = matrix[j].name
            // loop (into each 1st level array)
            for (let k in matrix[j].connections){
                let source = matrix[k].name
                let source_region = matrix[k].region    // <- include region why not
                let value = matrix[j].connections[k]
                
                links[l] = {source_region,source,target_region,target,value}
                l = l+1 
                // }
            }
        }
        // GRAPH STRUCTURE
        let nldata = {nodes: nodes, links:links} 
        let names = nldata.nodes.map(d=> d.name)
        
        let country_totals = nldata.links.filter(d=> d.source_region != d.target && d.target_region != d.source && !isRegion(d.source) && !isRegion(d.target) ) // remove values for regions targeting countries
        let country_outflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.source) 
        let country_inflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.target) 
        
        let region_totals = nldata.links.filter(d=> isRegion(d.source) && isRegion(d.target))
        let region_outflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.source) 
        let region_inflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.target) 

        let outflows = region_outflows.concat(country_outflows)
        let inflows = region_inflows.concat(country_inflows)
        let total_flows = names.map(name=> {
            let outflow =  outflows.filter(d=> d[0].includes(name)).flat()[1]
            let inflow =  inflows.filter(d=> d[0].includes(name)).flat()[1]
            {return {name, outflow,inflow}}
        })
       /*  console.log(total_flows)
        console.log(config.sex,config.year)
        console.log(country_totals.filter(d=>d.source.includes("Austri")))
        console.log(outflows.filter(d=>d[0].includes("Austri")))
        console.log(inflows.filter(d=>d[0].includes("Austri"))) */

        // FILTER BY THRESHOLD
        let filteredData = nldata.links
        .filter(d=> d.value > threshold )   

        // EXCLUDE NON-RECIPROCAL COUNTRIES
        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        let dataSelect = filteredData.filter(d=> d.source_region != d.target && d.target_region != d.source) // remove values if flow targets source region
        function removeNullNames(){      
            let names_source = Array.from(new Set(dataSelect.flatMap(d => d.source ))); // <- be careful, this broke the country sorting by regions when d.target specified  
            let names_target = Array.from(new Set(dataSelect.flatMap(d => d.target ))); 
    
            function common(...arr){
                return arr.reduce((first,second) => {
                 return first.filter(el => second.includes(el));
                })
              }

            let innerjoin = common(names_source, names_target)
            // Repeat filtering
            // --- beware that i.e: countryA targeted countryB and countryC targeted countryA, after deleting countryB, countryA now shows no outflow, but it is still accounted
            filteredData = dataSelect.filter(d=> 
                innerjoin.includes(d.source) && innerjoin.includes(d.target)
            )
            
            let sources = Array.from(new Set(filteredData.flatMap(d=> d.source)))
            let targets = Array.from(new Set(filteredData.flatMap(d=> d.target)))
            /* console.log(sources.length, targets.length) */
            
            innerjoin = common(sources,targets)
            
            // reindex joined names
            let names_indexed = names.filter(d=> innerjoin.includes(d))
            /* console.log(names.length, names_source.length, names_target.length, innerjoin.length) */

            return names_indexed
        } 

        names = Array.from(new Set(removeNullNames())) 
        
        // SET OUTPUT DATA
        let finalData = filteredData.filter(d=> 
            names.includes(d.source) && names.includes(d.target)
            )
        // Generate back the matrix with filtered values
        let filteredMatrix = getMatrix(names,finalData)
        
        // Reindex regions
        let regions = []
        names.map((d,i)=> {
            if (isRegion(d)){
                regions.push(i)
            }
        })

        return{ names: names, matrix: filteredMatrix, regions: regions, nldata: finalData, total_flows: total_flows}
    }

    // DEFINE LAYOUT FOR SELECTED REGIONS
    // Expand countries under selected regions
    let nextNameRegionIndex
    function expandRegion(input, region) {
        // here we'll find the region index -> we'll get following region -> finally we define a range between both index and replace them on selected region value
        const nameRegionIndex = input.names.indexOf(region)                                         // index of selected region in names
        const regionIndex =  input.regions.indexOf(nameRegionIndex)                                 // index of selected region in regions
        const nextNameRegionIndex =  input.regions[regionIndex] >= input.regions.slice(-1).pop()    // if equal or higher than last element in regions
                                     ? input.names.length                                           // return last index iin names
                                     : input.regions[regionIndex+1]                                 // return next element in regions        
                                     // console.log(nameRegionIndex,nextNameRegionIndex)
        // get range between two values
        const range = (min, max) => Array.from({ length: max - min + 1 }, (a, i) => min + i); // computes
        let countryRange = range(nameRegionIndex+1,nextNameRegionIndex-1) // applies
        let indexList = new Array(input.regions).flat()

        // replace selected region on index and append its countries instead
        indexList[regionIndex] = countryRange
        return {indexList:indexList.flat(),countryRange}
    }

    // produce the filtered Matrix for a given a threshold value
    let dataSliced = filteredMatrix(data,year)    
    data = dataSliced
    total_flows = dataSliced.total_flows

    function getMeta(name) {
        // get flag for a given country name
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(data.names.indexOf(name))
        const region_name = data.names[region]
        const id = data.names.indexOf(name)
        return {flag: flag(name), region,region_name,id}
    }
    
    // Produce layout by concatenating and sort all expaned regions and their countries indexes

    let last_selected = expandRegion(data,config.regions[1]).indexList
    let first_selected = expandRegion(data,config.regions[0]).indexList

    let mergeFilter = () =>  {
        let together = last_selected.concat(first_selected)
        let unique = [...new Set(together)]
        let ids = config.regions.map(d=>{return getMeta(d).id}) // remove values for regions expaned
        let unique_id = unique.filter(d=> !ids.includes(d))
        let sort = unique_id.sort(function(a, b){return a-b}) // 
        return sort
    } 
    
    let filteredLayout = mergeFilter()    
    /* console.log(filteredLayout) */
    let names = []
    let unfilteredMatrix = []               // this will gather the first level of selectedCountries + regions but having each a yet unfiltered array of values to match the matrix
    let matrix = []                         // yeah, this is the final matrix 
    
    // Populate the filtered matrix and names in to the objects  
    function finalNamesMatrix(){
        filteredLayout.map(d=> {
            let name = data.names[d]
            let subgroup = data.matrix[d]
            names.push(name)
            unfilteredMatrix.push(subgroup)
        })
        unfilteredMatrix.map(d=> {
            let filtered = filteredLayout.map(a=> d[a])
            matrix.push(filtered)    
        })
        data = {names,matrix}        
        return data
    }
    let result = finalNamesMatrix()
    let nldata = {links: dataSliced.nldata.filter(d=> names.includes(d.source) && names.includes(d.target)), nodes:names}
    return {result,total_flows, nldata}
}

// ##########################################################
//  DRAW
// ##########################################################
// We set this outside the draw() function to avoid appending a new array to the selector on each run. 
d3.select("#selectMethod")
                .selectAll('myOptions')
                .data(allMethods)
                .enter()
                .append('option')
                .text(d=>{ return d; })    // text showed in the menu dropdown
                .attr("value",d=> { return d; }) 


function drawChords(raw,config){
    // GET SELECTED DATASET   
    filename = fileName(config).json
    let file_index = files.indexOf(filename)
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
    /* console.log(input) */

    // CREATE SELECTORS
    function setSelectors() {
            // YEAR SELECTOR 
            let input_data = input
            const allYears = [...new Set(Object.keys(input_data.raw_data.matrix))]
            const lastYearPlusFive = (+allYears[allYears.length-1]+5).toString()
            /* console.log(lastYearPlusFive) */
            let allRangeYears = allYears.concat(lastYearPlusFive)
            /* console.log(allRangeYears) */
    
            let sliderticks = document.getElementById("sliderticks");
            let slider = document.getElementById("selectYear");
            let output = document.getElementById("yearRange");
            let sliderValue = parseInt(slider.value)
            
            function getTicks (year){
                console.log(year)
                let ticks = allYears.map(col =>
                     +col === +year 
                     ? `<p><b>${col}</b></p   >`
                     : `<p>${col}</p   >`
                    ).join("");
                sliderticks.innerHTML = ticks
            }
            slider.setAttribute("min", allYears[0]);
            slider.setAttribute("max", allYears[allYears.length-1]);
    
            if (filename.includes("stock")){
                function getTicks (year){
                    /* console.log(year) */
                    let ticks = allYears.map(col =>
                         +col === +year 
                         ? `<p style="color:black"><b>${col}</b></p   >`
                         : `<p style="color:black">${col}</p   >`
                        ).join("");
                    sliderticks.innerHTML = ticks
                }
                getTicks(sliderValue)
                // Update the current slider value (each time you drag the slider handle)
                slider.oninput = function() {
                    let value = parseInt(this.value)
                    getTicks(value)
                }
            }
            else if (filename.includes("flow")) {
                function getTicks (year){

                    let ticks = allRangeYears.map(col =>
                         +col === +year  || +col === +year +5
                         ? `<p><b>${col}</b></p   >`
                         : `<p>${col}</p   >`
                        ).join("");
                    sliderticks.innerHTML = ticks
                }
                getTicks(sliderValue)
                 // Update the current slider value (each time you drag the slider handle)
                 slider.oninput = function() {
                     let value = parseInt(this.value)
                     getTicks(value)
                 }
             }            
        }
    setSelectors()

    /* let data = dataPrepare(input,config).result
    let total_flows = dataPrepare(input,config).total_flows */
    preparedData =  dataPrepare(input,config)
    let data = preparedData.result
    
    let total_flows = preparedData.total_flows
    input = input.raw_data                  // used for metadata
    let previous = config.previous || data  // used to interpolate between layouts

    
        
    rememberTheChords()
    rememberTheGroups() 

    var aLittleBit = Math.PI / 100000;
    config.initialAngle =  {};
    config.initialAngle.arc = { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };


    

    // Utils functions 
    // ----------------------
    /* console.log(total_flows) */
    // Get metadata for a given name
    function getMeta(name) {
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(input.names.indexOf(name))
        
        const region_name = input.names[region]
        const id = input.names.indexOf(name)
        const outflow = total_flows.filter(d=>d.name.includes(name))[0].outflow
        const inflow = total_flows.filter(d=>d.name.includes(name))[0].inflow
        
        return {flag: flag(name), region,region_name,id,outflow,inflow}

    }
    console.log(getMeta("Austria"))
    // Get region index for a given name
    function getRegion(index) {
        var r = 0;
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index) {
            break;
            }
            r = i;
        }
        return input.regions[r];
    }

    // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
    
    
    // Extend chord() function values
    function computedChords(data)  {
        let chords = chord(data.matrix).map(d=> {
            d.source.name = data.names[d.source.index]
            d.source.region = getMeta(d.source.name).region
            d.source.id = getMeta(d.source.name).id
            
            d.target.name = data.names[d.target.index]
            d.target.region = getMeta(d.target.name).region
            d.target.id = getMeta(d.target.name).id
            
            direction = d.source.id > d.target.id ? 'source' :'target'
            d.id = direction+`-`+d.source.id+`-`+d.target.id
            let result = {id:d.id, source: d.source, target:d.target}

            return result  
        })
        return chords
    }

    function computedGroups(data)  {
        let groups = chord(data.matrix).groups
        groups.map(d=>{
            d.name = data.names[d.index]
            d.id = getMeta(data.names[d.index]).id
            d.region = getMeta(data.names[d.index]).region
            d.angle = (d.startAngle  + (d.endAngle - d.startAngle) / 2)
            })
        return groups
    } 

    // process last layout values for c
    function rememberTheChords() {
        previous.chords = computedChords(previous).reduce(function(sum, d) {
          sum[d.source.id] = sum[d.source.id] || {};
          sum[d.source.id][d.target.id] = d
          return sum;
        }, {});
      }

    function rememberTheGroups() {
        previous.groups = computedGroups(previous).reduce(function(sum, d) {
            sum[d.id] = d;
            return sum;
        }, {});
    }

    function getCountryRange(id) {
        var end = input.regions[input.regions.indexOf(id) + 1];
        return {
            start: id + 1,
            end: end ? end - 1 : input.names.length - 1
        };
    }

    function inRange(id, range) {
        return id >= range.start && id <= range.end;
    }

    function inAnyRange(d, ranges) {
        return !!ranges.filter(function (range) {
            return inRange(d.source.id, range) || inRange(d.target.id, range);
        })
        .length;
    }

    function meltPreviousGroupArc(d) {
        if (d.id !== d.region) {return}

        var range = getCountryRange(d.id);
        var start = previous.groups[range.start];
        var end = previous.groups[range.end];
        if (!start || !end) {
            return;
        }
        return {
            angle: start.startAngle + (end.endAngle - start.startAngle) / 2,
            startAngle: start.startAngle,
            endAngle: end.endAngle
        };
    }
    
    function meltPreviousChord(d) {
        if (d.source.id !== d.source.region) {return}

        var c = {source: {},target: {}};

        Object.keys(previous.chords).forEach(function(sourceId) {
            Object.keys(previous.chords[sourceId]).forEach(function(targetId) {
            var chord = previous.chords[sourceId][targetId];
  
            if (chord.source.region === d.source.id) {
                if (!c.source.startAngle || chord.source.startAngle < c.source.startAngle) {
                c.source.startAngle = chord.source.startAngle;
                }
                if (!c.source.endAngle || chord.source.endAngle > c.source.endAngle) {
                c.source.endAngle = chord.source.endAngle;
                }
            }
            
            if (chord.target.region === d.target.id) {
                if (!c.target.startAngle || chord.target.startAngle < c.target.startAngle) {
                c.target.startAngle = chord.target.startAngle;
                }
                if (!c.target.endAngle || chord.target.endAngle > c.target.endAngle) {
                c.target.endAngle = chord.target.endAngle;
                }
            }
            });
        });
        c.source.startAngle = c.source.startAngle || 0;
        c.source.endAngle = c.source.endAngle || aLittleBit;
        c.target.startAngle = c.target.startAngle || 0;
        c.target.endAngle = c.target.endAngle || aLittleBit;
        // transition from start
        c.source.endAngle = c.source.startAngle + aLittleBit;
        c.target.endAngle = c.target.startAngle + aLittleBit;
        return c;
      }
    
    const getRegionColor = (name) => {
        a = input.regions.map((d)=> { return input.names[d]})
        b = a.indexOf(name)
        return colors[b]
    }

    const colorCountries = (name) => {
        let color_country = getRegionColor(getMeta(name).region_name)
        let hsl = d3.hsl(color_country)
        let d =  getMeta(name)
        r = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)]
        return r[(d.id-d.region)%5]
    }

    // START CREATING SVG ELEMENTS
    const container = chordDiagram.append("g")
        .attr("class","container")
        .attr("id","container")
        /* .attr("viewBox", "xMinYMax meet) */    
        
    const groups = container.append("g")        
        .attr("class","groups")
        .selectAll("g")
        .data(computedGroups(data))
        .join("g")
        .attr("class",d=>"group-"+d.id)

    groups.append("path")
        .attr("class","group-arc")
        .attr("d", arc) 
        .attr("id",d=>"group-" + d.id)
        .style("fill",d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80)
        .transition()
        .duration(600)
        .attrTween("d", function(d,j) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) /* || config.initialAngle.arc */, d);
            return function (t) {
                return arc(i(t))
            }
        })    


    groups.append("path")
        .attr("id", textId)
        .attr("class", "text-path")
        .attr("fill", "none")
        .attr("d", d3.arc()({ outerRadius:outerRadius   , startAngle: 0, endAngle:   2 * Math.PI  }));
    
    // const arcs2 = container.append("g")        
    //     .attr("class","group")
    //     .selectAll("g")
    //     .data(computedChords(data))
    //     .join("g")

    
    // arcs2.append("path")
    //     .attr("class","arc2")
    //     .attr("d", arc.innerRadius(innerRadius-5).outerRadius(outerRadius)) 
    //     .style("fill",d=> isRegion(d.target.name) ? getRegionColor(d.target.name) :colorCountries(d.target.name))
    //     /* .style("opacity",d=> isRegion(d.target.name) && config.regions.length > 0 ? 0.03: 0.80) */
    //     .transition()
    //     .duration(500)
    //     .attrTween("d", function(d,j) {
    //         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
    //         return function (t) {
    //             return arc(i(t))
    //         }
    //     })    
    const chords = container.append("g")
        .selectAll("g")
        .attr("class", "ribbon")
        .data(computedChords(data))   
        .join("g")
    
    chords
        .append("path")
        .attr("class", "path-item")
        .attr("d", ribbon)
        .attr("fill", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))
        // .style("mix-blend-mode", "multiply")
        .style("opacity",d=> isRegion(d.source.name) && config.regions.length > 0 ? 0.03: 0.80)
        .transition()
        .duration(600)
        .attrTween("d", function (d) {
            var p  = previous.chords[d.source.id] && previous.chords[d.source.id][d.target.id]
            p = p || previous.chords[d.source.region] && previous.chords[d.source.region][d.target.region]
            p = p || meltPreviousChord(d)
            p = p || config.initialAngle.chord
            var i = d3.interpolate(p, d)
            return function (t) {
                // console.log(i(t))
                return ribbon(i(t));
          }
        })
    
    countryLabels = groups
        .filter(d=>!isRegion(d.name))
        .append("text")
        .attr("class","country-label")
        .attr("font-size",9)
        .attr("transform", d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerRadius + 5})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .text(d => d.angle > Math.PI
                ? d.name+ " "+ getMeta(d.name).flag
                :  getMeta(d.name).flag+ " "+  d.name
            )
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .transition()
        .duration(600)
        .attrTween("transform", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
            return function (t) {
                var t = labelPosition(i(t).angle);
                  return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
              };
        });
//     var groupTextPathPath = groups      
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.group-textpath-arc')
//         .data(computedGroups(data));


//     groupTextPathPath.enter()
//     .append('path')
//     .attr("class", "group-textpath-arc")
//     .attr("id", function(d, i, k) { return "group-textpath-arc" + d.id; });


//     groupTextPathPath
//     .style("fill", 'none')
//     .transition()
//     .duration(500)
//     .attrTween("d", function(d) {
//         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d );
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//         return function (t) {
//             return textPathArc2(i(t));
//         };
//         } else {
//         return function (t) {
//             return textPathArc(i(t));
//         };
//         }
//     });

//     groupTextPathPath.exit().remove();

//     // Creating a Field for the Textfield
    
//     var groupTextPathPath2 = groups
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.group-textpath-arc2')
//         .data(computedGroups(data));


//     groupTextPathPath2.enter()
//         .append('path')
//         .attr("class", "group-textpath-arc2")
//         .attr("id", function(d, i, k) { return "group-textpath-arc2" + d.id; });

//     groupTextPathPath2
//         .style("fill", 'none')
//         .transition()
//         .duration(500)
//         .attrTween("d", function(d) {
//         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d );
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//             return function (t) {
//             return textPathArc3(i(t));
//             };
//         } else {
//             return function (t) {
//             return textPathArc4(i(t));
//             };
//         }
//         });

//     groupTextPathPath2.exit().remove();


//     // text on path
//     var groupTextPath = groups
//     .filter(function(d) {return d.id === d.region})
//     .selectAll('textPath')
//     .data(computedGroups(data));

//     groupTextPath
//     .enter()
//     .append("textPath");

//     groupTextPath
//         .text(function(d) {
//         var meanCalc = (d.endAngle + d.startAngle ) / 2 ;
//         if (nname2[d.id] == ""){
//             return nname1[d.id] ;
//         }else if (meanCalc < 1.57 || meanCalc > 4.711 ){
//             var out = nname2[d.id] ;
//             //var out = "first" ;
//         }else {
//             var out = nname1[d.id] ;
//             // var out = "second";
//         }                         //First NAME  !!!!
//         return  out ; })                  
//         .attr('startOffset', function(d) {
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//         return '75%';
//         } else {
//         return '25%';
//         }
//     })
//     .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; })

// // Added for creating a second layer of TextField for longer names

//     var groupTextPath2 = groups
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.sec')
//         .data(computedGroups(data));

//     groupTextPath2
//         .enter()
//         .append("textPath")
//         .attr("class", "sec");

//     groupTextPath2
//         .text(function(d) {
//         var meanCalc = (d.endAngle + d.startAngle ) / 2 ;
//         if (nname2[d.id] == ""){
//             return  ;
//         }
//             else if (meanCalc < 1.57 || meanCalc > 4.711 ){
//             var out = nname1[d.id] ; // var out = "first" ;
//         }else {
//             var out = nname2[d.id] ; // var out = "second";
//         }                         
//         return out;  })           
//         .attr('startOffset', function(d) {
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//             return '75%';
//         } else {
//             return '25%';
//         }
//         })
//         .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc2" + d.id; })    


//     groupTextPath
//     .filter(function(d, i) {
//         return this.getComputedTextLength() > (d.endAngle - d.startAngle) * (config.outerRadius + 18);
//     })
//     .remove();
  
var maxBarHeight = height / 2 - (70);
var arcRegionLabel = d3.arc()
    .innerRadius(maxBarHeight)
    .outerRadius(maxBarHeight + 2)

    // .startAngle(d=> d.startAngle)
    // .endAngle(d=> d.endAngle)
    
    // /* .innerRadius(maxBarHeight + 2) */

var regionText = container.selectAll("path.region_label_arc")
    .data(computedGroups(data))
    .enter().append("path")
    .filter(d=> isRegion(d.name))
    .attr("id", function(d, i) {
    return "region_label_" + i;
    }) 
    .attr("fill", "none")
    .attr("d", arcRegionLabel);


regionText.each(function(d, i) {
    var firstArcSection = /(^.+?)L/;
    var newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
    newArc = newArc.replace(/,/g, " ");

    if (d.startAngle > Math.PI / 2 && d.startAngle < 3 * Math.PI / 2 && d.endAngle > Math.PI / 2 && d.endAngle < 3 * Math.PI / 2) {
        var startLoc = /M(.*?)A/, 
            middleLoc = /A(.*?)0 0 1/, 
            endLoc = /0 0 1 (.*?)$/; 
        var newStart = endLoc.exec(newArc)[1];
        var newEnd = startLoc.exec(newArc)[1];
        var middleSec = middleLoc.exec(newArc)[1];
        newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
    }
    d3.select(this).attr("d", newArc);
});

container.selectAll(".region-label-text")
    .data(computedGroups(data))
    .enter().append("text")
    .attr("class", "region-label-text")
    .filter(d=> isRegion(d.name))
    .append("textPath")
    .attr("font-size",11.5)
    .attr("fill", d => getRegionColor(d.name))
    .attr("xlink:href", function(d, i) {
        return "#region_label_" + i;
    })
    .text(d=> d.name)
    .call(wrapTextOnArc, height / 2 - (70));

// adjust dy (labels vertical start) based on number of lines (i.e. tspans)
regionText.each((d,i)=> { 
    var textPath =d3.selectAll("textPath")["_groups"][0][i]
    tspanCount = textPath.childNodes.length;
    /* console.log(textPath) */

    if (d.startAngle > Math.PI / 2 && d.startAngle < 3 * Math.PI / 2 && d.endAngle > Math.PI / 2 && d.endAngle < 3 * Math.PI / 2) {
        d3.select(textPath.childNodes[0]).attr("dy", .3 + (tspanCount - 1) * -0.6 + 'em');
    } else {
        d3.select(textPath.childNodes[0]).attr("dy", -.3 + (tspanCount - 1) * -0.6 + 'em');
    }
});
function wrapTextOnArc(text, radius) {
    var temporaryText = d3.select('svg')
        .append("text")
        .attr("class", "temporary-text") // used to select later
        .style("opacity", 0); // hide element

    var getTextLength = function(string) {
        temporaryText.text(string);
        return temporaryText.node().getComputedTextLength();
    };

    text.each(function(d) {
        var text = d3.select(this),
        words = text.text().split(/[ \f\n\r\t\v]+/).reverse(),
        word,
        wordCount = words.length,
        line = [],
        textLength,
        lineHeight = 1.1, // ems
        x = 0,
        y = 0,
        dy = 0,
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em"),
        arcLength = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * (2 * Math.PI * radius),
        paddedArcLength = arcLength - 12;
    /* console.log(wordCount) */
        while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        textLength = getTextLength(tspan.text());
        tspan.attr("x", (arcLength - textLength) / 2);
        if (textLength > paddedArcLength && line.length > 1) {
            line.pop();
            tspan.text(line.join(" "));
            textLength = getTextLength(tspan.text());
            tspan.attr("x", (arcLength - textLength) / 2);
        
            line = [word];
            tspan = text.append("tspan").attr("dy", lineHeight + dy + "em").text(word);
            textLength = getTextLength(tspan.text());
            tspan.attr("x", (arcLength - textLength) / 2);
        } 
        }
    }).filter(d=>d.name.includes("Sub") ||d.name.includes("Ocea")).selectAll("tspan").attr("x",0);
}
    /* 
    const regionLabels = groups
        .filter(d=>isRegion(d.name))
        .append("text")
        .attr("class","region-label")
        .attr("font-size",11.5)
        .append("textPath")
        .attr("fill", d => getRegionColor(d.name))
        .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
        .attr("text-anchor","middle")
        .attr("xlink:href",d=>"#"+textId)
        .text(d =>d.name)
        .transition()
        .duration(500)
        
    regionLabels
        .call(d=> wrapText(d,67))
 */

    const tooltip = d3.select('body').append('g')
        .attr('id', 'tooltip')
        .style('background-color','#ffffff')
        .style('padding','1em')
        .style('border-radius','4px')
        .style('position', 'absolute')
        .style('text-align', 'center')
        .style('visibility', 'hidden')
        .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')    


    // function wrapText(text, width) {
    //     text.each(function (d) {
    //         var textEl = d3.select(this),
    //             words = textEl.text().split(/\s+/).reverse(),
    //             word,
    //             line = [],
    //             linenumber = -2,
    //             lineHeight =-1.2, // ems
    //             y = textEl.attr('y'),
    //             dx = parseFloat(textEl.attr('dx') || 0), 
    //             dy = parseFloat(textEl.attr('dy') || -2.4),
    //             tspan = textEl.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy +'em')//.attr("class",'yay');

    //         while (word = words/* .reverse() */.pop()) {
    //             line.push(word);
    //             tspan.text(line.join(' '));
            
    //             if (tspan.node().getComputedTextLength() > width) {
    //                 d3.select(this.parentNode).attr("class", "wrapped")º
    //                 line.pop();
    //                 tspan.text(line.join(' '));
    //                 line = [word];z).attr('y', y).attr('dx', dx).attr('dy', /* linenumber * lineHeight + dy + */1+ 'em').text(word).attr("z-index",2);
    //             }
    //         }
    //         /* d3.selectAll(this.parentNode).filter(d=> d.classed("wrapped",false)).attr("translate",-10) */
    //     });
    // }

        
    function tooltipCountry(evt,d)  {
        var source = isRegion(data.names[d.source.index])
            ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        
        var target = isRegion(data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
        
        if(filename.includes('stock')){
            var value = `
            <div> 
            <b>${formatValue(d.source.value)}</b> 
            <br>in<br>
            `
        } else {
            var value = `
            <div> 
            ▾<br>
            <b>${formatValue(d.source.value)}</b> 
            <br> 
            `
        }
        
        return tooltip
            .html(`\
            <b>${source} </b> 
            ${value} 
            ${target}
            `)
            .transition()
            .duration(50)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY-10)+"px")
            .style("left", (evt.pageX+10)+"px")
            .style("visibility", "visible")       
    }

    function tooltipRegion(evt,d) {
        let source = isRegion(d.name)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
                <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`
        if (data.matrix !== undefined) {
            var outflow = formatValue(getMeta(d.name).outflow) 
            var inflow = formatValue(getMeta(d.name).inflow)
        }
        // console.log(filename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
        if (filename.includes('stock') ){
            return tooltip
                .html(`\
                    ${source} </br>
                    Total emigrants: <b> ${outflow}</b> </br>
                    Total immigrants: <b> ${inflow} </b>
                `)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`\
                    ${source} </br>
                    Total Out: <b> ${outflow}</b> </br>
                    Total In: <b> ${inflow} </b>
                `)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
                .style("visibility", "visible")
         
        }
    }

    // INTERACTIONS
    // open regions
    config.maxRegionsOpen = 2 // config.regions = region || config.regions
    
    groups.on('click', function(evt, d) {
            
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            /* console.log(d.name) */
            config.regions.push(d.name) // console.log(d.name)
            d3.selectAll("g")
              .remove()    
            update(raw,config)
        })

    // close regions
    groups
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(evt, d) {
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            d3.selectAll("g")
                .remove()    
            update(raw,config)
        });

    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            /* console.log(data) */
            config.previous = data 
            d3.selectAll("g")
                .remove()    
            update(raw,config)
            // draw new chart 
            /* getData(filename).then(data=> {
                    data = data
                    // remove current content
                    d3.selectAll("g")
                        .remove()        
                    return draw(data,config)
                }) */
        })

    chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
 
    function mouseover() {
        chordDiagram.selectAll(".group-arc, .path-item")
             .on("mouseover", function (evt, d) {
            // console.log(d.id)
            if (config.regions < 1){
                chords
                    .selectAll(".path-item, .group-arc")
                    .transition()
                    .duration(80)
                    .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                /* arcs.selectAll(".group-arc")
                .style("opacity",d=> isRegion(d.name) ? 0.03: 0.80) */
                d3.select(this)
                    .transition()
                    .duration(80)
                    .style("opacity", 0.80)
                        
            }
            else{
                chords
                    .selectAll(".path-item, .group-arc")
                    /* .transition()
                    .duration(100) */
                    .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                d3.select(this)
                    /* .transition()
                    .duration(100) */
                    .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
                }
            }
        )
    }   
        
    function mouseout() {
        chordDiagram.selectAll("g")
            .on("mouseout", function (evt, d) {        
                chords.selectAll(".path-item")
                    .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.03: 0.80)
                groups.selectAll(".group-arc")
                    .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80)
                
            })  

        chordDiagram.selectAll(".path-item, .country-label")
            .on("mousemove", tooltipCountry)
            .on("mouseout", function(){
                 tooltip.style("visibility", "hidden");
            })

        chordDiagram.selectAll(".group-arc, .country-label")
            .on("mousemove", tooltipRegion)
            .on("mouseout", function(){
                return tooltip.style("visibility", "hidden");
            })
    }

    
    d3.selectAll("#selectYear")
        .on("input", function(d) {

            config.previous = data 
            config.year = +d3.select(this).property("value")
            update(raw,config)

            /* getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();
               return draw(data,config)
            }) */

        })        
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            config.previous = data 
            config.stockflow = d3.select(this).property("value")
            update(raw,config)
            /*filename = fileName(config).json

            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */

    })    
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            config.previous = data 
            config.method = d3.select(this).property("value")
            update(raw,config)
            /* d3.selectAll("g")
                .remove()    
                update(raw,config) */
            /* filename = fileName(config).json
                
            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */
            
    })    
  
    d3.selectAll(".selectSex")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")
            // console.log(config.sex)
            update(raw,config)
        /*     d3.selectAll("g")
                .remove()    
            draw(raw,config) */
            /* filename = fileName(config).json
            console.log(filename)

            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */

        // drawSankey(config)
    })
    
    d3.selectAll(".selectType")
    .on("change", function(d) {
        config.previous = data 
        config.type = d3.select(this).property("value")
        update(raw,config)
        /*       d3.selectAll("g")
        .remove()    
        draw(raw,config)      */
    })
    AIAI = d3.selectAll("html#reset")
    console.log(AIAI)
    
    d3.selectAll(".button")
        .on("click", function(d, evt) {
            config.previous = [] 
        
        
            console.log("MY EYE AI", evt)
            update(raw,config)
            }
        )
        
}


