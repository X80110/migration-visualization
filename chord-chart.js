let scope = {}
function chord() {
    function d3_functor(x) {
      return function() {
        return x;
      };
    }
    function d3_source(d) {
        return d.source;
      }
      // import "../core/target";
      function d3_target(d) {
        return d.target;
      }
      // import "../math/trigonometry";
      var π = Math.PI;
      // import "arc";
      var d3_svg_arcOffset = -π / 2;
      function d3_svg_arcStartAngle(d) {
        return d.startAngle;
      }
      function d3_svg_arcEndAngle(d) {
        return d.endAngle;
      }
      // import "svg";
    
      scope.chord = function(arrowRatio) {
        var source = d3_source,
            target = d3_target,
            radius = d3_svg_chordRadius,
            sourcePadding = d3_svg_chordSourcePadding,
            targetPadding = d3_svg_chordTargetPadding,
            startAngle = d3_svg_arcStartAngle,
            endAngle = d3_svg_arcEndAngle;
    
        function chord(d, i) {
          var s = subgroup(this, source, d, i),
              t = subgroup(this, target, d, i, true, 1 - arrowRatio);
    
    
          if (equals(s, t)) {
    
            // Previously :::
            // s.a1 = s.a1 - (s.a1 - s.a0) / 2;
            // s.p1 = [s.r * Math.cos(s.a1), s.r * Math.sin(s.a1)];
            //
            // t.a0 = t.a0 + (t.a1 - t.a0) / 2;
            // t.p0 = [t.r * Math.cos(t.a0), t.r * Math.sin(t.a0)];
    
            s.a0 = s.a1 + (s.a1 - s.a0) / 2;
            s.p0 = [s.r * Math.cos(s.a0), s.r * Math.sin(s.a0)];
    
            t.a1 = t.a0 - (t.a1 - t.a0) / 2;
            t.p1 = [t.r * Math.cos(t.a1), t.r * Math.sin(t.a1)];
            t.aMid=(t.a1-t.a0)/2+t.a0;
            t.pMid= [t.r * Math.cos(t.aMid), t.r * Math.sin(t.aMid)]; 
    
          }
    
          var ccp = cubic_control_points(s, t, s.r * 0.45);
    
          return "M" + s.p0
            + arc(s.r, s.p1, s.a1 - s.a0)
            + cubic_curve(ccp.cps1, ccp.cpt0, t.p0)
            + (arrowRatio === 0 ? arc(t.r, t.p1, t.a1 - t.a0) : arrow(t.pMid, t.p1))
            + cubic_curve(ccp.cpt1, ccp.cps0, s.p0)
            + "Z";
        }
    
        function cubic_control_points(s, t, factor) {
          cps0 = [factor * Math.cos(s.a0), factor * Math.sin(s.a0)];
          cps1 = [factor * Math.cos(s.a1), factor * Math.sin(s.a1)];
          cpt0 = [factor * Math.cos(t.a0), factor * Math.sin(t.a0)];
          cpt1 = [factor * Math.cos(t.a1), factor * Math.sin(t.a1)];
          return {
            cps0: cps0,
            cps1: cps1,
            cpt0: cpt0,
            cpt1: cpt1
          };
        }
    
        function subgroup(self, f, d, i, target, scale) {
    
          if(!scale) {
            scale =  1 ;
            /* scale =  0.15 ; */
          }
    
          var subgroup = f.call(self, d, i),
              r = radius.call(self, subgroup, i),
              a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset,
              a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
           aMid = (a1-a0)/2 + a0 ;
    
    
          if (target) {
            var d = targetPadding.call(self, subgroup, i) || 0;
            r = r - d;
          } else {
            var d = sourcePadding.call(self, subgroup, i) || 0;
            r = r - d;
          }
    
          return {
            r: r,
            a0: a0 ,
            a1: a1 ,
            p0: [r * scale * Math.cos(a0), r * scale * Math.sin(a0)],
            p1: [r * scale * Math.cos(a1), r * scale * Math.sin(a1)],
            pMid : [r * Math.cos(aMid), r * Math.sin(aMid)]
          };
        }
    
        function equals(a, b) {
          return a.a0 == b.a0 && a.a1 == b.a1;
        }
    
        function arc(r, p, a) {
          return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
        }
    
        function curve(r0, p0, r1, p1) {
          return "Q 0,0 " + p1;
        }
    
        function arrow(pMid, p1) {
            return "L" + pMid + "L" + p1 ;
        }
    
        function cubic_curve(cp0, cp1, p1) {
          return "C " + cp0 + " " + cp1 + " " + p1;
        }
    
        chord.radius = function(v) {
          if (!arguments.length) return radius;
          radius = d3_functor(v);
          return chord;
        };
    
        // null2
        chord.sourcePadding = function(v) {
          if (!arguments.length) return sourcePadding;
          sourcePadding = d3_functor(v);
          return chord;
        };
        chord.targetPadding = function(v) {
          if (!arguments.length) return targetPadding;
          targetPadding = d3_functor(v);
          return chord;
        };
    
        chord.source = function(v) {
          if (!arguments.length) return source;
          source = d3_functor(v);
          return chord;
        };
    
        chord.target = function(v) {
          if (!arguments.length) return target;
          target = d3_functor(v);
          return chord;
        };
    
        chord.startAngle = function(v) {
          if (!arguments.length) return startAngle;
          startAngle = d3_functor(v);
          return chord;
        };
    
        chord.endAngle = function(v) {
          if (!arguments.length) return endAngle;
          endAngle = d3_functor(v);
          return chord;
        };
    
        return chord;
      };
    
      function d3_svg_chordRadius(d) {
        return d.radius;
      }
      function d3_svg_chordTargetPadding(d) {
        return d.targetPadding;
      }
      function d3_svg_chordSourcePadding(d) {
        return d.sourcePadding;
      }
    }
