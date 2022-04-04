////////////////////
// YEAR SELECTOR  // ------------------------------------------------------------------------------------
let slider = document.getElementById("selectYear");
let output = document.getElementById("yearRange");
let sliderValue = parseInt(slider.value)+5
output.innerHTML =slider.value+" · "+sliderValue; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    let value = parseInt(this.value)+5
    output.innerHTML = this.value+" · "+value;
}
///////////////////// ------------------------------------------------------------------------------------

// Define
var width = 750;
var height = width;
const textId = "O-text-1"; 

let regionIndex = 1
var innerRadius = Math.min(width, height) *0.49-90;
// console.log(innerRadius)
var outerRadius = innerRadius + 15;

let threshold = []
let regionColors = []
var labelRadius = labelRadius || (outerRadius + 10);

const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);



// Standard chord settings    
var chord = d3.chordDirected()
    .padAngle(0.04)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

var ribbon = d3.ribbonArrow()
    .radius(innerRadius -5)
    .headRadius(11)
    .padAngle(0);
    // .padAngle(1 / innerRadius);


// var formatValue = (x) => `${x.toFixed(0).toLocaleString()}`;
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

// Functions and initial config
let config = {}
config.year = 1990 || ""
config.stockflow = "stock"
config.sex = "all" || ""
config.type = "" || "outward"
config.method = "da_pb_closed" || ""


const getMetaData = async () => {
    const metadata = await d3.csv("data/country-metadata-flags.csv");

    return  metadata
}

function filterYear(input,year){ 
    year = year || 1990
    nodes = input
    selectedMatrix  = nodes.matrix[year]
    let names = nodes.names
        
    let result = { matrix: selectedMatrix, names: names,  regions: nodes.regions};
    // console.log(result)
    return result;
}

// build the data filename (json) with config values
let fileName = (config) => {
    // build filename hierarchy
    stockflow = config.stockflow 
    sex = config.sex === "all" || ""  
        ? ""
        : "_"+config.sex
    type = config.type
    method = stockflow === "stock" 
        ? ""
        : "_"+config.method || "_da_pb_closed"
    let json = 'json/'+stockflow+sex+type+method+'.json'
    
    // clean non-lineal irregularities
    json = json.replace("__","_").replace("_.",".")
    
    return {
         json:json,
         values: stockflow, sex, type, method,
         type: config.type
        }
    }
     
let filename = fileName(config).json
// console.log(filename)

// gets the data from files
async function getData(filename) {
    try {
        const raw_data = d3.json(filename) 
        const metadata = d3.csv("data/country-metadata-flags.csv")
        return  {raw_data:await raw_data, metadata: await metadata}
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
}

// RUN SELECTORS (1st load the metadata into the environment)
getMetaData().then((meta)=>{ 
    getData(filename).then((raw)=>{ 
    // CREATE SELECTORS
        // YEAR SELECTOR 
        let slider = document.getElementById("selectYear");
        let output = document.getElementById("yearRange");
        let sliderValue = parseInt(slider.value)+5
        output.innerHTML =slider.value+"  –  "+sliderValue; // Display the default slider value

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            let value = parseInt(this.value)+5
            output.innerHTML = this.value+"  –  "+value;
        }

        // METHOD SELECTOR 
        d3.select("#selectMethod")
            .selectAll('myOptions')
            .data(allMethods)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
        
        // GENDER SELECTOR 
        d3.select("#selectGender")
            .selectAll('myOptions')
            .data(allGenders)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
        
        // TYPE SELECTOR 
        d3.select("#selectType")
            .selectAll('myOptions')
            .data(allTypes)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
    });    
})

