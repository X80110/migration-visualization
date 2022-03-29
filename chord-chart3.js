////////////////////
// YEAR SELECTOR  // ------------------------------------------------------------------------------------
let config = {}
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
var width = 650;
var height = width;
const textId = "O-text-1"; 
let previous = []

config.now = 2000// config.now || Object.keys(data.matrix)[0];

// geometry

width = 650
config.width = width /* config.width || 1100; */
config.height = width /* config.height || 1100; */
config.margin = config.margin || 125;
config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
config.arcWidth = config.arcWidth || 24;
config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
config.arcPadding = config.arcPadding || 0.005;
config.sourcePadding = config.sourcePadding || 3;
config.targetPadding = config.targetPadding || 20;
config.labelPadding = config.labelPadding || 10;
config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

// animation
var aLittleBit = Math.PI / 100000;
config.animationDuration = config.animationDuration || 1000;
config.initialAngle = config.initialAngle || {};
config.initialAngle.arc = config.initialAngle.arc || { startAngle: 0, endAngle: aLittleBit };
config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

// layout
config.layout = config.layout || {};
config.layout.sortSubgroups = config.layout.sortSubgroups || d3.descending;
config.layout.sortChords = config.layout.sortChords || d3.descending;
config.layout.threshold = config.layout.threshold || 1000;
config.layout.labelThreshold = config.layout.labelThreshold || 100000;

config.maxRegionsOpen = config.maxRegionsOpen || 2;
config.infoPopupDelay = config.infoPopupDelay || 300;



// calculate label position
function labelPosition(angle) {
  return {
    x: Math.cos(angle - π / 2) * config.labelRadius,
    y: Math.sin(angle - π / 2) * config.labelRadius,
    r: (angle - π / 2) * 180 / π
  };
}

function formatNumber(nStr, seperator) {
  seperator = seperator || ',';

  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + seperator + '$2');
  }
  return x1 + x2;
}

function luminicity(color) {
  var rgb = d3.rgb(color);

  return 0.21 * rgb.r + 0.71 * rgb.g + 0.07 * rgb.b;
}

const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

var chord = d3.chord()
    .padAngle(1 / config.innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);
var arc = d3.arc() 
    .innerRadius(config.innerRadius)
    .outerRadius(config.outerRadius);
var ribbon = d3.ribbonArrow()
    .radius(config.innerRadius - 5)
    .padAngle(1 / config.innerRadius);
var formatValue = (x) => `${x.toFixed(0).toLocaleString()}`;

// Functions and initial config

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
     
filename = fileName(config).json
// console.log(filename)