chord()

// ##########################################################
//  INITIAL PARAMETERS
// ##########################################################
var width = 750;
var height = width;
const textId = "O-text-1"; 

let regionIndex = 1        

var innerRadius = Math.min(width, height) *0.49-90;
var outerRadius = innerRadius + 20;
var labelRadius = labelRadius || (outerRadius + 10);

let threshold = []
let regionColors = []

// Create svg 
const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

// Standard chord settings    
var chord = d3.chordDirected()
    .padAngle(0.035)
    .sortSubgroups(d3.ascending)
    .sortChords(d3.descending);

var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

/* var ribbon = d3.ribbonArrow()
    .radius(innerRadius)
    // .radius(innerRadius - 5)
    .headRadius(15)
    .padAngle(0);
    // .padAngle(1 / innerRadius);
 */
var ribbon = scope.chord(0.07) // how sharp the pointed edges should be
// more the value, more pointed...
    .radius(innerRadius )
    .sourcePadding(0) // can increase/decrease the spaces
    .targetPadding(8);  // between the chords and arcs here


// ##########################################################
// Functions and initial config
// ##########################################################
let config = {}
config.year = 1990 || ""
config.stockflow = "stock"
config.sex = "all" || ""
config.type = "" || "outward"
config.method = "da_pb_closed" || ""
config.regions = []

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


const getMetaData = async () => {
    const metadata = await d3.csv("data/country-metadata-flags.csv");

    return  metadata
}

function filterYear(input,year){ 
    year = year || 1990
    nodes = input
    const selectedMatrix  = nodes.matrix[year]
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
    console.log( config.method, config.stockflow)
    return {
         json:json,
         values: stockflow, sex, type, method,
         type: config.type
        }
}

let filename = fileName(config).json
console.log(filename)