function dataPrepare(input, config){
    meta = input.metadata 
    threshold = input.raw_data.threshold
    // console.log(threshold)
    colors = input.raw_data.colours
    flags = meta.map(d=>{return { [d.origin_name]:d.origin_flag }})
    
    input = input.raw_data
    
    year = config.year

    region = config.region
    // console.log(region)
    sex = config.sex
    let data = filterYear(input,year)   
    
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names,data) {
        const index = new Map(names.map((name, i) => [name, i]));
        // console.log(index)
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
            return matrix;
    }

    // FUNCTION ASSIGN REGION TO EACH COUNTRY NAME   ---   THIS WILL BE USED TO SORT EACH AFTER FILTERING OVER A THRESHOLD 
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
    
    
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
    const countryNames = input.names

    function filteredMatrix(input){
        data = input
        // console.log(data)

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
        // List nodes 
        let nodes = matrix 
            // console.log(nodes)

        // Create object to push links during loop
        let links = []
        let l = 0 // <- iterator
        
        // Run 1st level loop  
        for (let j in matrix){
            let source_region = matrix[j].region    // <- include region why not
            let source = matrix[j].name
            // Run 2nd level loop (into each 1st level array)
            for (let k in matrix[j].connections){
                let target = matrix[k].name
                let target_region = matrix[k].region    // <- include region why not
                let value = matrix[j].connections[k]
                // if (value!== 0) {
                    links[l] = {source_region,source,target_region,target,value}
                    l = l+1 
                // }
            }
        }
        // console.log(links)
        
        // GRAPH STRUCTURE
        let nldata = {nodes: nodes, links:links}       
            //  console.log(nldata.links.length)

        let names = nldata.nodes.map(d=> d.name)

        // Filter data by minimum value
        let filteredData = nldata.links
            .filter(d=> d.value > threshold )

       /*  // For each region, get its values, try to sort them by values and slice the lowest ones
        let source_region_names = Array.from(new Set(filteredData.flatMap(d => d.source_region ))); 
        // Map over each region
        let setThreshold = source_region_names.map(d=> {
            // call data for each region and sort each item inside by value
            let region_data = filteredData.filter(a=> a.source_region === d).sort((a,b)=>b.value -a.value)
            // the % of the lowest values to slice
            let sliceRatio = 0.83
            // compute absolute values to slice for each region and the given ratio
            let itemsToSlice = (region_data.length*sliceRatio).toFixed()
            // slice data
            // console.log(region_data,itemsToSlice)
            region_data = region_data.slice(0,-itemsToSlice)//.sort((a,b)=> d3.ascending(a.source,b.source))
            return region_data
        })
        
        // console.log(filteredData)
        filteredData = setThreshold.flat() */
        // console.log(filteredData)
        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        function removeNullNames(){
            let names_source = Array.from(new Set(filteredData.flatMap(d => d.source ))); // <- be careful, this broke the country sorting by regions when d.target specified  
            let names_target = Array.from(new Set(filteredData.flatMap(d => d.target ))); 
            let bothWayNames = names.filter(d=> names_target.includes(d) && names_source.includes(d))// && names_target.includes(d) ? d:"")//  && names_target.includes(d))
            // console.log(names.length, names_source.length, names_target.length, bothWayNames.length)
            return bothWayNames
        } 
        names = removeNullNames()

        // let names = names_source // > names_target ? names_source : names_target
        
        // Filter countries without values in both directions (target <-> source)
        filteredData = filteredData.filter(d=> names.includes(d.source) && names.includes(d.target))
        
        // console.log(filteredData)
      
        // Generate back the matrix with filtered values
        let filteredMatrix = getMatrix(names,filteredData)
        // console.log(filteredData)
        
        // Reindex regions
        let regions = []
        names.map((d,i)=> {

            if (isRegion(d)){
                regions.push(i)
            }
        })
        return{ names: names, matrix: filteredMatrix, regions: regions}
    }

    // EXPAND COUNTRIES IN SELECTED REGION AND OUTPUT NEW MATRIX
    let nameRegionIndex 
    
    let nextNameRegionIndex
    function expandRegion(input, region) {
        // here we'll find the region index -> we'll get next region -> finally we define a range between both index and replace the values in region in the selected region place 
        nameRegionIndex = input.names.indexOf(region) // index of selected region in names
        regionIndex =  input.regions.indexOf(nameRegionIndex) // index of selected region in regions
        nextNameRegionIndex =  input.regions[regionIndex] >= input.regions.slice(-1).pop() // if equal or higher than last element in regions
                                     ? input.names.length // return last index iin names
                                     : input.regions[regionIndex+1] // return next element in regions        
                    // console.log(nameRegionIndex,nextNameRegionIndex)
        
        // get range between two values
        const range = (min, max) => Array.from({ length: max - min + 1 }, (a, i) => min + i); // computes
        let countryRange = range(nameRegionIndex+1,nextNameRegionIndex-1) // applies

        var selectedRegions = input.regions.flat()
        
        // replace selected region on index and append its countries instead
        selectedRegions[regionIndex] = countryRange

        return selectedRegions.flat()
    }
    
    // produce the filtered Matrix for a given a threshold value
    let dataSliced = filteredMatrix(data,year)
    data = dataSliced
        