// gets the data from files
async function getData(filename) {
    try {
        // console.log(filename)
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
        console.log(raw.raw_data)
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
    
function draw(input,config){
    // console.log(input.raw_data.colours)
    var countries = [0,14]
    const colors = (d) => input.raw_data.colours[d]
    meta = input.metadata 
    input = input.raw_data
    
    year = config.year
    region = config.region
    sex = config.sex
    let data = filterYear(input,year)
    countries = countries || previous.countries;
    previous.countries = countries;


    var ranges = countries.map(getCountryRange);

    
    // GET FLAG FOR A GIVEN COUNTRY NAME
    let flags = meta.map(d=>{return { [d.origin_name]:d.origin_flag }})
    const flag = (name) =>{ 
        let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
        return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
    }
    

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
        
        for (var i = 0; i < data.regions.length; i++) {
            if (data.regions[i] > index) {
            break;
            }
            r = i;
        }
        return data.regions[r];
    }
    
    const countryNames = input.names
    // console.log(countryNames.map((d,i)=> {return countryNames[getRegion(i)]}))
    
    /* const Names =input.names.map((d,i)=> {return {[d]:input.names[getRegion(i)]}})
    console.log(countryNames[""]) */
    // function getRegionName(name){
    //     let regionName = []
    //     for (let i in input.names){
    //         let region = getRegion(i)
    //         regionName.push(input.names[region])
    //     }

    //     return regionName
    // }

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
        let nodes = matrix // console.log(nodes)
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
                if (value!== 0) {
                    links[l] = {source_region,source,target_region,target,value}
                    l = l+1 
                }
                // if (value!== 0) {
                //     links[l] = {source_region,source,target_region,target,value}
                //     l = l+1 
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
            .filter(d=> d.value > 1000 )

        // For each region, get its values, try to sort them by values and slice the lowest ones
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
        let computeFlowPerCountry = names.map(d=>{
            let outflow = filteredData.filter(a=>a.target === d )
            // console.log(outflow)

            // outflow[d] = outflow.map(a=>a.value[d])
            let inflow = filteredData.filter(a=> a.target === d)

            // console.log(outflow)

        })
        // console.log(filteredData)
        filteredData = setThreshold.flat()
        // console.log(filteredData)
        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        let names_source = Array.from(new Set(filteredData.flatMap(d => d.source ))); // <- be careful, this broke the country sorting by regions when d.target specified
        let names_target = Array.from(new Set(filteredData.flatMap(d => d.target ))); 
        // let names = names_source // > names_target ? names_source : names_target
        
        // Filter countries without values in both directions (target <-> source)
        let bothWayNames = names.filter(d=> names_target.includes(d) && names_source.includes(d))// && names_target.includes(d) ? d:"")//  && names_target.includes(d))
        
        

        // console.log(nldata.links.filter(d=> d.value > 10000 ))
        
    
        // console.log(bothWayNames)
        console.log(names.length, names_source.length, names_target.length, bothWayNames.length)
        names = bothWayNames

        //
        // console.log(filteredData)
        // filteredData = filteredData.filter(d=>bothWayNames.includes(d.source))
        filteredData = filteredData.filter(d=> bothWayNames.includes(d.source) && bothWayNames.includes(d.target))
        // console.log(filteredData)
        // filteredData = filteredData.filter(d=> {
        //     if (names_target.includes(d.source)){
        //         return d
        //     }})

        // console.log(filteredData)
        /* filteredData.filter((d,i)=> {
            let source  = d.source
            let target = d.target
            console.log(d[target === "Gibraltar"])

            // console.log(names_source.filter(d=>d.includes(source)))

        })
         */
        // let a = filteredData.filter(d=> d.target.includes(names_source  names_target))// ==="Spain").length)// || d.target ==="Gibraltar"))
        // console.log(filteredData.map(d=>  d["source"]))
      
        // Generate back the matrix with filtered values
        let filteredMatrix = getMatrix(names,filteredData)
        console.log(filteredData)
        
        // Reindex regions
        let regions = []
        names.map((d,i)=> {
            // console.log(isRegion(d))
            if (isRegion(d)){
                regions.push(i)
            }
            
        })
        // console.log(regions)
        // console.log(regions.map(d=>names[d])
       /*  names.map((d,i)=>  {
            if  (isRegion(d)){
                    // console.log(names)
            }
        })
 */
        return{ names: names, matrix: filteredMatrix, regions: regions}
    }
    
    // EXPAND COUNTRIES IN SELECTED REGION
    // Define vars to work with
    // stockflow = stockflow
    let names = []
    let unfilteredMatrix = []       // this will gather the first level of selectedCountries + regions but having each a yet unfiltered array of values to match the matrix
    let matrix = []     // yeah, this is the final matrix 

    let nameRegionIndex 
    let regionIndex = 1
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

    // generate data structure to expand countries of a selected region
    let filteredRegions = expandRegion(data,region)
    // console.log(dataSliced)

    // Populate the matrix and names objects for the filters and selections applied
    filteredRegions.map(d=> {
        let name = data.names[d]
        let subgroup = data.matrix[d]
        names.push(name)
        unfilteredMatrix.push(subgroup)
    })
    // console.log(names)
    unfilteredMatrix.map(d=> {
        let filtered = filteredRegions.map(a=> d[a])
        matrix.push(filtered)    
    })
    previous = data
    previous.chords = []
    data = {names,matrix,regions:filteredRegions}
    
    
    
    // names.map((d,i)=> console.log(names[i],getRegionName("Spain")))
    // console.log(unfilteredMatrix)
    // console.log(names.map(d=> isRegion(d)))
    // console.log(input.regions.map((d)=> {return input.names[d]}))
    
    // Compute true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    function isRegion(name) {
        return data.regions.includes(data.names.indexOf(name))
    } 
    // console.log(isRegion('Oceania'))
    // console.log(isRegion('Angola'))
    console.log(data)
    // Color settings
    const colorRegions = ["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00","#5197ac"]
    
    // this gets the html color by the name of the regions (which is the var used creating the visuals)
    const getRegionColor = (d) => colorRegions[data.regions.map((d)=> {return data.names[d]}).indexOf(d)]
    
    // this gets the html color of the region selected by the user and decreases its opacity
    const colorCountries = [colorRegions[regionIndex]+'85']
    
    function arcColor(d) {
        if (d.region === d.id) {
          return colors(d.region);
        }
        var hsl = d3.hsl(colors(d.region));
        var r = [hsl.brighter(0.75), hsl.darker(2), hsl, hsl.brighter(1.5), hsl.darker(1)];
        return r[(d.id - d.region) % 5];
      }
  
      function chordColor(d) {
        return arcColor(d.source);
      }

    // var color  = d3.scaleOrdinal(
    //     names,
    //     colorRegions);
    // console.log(matrix)
    // console.log([colorCountries])
    // const color = d3.scaleOrdinal(names, colorScale)
    // used to get the color of each region
    // console.log(getRegionColor("Oceania"))
    // console.log(getRegionColor("Europe"))
    // console.log(getRegionColor("Sub-Saharan Africa"))
    // let chord
    chordDiagram.append("path")
        .attr("id", textId)
        .attr("fill", "none")
        .attr("d", d3.arc()({ outerRadius:config.outerRadius, startAngle: 0, endAngle:   2 * Math.PI  }));

   
    function getCountryRange(id) {
        var end = data.regions[data.regions.indexOf(id) + 1];
  
        return {
          start: id + 1,
          end: end ? end - 1 : data.names.length - 1
        };
    }

    function inRange(id, range) {
      return id >= range.start && id <= range.end;
    }

    function inAnyRange(d, ranges) {
      return !!ranges.filter(function(range) { return inRange(d.source.id, range) || inRange(d.target.id, range); }).length;
    }

    // Transition countries to region:
    // Use first country's start angle and last countries end angle. 
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
  
        return c;
      }
  
    
    function chordGenerator(d) {
        computedChords()
    }

    var group = chordDiagram.selectAll(".group")
        .data(computedGroups(), function(d) { return d.id; });
    group.enter()
        .append("g")
        .attr("class", "group");
    group
        .on("mouseover", function(d) {
        chord.classed("fade", function(p) {
            // console.log(p.source.id,p.target,d.id);
            return p.source.id !== d.id && p.target.id !== d.id;
        });
        });
    group.exit().remove();

    // group arc
    var groupPath = chordDiagram
    .append("g")
    .selectAll(".group-arc")
    .data(computedGroups())
    .join("g")

    .call(g => g.append("path")
        .attr("d", arc) 
        .attr("fill", "blue")//d=> isRegion(names[d.index]) ? getRegionColor(names[d.index]) :colorCountries)
        .attr("stroke", "yellow")
        .attr("stroke-width", "3.4px")
        
    )

    groupPath
        .style("fill",d => getRegionColor(d.name))
        // .on("mousemove", groupInfo)
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
        var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
        return function (t) {
            return arc(i(t)); };
        });
    groupPath.exit().remove();

    /* var group = chordDiagram.selectAll(".group")
        .data(computedChords(), function(d) { return d.id; });
    group.enter()
        .append("g")
        .attr("class", "group");
    group
        .on("mouseover", function(d) {
          chord.classed("fade", function(p) {
            // console.log(p.source.id,p.target,d.id);
            return p.source.id !== d.id && p.target.id !== d.id;
          });
        });
    group.exit().remove();

    // group arc

    var groupPath = chordDiagram
        .append("g")
        .selectAll(".group-arc")
        .data(computedGroups())
        .join("g")

        .call(g => g.append("path")
            .attr("d", arc) 
            .attr("fill", "blue")//d=> isRegion(names[d.index]) ? getRegionColor(names[d.index]) :colorCountries)
            .attr("stroke", "yellow")
            .attr("stroke-width", "3.4px")
            
        )
    groupPath
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
            console.log(d)
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
            return function (t) {
            // console.log(arc(i(t)))

                return arc(i(t)); };
        })
    groupPath.call(g => g.append("title")
        .text(d => {
            return `${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
        }))
    groupPath.exit().remove() */

    // open regions
    groupPath
        /* .filter(function(d) {
            return d.id === d.region;
        }) */
        .on("click", function (evt, d) {
            config.region = names[d.index]
            
            // draw new chart 
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)
                draw(data,config)})
        })

    
        // .on('click', function(d) {
        //     if (countries.length + 1 > config.maxRegionsOpen) {
        //     countries.shift();
        //     }
        //     draw(year, countries.concat(d.id));
        // });

    // close regions
   /*  groupPath
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(d) {
            countries.splice(countries.indexOf(d.region), 1);
            draw(year, countries);
        });
    groupPath.on("mousemove", Tooltip)
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
        return function (t) { return arc(i(t)); };
        }) */
    // groupPath
    //     .style("fill", colorRegions)
        
    

    // /* // text label group
    // var groupTextGroup = chordDiagram.selectAll('.label')
    //     .data(computedChords, function(d) { return d.id; });
    // groupTextGroup.enter()
    //     .append("g")
    //     .attr('class', 'label');
    // groupTextGroup
    //     .filter(function(d) {return d.id !== d.region})
    //     .transition()
    //     .duration(config.animationDuration)
    //     .attrTween("transform", function(d) {
    //       var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
    //       return function (t) {
    //         var t = labelPosition(i(t).angle);
    //         return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
    //       };
    //     });
    // groupTextGroup.exit()
    //     .transition()
    //     .duration(config.animationDuration)
    //     .style('opacity', 0)
    //     .attrTween("transform", function(d) {
    //       // do not animate region labels
    //       if (d.id === d.region) {
    //         return;
    //       }

    //       var region = layout.groups().filter(function(g) { return g.id === d.region });
    //       region = region && region[0];
    //       var angle = region && (region.startAngle + (region.endAngle - region.startAngle) / 2);
    //       angle = angle || 0;
    //       var i = d3.interpolate(d, { angle: angle });
    //       return function (t) {
    //         var t = labelPosition(i(t).angle);
    //         return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
    //       };
    //     })
    //     .each('end', function() {
    //       d3.select(this).remove();
    //     });

    //   // labels
    // var groupText = groupTextGroup.selectAll('text')
    //     .data(function(d) { return [d]; });
    // groupText.enter()
    //     .append("text")
    // groupText
    //     .classed('region', function(d) {
    //       return d.id === d.region;
    //     })
    //     .text(function(d) { 
    //       if (d.id !== d.region) {
    //         return data.names[d.id];
    //       } 
    //     })
    //     .attr('transform', function(d) {
    //       if (d.id !== d.region) {
    //         return d.angle > Math.PI ? 'translate(0, -4) rotate(180)' : 'translate(0, 4)';
    //       }
    //     })
    //     .attr('text-anchor', function(d) {
    //       return d.id === d.region ?
    //         'middle' :
    //         (d.angle > Math.PI ? 'end' : 'start');
    //     })
    //     .style('fill', function(d) {
    //       return d.id === d.region ? arcColor(d) : null;
    //     })
    //     .classed('fade', function(d) {
    //       // hide labels for countries with little migrations
    //       return d.value < config.layout.labelThreshold;
    //     });

    //   // path for text-on-path
    // var groupTextPathPath = group
    //     .filter(function(d) {return d.id === d.region})
    //     .selectAll('.group-textpath-arc')
    //     .data(function(d) { return [d]; });
    // groupTextPathPath.enter()
    //     .append('path')
    //     .attr("class", "group-textpath-arc")
    //     .attr("id", function(d, i, k) { return "group-textpath-arc" + d.id; });
    // groupTextPathPath
    //     .style("fill", 'none')
    //     .transition()
    //     .duration(config.animationDuration)
    //     .attrTween("d", function(d) {
    //       var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
    //       if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
    //         return function (t) {
    //           return textPathArc2(i(t)); 
    //         };
    //       } else {
    //         return function (t) {
    //           return textPathArc(i(t)); 
    //         };
    //       }
    //     });
    // groupTextPathPath.exit().remove();

    //   // text on path
    // var groupTextPath = groupText
    //     .filter(function(d) {return d.id === d.region})
    //     .selectAll('textPath')
    //     .data(function(d) { return [d]; });
    // groupTextPath
    //     .enter()
    //     .append("textPath")
    // groupTextPath
    //     .text(function(d) { return data.names[d.id]; })
    //     .attr('startOffset', function(d) {
    //       if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
    //         return '55%';
    //       } else {
    //         return '25%';
    //       }
    //     })
    //     .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; }); */
    let chords = chordDiagram.append("g")
        .attr("fill-opacity", 0.75)
        .selectAll("g")
        // .data(chord(matrix))
        
        .data(computedChords().filter((d,i)=>d.target.endAngle-d.target.startAngle > .007 ))
        // .data(chord(matrix).filter((d,i)=>d.target.endAngle-d.target.startAngle > .007 ))
        // .filter(d=> console.lo)
        .join("path")
        .attr("class", "path-item")

        .attr("d", ribbon)
        .attr("fill", d=> isRegion(names[d.source.index]) ? getRegionColor(names[d.source.index]) :colorCountries)
        .style("mix-blend-mode", "multiply")
        
        .append("title")
        .text(d => `${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`);
    
    
        

      
    
    
    
    // // .data(chord(matrix).filter((d,i)=>d.target.endAngle-d.target.startAngle > .007 ))
    chords.enter()
        .append("path")
        .attr("fill", "lightgrey")
        /* .attr("stroke", "navy")
        .attr("stroke-width", "3.4px") */
        .transition()
        .duration(2000)
        .attrTween("d", function(d) {

            var p = previous.chords[d.source.id] && previous.chords[d.source.id][d.target.id];
            p = p || (previous.chords[d.source.region] && previous.chords[d.source.region][d.target.region]);
            p = p || meltPreviousChord(d);
            p = p || initialAngle;
            var i = d3.interpolate(p, d);

            return function (t) {
                return chordGenerator(i(t));
            };
        })
    // chords.classed("unselected", expandRegion.length ? function(d) {
    //     return !inAnyRange(d, expandRegion);
    //   } : false)

    //   d3.select(window).on('resize.svg-resize')()
        
        // .attr("d", ribbon)
        // // .attr("fill", isRegion(names[d.index]) ? getRegionColor(names[d.index]) :colorCountries)
        // // .attr("fill",  d=> isRegion(names[d.source.index]) ? colorRegions :colorCountries)
        // .style("mix-blend-mode", "multiply")
        // .attr("class", "chord")
    

    chords.append("title")
        .text(d => `${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`);
        // Add outter arcs for each region and its titles
        
    // arcs = chordDiagram.append("g")        
    //     .selectAll("g")
    //     .data(chord(matrix).groups)
    //     .join("g")
    //     .attr("class","chord")
    //     .call(g => g.append("path")
    //         .attr("d", arc) 
    //         .attr("fill", d=> isRegion(names[d.index]) ? getRegionColor(names[d.index]) :colorCountries)
    //         .attr("stroke", "#fff")
    //         .attr("stroke-width", "3.4px")

    //         )
            
    
    // // LABELS 
    // labels = arcs.call(g=>{ // 
    //     // on specific attributes we use isRegion() to define country/region labels
    //     g.append('text')
    //         .attr("font-size", d=> !isRegion(names[d.index]) ? 7 : 7.6 )
    //         // .attr("fill", d => color(names[d.index]))
    //         .attr("dy", d=> !isRegion(names[d.index]) ? 2 : -6 )
    //         .each(d => !isRegion(names[d.index]) 
    //             ? (d.angle = (d.startAngle + d.endAngle) / 2)
    //             :""
    //             ) 
    //         // Hide labels for low values
    //         // .style("visibility", d=> d.endAngle-d.startAngle< 0.015 ?"hidden":"")// ? "hidden" : "" ) 
    //         .attr("transform", d => `
    //             rotate(${(d.angle * 180 / Math.PI - 90)})
    //             translate(${outerRadius + 5})
    //             ${d.angle > Math.PI ? "rotate(180)" : ""}
    //             `)
    //         .text(d => !isRegion(names[d.index])  
    //             ?  (d.angle > Math.PI
    //                 ? names[d.index]+ " "+ flag(names[d.index])
    //                 :  flag(names[d.index])+ " "+  names[d.index]
    //             )
    //             :"")  // conditional style && flag disposition for countries
            
    //         // .text(d => !isRegion(names[d.index])?flag(names[d.index]) +" "+ names[d.index] : "") // conditional style for countries
    //         // .append('text')
    //         .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
    //         .append("textPath")
    //         .attr("fill", d => getRegionColor(names[d.index]))
    //         .style("text-anchor","middle")
    //         .style("text-align","center")
    //         .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; })
    //         .attr("xlink:href", "#"+textId)
    //         .text(d => isRegion(names[d.index])?names[d.index]:"") // conditional style for regions
    //         .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
    //         // .text(d => isRegion(names[d.index])?`${names[d.index].split(" ")[0]}${names[d.index].split(" ")[1]}`:"") // conditional style for regions
    //     })
        
       
    // /* function wrapText(text, width) {
    //     text.each(function () {
    //         var textEl = d3.select(this),
    //             words = textEl.text().split(/\s+/).reverse(),
    //             word,
    //             line = [],
    //             linenumber = 0.1,
    //             lineHeight = 2.5, // ems
    //             y = textEl.attr('y'),
    //             dx = parseFloat(textEl.attr('dx') || 0), 
    //             dy = parseFloat(textEl.attr('dy') || -1.5),
    //             tspan = textEl.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

    //         while (word = words.pop()) {
    //             line.push(word);
    //             tspan.text(line.join(' '));
    //             if (tspan.node().getComputedTextLength() > width) {
    //                 line.pop();
    //                 tspan.text(line.join(' '));
    //                 line = [word];
    //                 tspan = textEl.append('tspan').attr('x', 0).attr('y', y).attr('dx', dx).attr('dy', ++linenumber * lineHeight + dy + 'em').text(word);
    //             }
    //         }
    //     });
    // } */

    // labels.call(g => g.append("title")
    //     .text(d => {
    //         return `${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
    //     }))
  /*   function wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")) || 0,
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
            }
        });
        } */
    // d3.select("#table").append("table").html(table)
    const tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "barchart-tooltip")
        .style("font-family", "'Work Sans', sans-serif")
        .style("position", "absolute")
        .style("z-index", "1")
        .style("visibility", "hidden")
        .style("padding", "10px")
        .style("background", "rgba(0,0,0,0.6)")
        // .style("font-size", "16px")
        .style("width", "150px")
        .style("border-radius", "4px")
        .style("color", "#fff")
        
    
    var Tooltip = (evt,d)=> {
        // let tooltipWidth = tooltip.node().offsetWidth;
        //     // console.log(d===undefined);
        // let tooltipHeight = tooltip.node().offsetHeight;

        // tooltip
        //     .style("left", evt.pageX - tooltipWidth / 2 + "px")
        //     .style("top", evt.pageY - tooltipHeight - 10 + "px")
            
        //     .style("visibility","visible")
        //     // .style("opacity", 0.3)
        //     // .selectAll("title").html(d[0])
            
        //     .html( !isRegion(names[d.index])
        //                 ?`${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`
        //                 : `${names[d.source.region]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
        //                 )                    
        //         /* .html(`
        //             ${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people
        //             <br> 
        //             <table>
        //             <tbody>
        //                 <tr>
        //                     <td></td>
        //                     <td><b> Patient </b></td>
        //                     <td><b>Donor </b></td>
        //                 </tr>
        //                 <tr>
        //                     <td><b>🚻 Gender</b></td>
        //                     <td>${d.gender === "M" ? "Male" : "Female"}</td>
        //                     <td>${d.donor_gender === "M" ? "Male" : "Female"}</td>
        //                 </tr>
        //                 <tr>
        //                     <td><b>🩸 Blood type </b></td>
        //                     <td>${d.bloodType}</td>
        //                     <td>${d.donor_bloodType}</td>
        //                 </tr>
        //             </tbody>
        //         </table>`
        //         ); */
    }

    
    // INTERACTIONS
    // chordDiagram.selectAll(".path-item")
    // .on("mouseover", mouseover)
    // .on("mousemove", mousemove)
    // .on("mouseleave", mouseleave)
    chordDiagram.selectAll(".path-item, .chord")
        .on("mouseover", function (evt, d) {
            // console.log(evt)
            chordDiagram.selectAll(".path-item")
                .transition()
                .style("opacity", 0.2);
            
            d3.select(this)
                .transition()
                .style("opacity", 1)
            Tooltip(evt,d)
            
        })
        .on("mousemove", function (e,d) {
            Tooltip(e,d)
        })
            

        .on("mouseout", function (evt, d) {
            chordDiagram.selectAll(".path-item")
                .transition()
                .duration(700)
                .style("opacity", 1);
            
            tooltip
                .transition()
                .duration(1000)
                .style("visibility",evt !== 0 ? "hidden":"visible")
            //     .style("opacity", 0.3)
            })  


    chordDiagram.selectAll(".chord")            
        .on("click", function (evt, d) {

            config.region = names[d.index]
            // console.log(region)
            // print selected criteria on console
            // console.log(names)
            
            // remove current content
            d3.selectAll("g")
               /*  .transition()
                .duration(1500) */
                .style('opacity',0)
                // .remove()

            // d3.selectAll("table").remove()
            // d3.selectAll("#sankey").remove()
             
            // draw new chart 
            getData(filename).then(data=> {
                // data = data
                // console.log("fILE!",data)

                draw(data,config)})
        });   

    d3.selectAll("#selectYear")
        .on("change", function(d) {
            console.log(d === undefined? "SI":"NO")
            // Get selected year
            config.year = d3.select(this).property("value")
            console.log(config.year)
            // data = filterYear(raw,year)
            
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
            
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
            // drawSankey(config)
        })        
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            // Get selected year
            config.stockflow = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)

            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
        
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
    })    
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            // Get selected year
        config.method = d3.select(this).property("value")

        filename = fileName(config).json
        console.log(filename)

        // data = filterYear(raw,year)
        
        // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
        // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
        // Remove previous
        d3.selectAll("g")
            .transition()
            .duration(500)
            .style('opacity', 0)
            .remove();
        
    

        getData(filename).then(data=> {
            data = data
            // console.log("fILE!",data)

            draw(data,config)})
        // drawSankey(config)
    })    
        
    d3.selectAll("#selectGender")
        .on("change", function(d) {
            // Get selected value
            config.sex = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(1500)
                .style('opacity', 0)
                .remove();
            

            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",filename)
                console.log("CONFIG",config)

                draw(data,config)})
        // drawSankey(config)
    })
    
    d3.selectAll("#selectType")
        .on("change", function(d) {
            // Get selected value
            config.type = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)
            
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(1500)
                .style('opacity', 0)
                .remove();
            


            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)
        })
    })
}

// const element = d3.select("#chord-chart")
//     .append("svg")
//     .attr("viewBox", [-width / 2, -height / 2, width, height]);