// gets the data from files
async function getData(filename) {
    // console.log(filename)
    try {
        const data = d3.json(filename) 
        const metadata = d3.csv("data/country-metadata-flags.csv")
        return  {raw_data:await data, metadata: await metadata}
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
  
}

// RUN SELECTORS  (1st load the metadata into the environment)
getMetaData().then((meta)=>{ 
    getData(filename).then((raw)=>{ 
    // CREATE SELECTORS
        // YEAR SELECTOR 
        let input_data = raw
        let allYears = [...new Set(Object.keys(input_data.raw_data.matrix))]

        let slider = document.getElementById("selectYear");
        let output = document.getElementById("yearRange");
        let value = document.getElementById("value");
        let sliderValue = parseInt(slider.value)+5
        // output.innerHTML ='<span class="lighten">from </span>'+slider.value+'<p> </p> <span class="lighten"> to </span>'+sliderValue; // Display the default slider value
        output.innerHTML =slider.value+'<span class="lighten"> — </span>'+sliderValue; // Display the default slider value

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            let value = parseInt(this.value)+5
            output.innerHTML = this.value+'<span class="lighten"> — </span>'+value;
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
        d3.select("#selectSex")
            .selectAll('myOptions')
            .data(allSexes)
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

// ##########################################################
// ##########################################################
//  DATA PREPARE
// ##########################################################
// ##########################################################
function dataPrepare(input, config){
    meta = input.metadata 
    threshold = input.raw_data.threshold
    // console.log(threshold)
    colors = input.raw_data.colours
    flags = meta.map(d=>{return { [d.origin_name]:d.origin_flag }})
    
    year = config.year
    region = config.region
    sex = config.sex
    
    input = input.raw_data    
    let data = filterYear(input,year)   
    // console.log(region)
    // console.log(data)

    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names,data) {
        const index = new Map(names.map((name, i) => [name, i]));
        console.log(index)
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
            return matrix;
    }

    // FUNCTION ASSIGN REGION TO EACH COUNTRY INDEX  
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
    
    const countryNames = input.names
    function filteredMatrix(input){
        data = input
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
            let target_region = matrix[j].region    // <- include region why not
            let target = matrix[j].name
            // Run 2nd level loop (into each 1st level array)
            for (let k in matrix[j].connections){
                let source = matrix[k].name
                let source_region = matrix[k].region    // <- include region why not
                let value = matrix[j].connections[k]
                // if (value!== 0) {
                    links[l] = {source_region,source,target_region,target,value}
                    l = l+1 
                // }
            }
        }
        
        // GRAPH STRUCTURE
        let nldata = {nodes: nodes, links:links}       
             /* console.log(nldata.links.filter(d=>d.source === "North America" && d.target === "Latin America and the Caribbean")) */

        let names = nldata.nodes.map(d=> d.name)

        // Filter data by minimum value
        let filteredData = nldata.links
            .filter(d=> d.value > threshold )

            // This was used to drop proportional % of countries with lower values in each region
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
        
        filteredData = setThreshold.flat() */

        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        function removeNullNames(){
            let names_source = Array.from(new Set(filteredData.flatMap(d => d.source ))); // <- be careful, this broke the country sorting by regions when d.target specified  
            let names_target = Array.from(new Set(filteredData.flatMap(d => d.target ))); 
            let bothWayNames = names.filter(d=> names_target.includes(d) && names_source.includes(d))// && names_target.includes(d) ? d:"")//  && names_target.includes(d))
           /*  console.log(names.length, names_source.length, names_target.length, bothWayNames.length) */
            return bothWayNames
        } 
        names = removeNullNames()

        // let names = names_source // > names_target ? names_source : names_target
        
        // Filter countries without values in both directions (target <-> source)
        filteredData = filteredData.filter(d=> 
            names.includes(d.source) && names.includes(d.source)  
            && names.includes(d.target)
         /*    && d.source_region != d.target 
            && d.source != d.target_region  */
            
            )
        console.log(filteredData.filter(d=> d.target.includes("Croatia")))
        console.log(filteredData)
      
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

    // EXPAND COUNTRIES IN SELECTED REGION AND OUTPUT NEW MATRIX// ##########################################################
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
        
        let indexList = new Array(input.regions).flat()
        
        
        // replace selected region on index and append its countries instead
        indexList[regionIndex] = countryRange

        return {indexList:indexList.flat(),countryRange}
    }

    // produce the filtered Matrix for a given a threshold value
    let dataSliced = filteredMatrix(data,year)
    data = dataSliced
    // let allRegions = new Array(data.regions).flat()
        
/*     let metadata = {
        names: dataSliced.names,
        regions: dataSliced.regions,
        id: dataSliced.names.map((d,i)=>i)
    } */

    function getMeta(name) {
        // GET FLAG FOR A GIVEN COUNTRY NAME    // ##########################################################v
        let data = dataSliced
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(data.names.indexOf(name))
        
        const region_name = data.names[region]
        const id = data.names.indexOf(name)
        return {flag: flag(name), region,region_name,id}
    }

    // generate data structure to expand countries of a selected region
    // console.log(config.regions)
    let testFilter = expandRegion(data,config.regions[1]).indexList
    let filteredLayout = expandRegion(data,config.regions[0]).indexList
    // console.log("ALL!",allRegions)
    let mergeFilter = () =>  {
        let together = testFilter.concat(filteredLayout)
        let unique = [...new Set(together)]
        let ids = config.regions.map(d=>{return getMeta(d).id})
        let w_id = unique.filter(d=> !ids.includes(d))
        let sort = w_id.sort(function(a, b){return a-b})
        // let id1 = getMeta(config.regions[0]).id
        // let id2 = getMeta(config.regions[1]).id
        
        return sort
    
    } 
    // console.log(mergeFilter())

    filteredLayout = mergeFilter()
    // filteredLayout = mergeFilter()
    

    // console.log("AAAL",allRegions)
    // console.log(filteredLayout)


    let names = []
    let unfilteredMatrix = []       // this will gather the first level of selectedCountries + regions but having each a yet unfiltered array of values to match the matrix
    let matrix = []     // yeah, this is the final matrix 
    // Populate the filtered matrix and names in to the object  
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

        let regions =filteredLayout.map(d=> data.names[d])
        data = {names,matrix,regions:regions}
      
        return data
    }
    let result = finalNamesMatrix()
    return {result/* ,metadata */}
}

// ##########################################################
// ##########################################################
//  DRAW
// ##########################################################
// ##########################################################
function draw(input,config){
    // filteredMatrix    
    let data = dataPrepare(input,config).result
    
    // input layout to retrieve metadata (country <-index-> regions)
    input = input.raw_data
    
    // selectedMatrix = data.matrix
    selectedNames = data.names
    let previous = config.previous || data

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
    /* let a = getMeta("France")
    console.log(a, input.names) */

 
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

    // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
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
    // const colorRegions = ["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00","#5197ac"]
    
    // this gets the html color by the name of the regions (which is the var used creating the visuals)
    const getRegionColor = (name) => {
        a = input.regions.map((d)=> {
            return input.names[d]
        })
        b = a.indexOf(name)
        // console.log("COLORS!"/* ,colors[a] */,b)
        return colors[b]
    }

    
    // console.log(colors[0])
    // this gets the html color of the region selected by the user and decreases its opacity
    // const colorCountries = [colors[regionIndex]]
    const colorCountries = (name) => {
        /* console.log(getRegionColor("Europe")) */
        return getRegionColor(getMeta(name).region_name)
    }
    

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
        .style("fill",d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity", 0.75)
        /* .style("stroke", "#598cae")
        .style("stroke-width", "0.3px") */
        // .style("stroke-opacity", "1")
        
        .transition()
        .duration(500)
        .attrTween("d", function(d,j) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) /* || config.initialAngle.arc */, d);
            return function (t) {
                return arc(i(t))
            }
        })
    // arcs.append("title")
    //     .text(d => {
    //     return `${d.name} outflow ${formatValue(d3.sum(data.matrix[d.index]))} people and inflow ${formatValue(d3.sum(data.matrix, row => row[d.index]))} people`
    // })
    
    const countryLabels = arcs
        .filter(d=>!isRegion(d.name))
        .append("text")
        .attr("class","country-label")
        /* .merge(arcs) */
        .attr("font-size",7.6  )
        /* .attr("dy", 3 ) */
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
        // .merge(arcs)
        .append("text")
        .attr("class","region-label")
        .attr("font-size",10)
        
        // .attr("dy",-6)
        
        .append("textPath")
        
        .attr("fill", d => getRegionColor(d.name))
        .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
        
        .style("text-anchor","middle")
        .attr("xlink:href",d=>"#"+textId)
        .text(d =>d.name)
        
        .call(d=>// {
            // d.nodes().forEach(a=>{
            //     var length = a.getComputedTextLength()
            //     if ( length > 75) {
            //         console.log(a),
                    wrapText(d,75)
        //         }
        // })}
        )
        .selectAll("tspan")
        .transition()
        .duration(500)

   

    /* countryLabels.selectAll('.country-label').exit()
        .transition()
        .duration(87000)
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
        .attr("fill", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))
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
    
    // chords.selectAll(".path-item")
    //     .append("title")
    //     .text(d => `${data.names[d.source.index]} inflow ${data.names[d.target.index]} ${formatValue(d.source.value)}`)
   /*  chords.exit()
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
            // console.log(i)
            return function (t) {
                return ribbon(i(t))
            };
        })
        .each('end', function () {
            d3.selectAll(".ribbon").remove()
        });
        
     */

    function wrapText(text, width) {
        text.each(function (d) {
            /* console.log(d.name) */
            var textEl = d3.select(this),
                words = textEl.text().split(/\s+/).reverse(),
                word,
                line = [],
                linenumber = -2,
                lineHeight =-1.2, // ems
                y = textEl.attr('y'),
                dx = parseFloat(textEl.attr('dx') || 0), 
                dy = parseFloat(textEl.attr('dy') || -2.4),
                tspan = textEl.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy +'em')//.attr("class",'yay');

            while (word = words/* .reverse() */.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                

                if (tspan.node().getComputedTextLength() > width) {
                    d3.select(this.parentNode).attr("class", "wrapped")
                    line.pop();
                    tspan.text(line./* reverse(). */join(' '));
                    line = [word];
                    tspan = textEl.append('tspan').attr('x', 0).attr('y', y).attr('dx', dx).attr('dy', /* linenumber * lineHeight + dy + */1+ 'em').text(word);
                    // console.log(/* line,"$$", */words)
                }
            }
            d3.selectAll(this.parentNode).filter(d=> d.classed("wrapped",false)).attr("translate",-10)
        });
    }