/*     let metadata = {
        names: dataSliced.names,
        regions: dataSliced.regions,
        id: dataSliced.names.map((d,i)=>i)
    } */

    // generate data structure to expand countries of a selected region
    let filteredLayout = expandRegion(data,region)


    let names = []
    let unfilteredMatrix = []       // this will gather the first level of selectedCountries + regions but having each a yet unfiltered array of values to match the matrix
    let matrix = []     // yeah, this is the final matrix 
    // Populate the matrix and names objects for the filters and selections applied
    function finalNamesMatrix(){
        filteredLayout.map(d=> {
            let name = data.names[d]
            let subgroup = data.matrix[d]
            names.push(name)
            unfilteredMatrix.push(subgroup)
        })
        // console.log(names)
        
        unfilteredMatrix.map(d=> {
            let filtered = filteredLayout.map(a=> d[a])
            matrix.push(filtered)    
        })
        // console.log(matrix)

        // here we save last selected data
        
        let regions =filteredLayout.map(d=> data.names[d])
        // console.log(regions)
        // here we update final data 
        data = {names,matrix,regions:regions}
      /*   previous.chords = []
        previous = data */
        return data
    }
    let result = finalNamesMatrix()
    return {result/* ,metadata */}
}


function draw(input,config){
    // filteredMatrix    
    let data = dataPrepare(input,config).result
    
    // input layout to retrieve metadata (country <-index-> regions)
    input = input.raw_data
    
    selectedMatrix = data.matrix
    selectedNames = data.names
    let previous = config.previous || data
    console.log(previous)
    rememberTheChords()
    rememberTheGroups() 


    var aLittleBit = Math.PI / 100000;
    config.initialAngle =  {};
    config.initialAngle.arc = { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

    function getMeta(name) {
        // GET FLAG FOR A GIVEN COUNTRY NAME
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(input.names.indexOf(name))
        
        const region_name = input.names[region]
        const id = input.names.indexOf(name)
        return {flag: flag(name), region,region_name,id}
    }
    

 
    // GET REGION INDEX FOR A GIVEN COUNTRY NAME
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

    // Compute true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 


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
            d.outflow = d3.sum(data.matrix[d.index])
            d.inflow = d3.sum(data.matrix, row => row[d.index])
            d.angle = (d.startAngle + d.endAngle) / 2
            })
        return groups
    } 


    

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
        }).length;
    }

    function meltPreviousGroupArc(d) {

        if (d.id !== d.region) {
            return;
        }
  
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
        if (d.source.id !== d.source.region) {
            return;
        }
        
        var c = {
            source: {},
            target: {}
        };
  
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
        // console.log(c.source.endAngle)
        return c;
      }
    
   
    

    // Color settings
    const colorRegions = ["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00","#5197ac"]

    // this gets the html color by the name of the regions (which is the var used creating the visuals)
    const getRegionColor = (d) => colors[input.regions.map((d)=> {return input.names[d]}).indexOf(d)]

    
    // this gets the html color of the region selected by the user and decreases its opacity
    const colorCountries = [colors[regionIndex]]

    const container = chordDiagram.append("g")
        .attr("class","container")
        .attr("id","container")
    const textPath = container.append("path")
        .attr("id", textId)
        .attr("class", "text-path")
        .attr("fill", "none")
        .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle:   2 * Math.PI  }));
        
    const arcs = container.append("g")        
        .attr("class","group")
        .selectAll("g")
        .data(computedGroups(data),d=>d.id)
        .join("g")
        .attr("class",d=>"group-"+d.id)
        
    
    arcs.append("path")
        .attr("class","group-arc")
        .merge(arcs)
        .attr("d", arc) 
        .attr("id",d=>"group-" + d.id)
        .style("fill",d=> isRegion(selectedNames[d.index]) ? getRegionColor(selectedNames[d.index]) :colorCountries)
        
        .transition()
        .duration(500)
        .attrTween("d", function(d,j) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) /* || config.initialAngle.arc */, d);
            return function (t) {
                return arc(i(t))
            }
        })
    arcs.append("title")
        .text(d => {
        return `${d.name} outflow ${formatValue(d3.sum(data.matrix[d.index]))} people and inflow ${formatValue(d3.sum(data.matrix, row => row[d.index]))} people`
    })

    const countryLabels = arcs
        .filter(d=>!isRegion(d.name))
        .append("text")
        .attr("class","country-label")
        .merge(arcs)
        .attr("font-size",7.6  )
        .attr("dy", 3 )
        // Hide labels for low values
        // .style("visibility", d=> d.endAngle-d.startAngle< 0.015 ?"hidden":"")// ? "hidden" : "" ) 
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
    
    countryLabels
        .transition()
        .duration(500)
        .attrTween("transform", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
            return function (t) {
                var t = labelPosition(i(t).angle);
                  return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
              };
        });
    
    const regionLabels = arcs
        .filter(d=>isRegion(d.name))
        .merge(arcs)
        .append("text")
        .attr("class","region-label")
        .attr("font-size",8)
        .attr("dy",-6)
        .append("textPath")
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .attr("fill", d => getRegionColor(d.name))
        .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
        
        .style("text-anchor","middle")
        .attr("xlink:href",d=>"#"+textId)
        .text(d =>d.name) 
        .transition()
        .duration(500)

   

    /* countryLabels.exit()
        .transition()
        .duration(config.animationDuration)
        .style('opacity', 0)
        .attrTween("transform", function (d) {
        // do not animate region labels
            if (d.id === d.region) {
                return;
            }

            var region = computedGroups(data).filter(function (g) {
                return g.id === d.region
            });
            region = region && region[0];
            var angle = region && (region.startAngle + (region.endAngle - region.startAngle) / 2);
            angle = angle || 0;
            var i = d3.interpolate(d, {
                angle: angle
            });
            return function (t) {
                var t = labelPosition(i(t).angle);
                return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
            };
        }) */
       


    const chords = container.append("g")
        .attr("class", "ribbon")
        .selectAll("g")
        .data(computedChords(data),d=> d.id)    
        .join("g")
        .attr("class", d=>"ribbon-"+d.id)
        

    chords
        // .enter()
        .append("path")
        .style("opacity", 0.75)
        .attr("class", "path-item")
        // .merge(chords)
        .attr("d", ribbon)
        .attr("fill", d=> isRegion(data.names[d.source.index]) ? getRegionColor(data.names[d.source.index]) :colorCountries)
        // .style("mix-blend-mode", "multiply")
        // .append("title")
        // .text(d => `${data.names[d.source.index]} inflow ${data.names[d.target.index]} ${formatValue(d.source.value)}`)
        .transition()
        .duration(500)
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
    
    chords.selectAll(".path-item")
        .append("title")
        .text(d => `${data.names[d.source.index]} inflow ${data.names[d.target.index]} ${formatValue(d.source.value)}`)
    /* chords.exit()
        .transition()
        .duration(500)
        .attrTween("d", function (d) {
            var i = d3.interpolate(d, {
                source: {
                    startAngle: d.source.endAngle - aLittleBit,
                    endAngle: d.source.endAngle
                },
                target: {
                    startAngle: d.target.endAngle - aLittleBit,
                    endAngle: d.target.endAngle
                }
            })
            console.log(i)
            return function (t) {
                return ribbon(i(t))
            };
        }) */
       /*  .each('end', function () {
            d3.selectAll(".ribbon").remove()
        }); */
        
        

    /* function wrapText(text, width) {
        text.each(function () {
            var textEl = d3.select(this),
                words = textEl.text().split(/\s+/).reverse(),
                word,
                line = [],
                linenumber = 0.1,
                lineHeight = 2.5, // ems
                y = textEl.attr('y'),
                dx = parseFloat(textEl.attr('dx') || 0), 
                dy = parseFloat(textEl.attr('dy') || -1.5),
                tspan = textEl.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = textEl.append('tspan').attr('x', 0).attr('y', y).attr('dx', dx).attr('dy', ++linenumber * lineHeight + dy + 'em').text(word);
                }
            }
        });
    }
 */