//     function wrap(text, width) {
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
//         }
//     // d3.select("#table").append("table").html(table)

function tooltipCountry(evt,d)  {
    var source = isRegion(data.names[d.source.index])
        ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
        : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
    
    var target = isRegion(data.names[d.target.index] )
        ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
        : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
    

    var value = `
        <div> 
        <b>${formatValue(d.source.value)}</b> people to
        →
        `
    return tooltip
        .html(`\
        <b>${source} </b>
        ${value} 
        ${target}
        
        `)
        .style('background-color','#ffffff')
        .style('padding','1em')
        .style("top", (evt.pageY-10)+"px")
        .style("left", (evt.pageX+10)+"px")
        .style("visibility", "visible")
        .transition()
        
}

function tooltipRegion(evt,d) {

    let source = isRegion(d.name)
        ? `<span style="color:white"> <b>${d.name}</b></span>`
        : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
            <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`

    let outflow = /* d.index = */ formatValue(d3.sum(data.matrix[d.index]))
    let inflow = formatValue(d3.sum(data.matrix, row => row[d.index]))
    
    // console.log(filename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
    if (filename.includes('stock')){
        return tooltip
        .html(`\
        ${source} </br>
        Total emigrants  →  <b> ${outflow}</b> </br>
        Total immigrants  ← <b> ${inflow} </b>
        
        
        `)
        .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
        .style("top", (evt.pageY-10)+"px")
        .style("left", (evt.pageX+10)+"px")
        .style("visibility", "visible")
        .transition()       
    }
    else {
        return tooltip
        .html(`\
        ${source} </br>
        Total outflow  →  <b> ${outflow}</b> </br>
        Total inflow  ← <b> ${inflow} </b>
        
        
        `)
        .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
        .style("top", (evt.pageY-10)+"px")
        .style("left", (evt.pageX+10)+"px")
        .style("visibility", "visible")
        .transition()       

    }
    
}

const tooltip = d3.select('body').append('g')
    .attr('id', 'tooltip')
    .style('background-color','#ffffff')
    // .style('filter', 'blur(10px)') 
    // .style('-webkit-filter', 'blur(10px)') /* Safari 6.0 - 9.0 */    
    .style('padding','1em')
    .style('border-radius','4px')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    // .text('ege')
    // .style('box-shadow',' rgba(100, 100, 111, 0.2) 0px 7px 29px 0px')
    .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')
    
    


// INTERACTIONS
// open regions
config.maxRegionsOpen = 2 // config.regions = region || config.regions

arcs.on('click', function(evt, d) {
        
        if (config.regions.length + 1 > config.maxRegionsOpen) {
            config.regions.shift();       
        }
        config.regions.push(d.name) // console.log(d.name)
    })

// close regions
arcs
    .filter(function(d) {
        return d.id !== d.region;
    })
    .on('click', function(evt, d) {
        config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
    // console.log(config.regions)
});

chordDiagram.selectAll(".group-arc")
    .on("click", function (evt, d) {
                
        config.previous = data 

        
        // draw new chart 
        data = getData(filename).then(data=> {
            data = data

        // remove current content
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove()
            /* console.log("fILE!",data) */
            /* console.log("previous",data) */

            return draw(data,config)
        })
        
        /* // remove current content
        d3.selectAll("g")
            .transition()
            .duration(200)
            .remove() */

    })

/* chordDiagram.selectAll(".group-arc, .path-item")
    .on("mouseover", function (evt, d) {
        console.log(d.id)
        chordDiagram
            .selectAll(".path-item")
            .transition()
            .duration(200)
            .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id? 0.1:1)

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
        })  


 */
    chordDiagram.selectAll(".path-item")
        .on("mousemove", tooltipCountry)
        .on("mouseout", function(){
            return tooltip.style("visibility", "hidden");
        })
        
    chordDiagram.selectAll(".group-arc")
        .on("mousemove", tooltipRegion)
        .on("mouseout", function(){
            /* d3.select("#tooltip").style("visibility", "hidden") */
            return tooltip.style("visibility", "hidden");
        })
        


    d3.selectAll("#selectYear")
        .on("change", function(d) {
            config.previous = data 
            config.year = d3.select(this).property("value")

            // data = filterYear(raw,year)
          /*   
            // Remove previous
            d3.selectAll("g")
                .transition()
                .duration(200)
                .remove(); */
            
            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(200)
                    .remove();
                return draw(data,config)
            })

        })        
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            config.previous = data 
            config.stockflow = d3.select(this).property("value")

            filename = fileName(config).json
            // console.log(filename)
            
            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(200)
                    .remove();
                return draw(data,config)
            })

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
                
            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(200)
                    .remove();
                return draw(data,config)
            })
            
    })    
        
    d3.selectAll("#selectSex")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    

            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                   .transition()
                   .duration(200)
                   .remove();
                return draw(data,config)
            })

        // drawSankey(config)
    })
    
    d3.selectAll("#selectType")
        .on("change", function(d) {
            config.previous = data 
            config.type = d3.select(this).property("value")

            filename = fileName(config).json
            // console.log(filename)
            
            // data = getMatrix(names,input_data.filter(d=> d.year === selectedYear))
            // const dataFiltered = getMatrix(names,input_data.filter(d=> d.year === selectedOption))    
            
            


            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .transition()
                    .duration(200)
                    .remove();

               return draw(data,config)
            })
            
      
    })
}