//     labels.call(g => g.append("title")
//         .text(d => {
//             return `${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
//         }))
//   /*   function wrap(text, width) {
//         text.each(function() {
//             var text = d3.select(this),
//                 words = text.text().split(/\s+/).reverse(),
//                 word,
//                 line = [],
//                 lineNumber = 0,
//                 lineHeight = 1.1, // ems
//                 y = text.attr("y"),
//                 dy = parseFloat(text.attr("dy")) || 0,
//                 tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
//             while (word = words.pop()) {
//             line.push(word);
//             tspan.text(line.join(" "));
//             if (tspan.node().getComputedTextLength() > width) {
//                 line.pop();
//                 tspan.text(line.join(" "));
//                 line = [word];
//                 tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
//             }
//             }
//         });
//         } */
//     // d3.select("#table").append("table").html(table)
const tooltip = d3.select('body').append('div')
    .style('class', 'tooltip')
    .style('background-color','#ffffff')
    // .style('filter', 'blur(10px)') 
    // .style('-webkit-filter', 'blur(10px)') /* Safari 6.0 - 9.0 */    
    .style('padding','10px')
    .style('border-radius','8px')
    .style('position', 'absolute')
    .style('visibility', 'hidden').text('ege')
    // .style('box-shadow',' rgba(100, 100, 111, 0.2) 0px 7px 29px 0px')
    .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')
    
    

chordDiagram.selectAll(".path-item")
    .on("mousemove", (evt,d) =>{
        let source = isRegion(data.names[d.source.index])
            ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        
        let target = isRegion(data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
        

        let value = `
            <div> 
            ${formatValue(d.source.value)}
            →
            `
        return tooltip
            .html(`\
            <b>${source} </b>
            ${value} 
            ${target}
            
            `)
            .style('background-color','#ffffff')
            .style("top", (evt.pageY-10)+"px")
            .style("left", (evt.pageX+10)+"px")
            .style("visibility", "visible")
            .transition()
            
    })
    .on("mouseout", function(){
        return tooltip.html(``).style("visibility", "hidden");
    })
chordDiagram.selectAll(".group-arc")
    .on("mousemove", (evt,d) =>{

        let source = isRegion(d.name)
            ? `<span style="color:white"> ${d.name}</span>`
            : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
                <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`
        
        let outflow = formatValue(d3.sum(data.matrix[d.index]))
        let inflow = formatValue(d3.sum(data.matrix, row => row[d.index]))
    
        return tooltip
            .html(`\
            <p>${source} </p>
            <p><b>Total outflow → </b> ${outflow} </p>
            <p><b>Total inflow ←</b> ${inflow} </p>
            
            
            `)
            .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries)
            .style("top", (evt.pageY-10)+"px")
            .style("left", (evt.pageX+10)+"px")
            .style("visibility", "visible")
            .transition()
            
    })
    .on("mouseout", function(){
        return tooltip.html(``).style("visibility", "hidden");
    })
        // INTERACTIONS
  /*   chordDiagram.selectAll(".group-arc, .path-item")
        .on("mouseover", function (evt, d) {
            console.log(d.id)
            chordDiagram
                .selectAll(".path-item")
                .transition()
                .duration(200)
                .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id? 0.2:1)

            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", 1)
            })       
        
        .on("mouseout", function (evt, d) {
            chordDiagram.selectAll(".path-item")
                .transition()
                .duration(200)
                .style("opacity", 0.75);
            })  */ 
            
    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {
            console.log(d)
            config.previous = data 
            config.region = isRegion(data.names[d.index]) ? data.names[d.index] : undefined
            // print selected criteria on console
            // console.log(names)
            
            // remove current content
            d3.selectAll(".container")
                .transition()
                .duration(200)
                .remove()
             
            tooltip.html(``).style('background-color','#ffffff').style("visibility", "hidden");
            
            // d3.selectAll("table").remove()
            // d3.selectAll("#sankey").remove()
             
            // draw new chart 
            getData(filename).then(data=> {
                data = data
                console.log("fILE!",data)
                console.log("previous",data)

                draw(data,config)})
        });   

    d3.selectAll("#selectYear")
        .on("change", function(d) {
            config.previous = data 
            config.year = d3.select(this).property("value")

            // data = filterYear(raw,year)
            
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove();
            
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
            // drawSankey(config)
        })        
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            config.previous = data 
            config.stockflow = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)

            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove();
        
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
    })    
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            config.previous = data 
            config.method = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)

            // data = filterYear(raw,year)
            
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove();
                
            
        

            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
            // drawSankey(config)
    })    
        
    d3.selectAll("#selectGender")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove();
                
            

            getData(filename).then(data=> {
                data = data
                console.log("fILE!",filename)
                console.log("CONFIG!",config)

                draw(data,config)})
        // drawSankey(config)
    })
    
    d3.selectAll("#selectType")
        .on("change", function(d) {
            config.previous = data 
            config.type = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)
            
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove();
            


            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)
        })
    })
}
