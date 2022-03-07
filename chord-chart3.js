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
var width = 650;
var height = width;
const textId = "O-text-1"; 

var innerRadius = Math.min(width, height) *0.5-95;
var outerRadius = innerRadius + 17.5;

const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

var element = chordDiagram.append("g")
    .attr("id", "circle")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

// Standard chord settings    
var chord = d3.chordDirected()
    .padAngle(1 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);
var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
var ribbon = d3.ribbonArrow()
    .radius(innerRadius - 10)
    .padAngle(1 / innerRadius);
var formatValue = (x) => `${x.toFixed(0).toLocaleString()}`;

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
    // console.log(input)
    
    meta = input.metadata 
    input = input.raw_data
    
    year = config.year
    region = config.region
    sex = config.sex
    let data = filterYear(input,year)
    
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
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index) {
            break;
            }
            r = i;
        }
        return input.regions[r];
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
            }
        }
        
        // GATHER GRAPH DATA
        let nldata = {nodes: nodes, links:links}        // console.log(nldata)

        let names = nldata.nodes.map(d=> d.name)
        // Filter data by minimum value
        let filteredData = nldata.links.filter(d=> d.value > 10000 )
        // console.log(filteredData)
        // console.log(nldata.links.filter(d=> d.value > 10000 ))
        
        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        let names_source = Array.from(new Set(filteredData.flatMap(d => d.source ))); // <- be careful, this broke the country sorting by regions when d.target specified
        let names_target = Array.from(new Set(filteredData.flatMap(d => d.target ))); 
    
        // let names = names_source // > names_target ? names_source : names_target
        
        // Filter countries without values in both directions (target <-> source)
        let bothWayNames = names.filter(d=> names_source.includes(d) && names_target.includes(d))// && names_target.includes(d) ? d:"")//  && names_target.includes(d))
        console.log(bothWayNames)
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
        // console.log(filteredMatrix)
        
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
        names.map((d,i)=>  {
            if  (isRegion(d)){
                    // console.log(names)
            }
        })

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
    // console.log(data)
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
    // console.log(matrix)
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

    // Color settings
    const colorRegions = ["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00","#5197ac"]
    
    // this gets the html color by the name of the regions (which is the var used creating the visuals)
    const getRegionColor = (d) => colorRegions[input.regions.map((d)=> {return input.names[d]}).indexOf(d)]
    
    // this gets the html color of the region selected by the user and decreases its opacity
    const colorCountries = [colorRegions[regionIndex]+'60']
    
    // var color  = d3.scaleOrdinal(
    //     names,
    //     colorRegions);
    
    // console.log([colorCountries])
    // const color = d3.scaleOrdinal(names, colorScale)
    // used to get the color of each region
    // console.log(getRegionColor("Oceania"))
    // console.log(getRegionColor("Europe"))
    // console.log(getRegionColor("Sub-Saharan Africa"))

    chordDiagram.append("path")
        .attr("id", textId)
        .attr("fill", "none")
        .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle:   2 * Math.PI  }));
    
    // Add ribbons for each chord and its tooltip content <g> <path> <title>
    chords = chordDiagram.append("g")
        .attr("fill-opacity", 0.75)
        .selectAll("g")
        .data(chord(matrix))
        // .filter(d=> console.lo)
        .join("path")
        .attr("class", "path-item")
        .attr("d", ribbon)
        .attr("fill", d=> isRegion(names[d.source.index]) ? getRegionColor(names[d.source.index]) :colorCountries)
        .style("mix-blend-mode", "multiply")
        
        .append("title")
        .text(d => `${names[d.source.index]} inflow ${names[d.target.index]} ${formatValue(d.source.value)}`);
        // Add outter arcs for each region and its titles
        
    arcs = chordDiagram.append("g")        
        .selectAll("g")
        .data(chord(matrix).groups)
        .join("g")
        .attr("class","chord")
        .call(g => g.append("path")
            .attr("d", arc) 
            .attr("fill", d=> isRegion(names[d.index]) ? getRegionColor(names[d.index]) :colorCountries)
            )
            
    
        // LABELS 
        // on specific attributes we use isRegion() to define country/region labels
        .call(g=>{ // 
                g.append('text')
                .attr("font-size", d=> !isRegion(names[d.index]) ? 6 : 7.2 )
                // .attr("fill", d => color(names[d.index]))
                .attr("dy", d=> !isRegion(names[d.index]) ? 2 : -4 )
                .each(d => !isRegion(names[d.index]) 
                    ? (d.angle = (d.startAngle + d.endAngle) / 2)
                    :""
                    ) 
                .attr("transform", d => `
                    rotate(${(d.angle * 180 / Math.PI - 90)})
                    translate(${outerRadius + 5})
                    ${d.angle > Math.PI ? "rotate(180)" : ""}
                    `)
                .text(d => !isRegion(names[d.index])  
                    ?  (d.angle > Math.PI
                        ? names[d.index]+ " "+ flag(names[d.index])
                        :  flag(names[d.index])+ " "+  names[d.index]
                    )
                    :"")  // conditional style && flag disposition for countries
                
                // .text(d => !isRegion(names[d.index])?flag(names[d.index]) +" "+ names[d.index] : "") // conditional style for countries
                // .append('text')
                .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
                .append("textPath")
                .attr("fill", d => getRegionColor(names[d.index]))
                .attr("startOffset", d=> ((d.endAngle+d.startAngle)/2)*outerRadius)
                .style("text-anchor","middle")
                .attr("xlink:href", "#"+textId) 
                .text(d => isRegion(names[d.index])?names[d.index]:"") // conditional style for regions
            
        })
        // On each <g> we set a <title> for the region outflow
        .call(g => g.append("title")
            .text(d => {
                return `${names[d.index]} outflow ${formatValue(d3.sum(matrix[d.index]))} people and inflow ${formatValue(d3.sum(matrix, row => row[d.index]))} people`
        }))
    
    // d3.select("#table").append("table").html(table)
    
    // INTERACTIONS
    chordDiagram.selectAll(".path-item, .chord")
        .on("mouseover", function (evt, d) {
            // console.log(evt)
            chordDiagram.selectAll(".path-item")
                .transition()
                .style("opacity", 0.2);
            
            d3.select(this)
                .transition()
                .style("opacity", 1)
            })       

        .on("mouseout", function (evt, d) {
            chordDiagram.selectAll(".path-item")
                .transition()
                .style("opacity", 1);
            })  

    chordDiagram.selectAll(".chord")            
        .on("click", function (evt, d) {
            config.region = names[d.index]
            // console.log(region)
            // print selected criteria on console
            // console.log(names)
            
            // remove current content
            d3.selectAll("g")
                .transition()
                .duration(1500)
                .style('opacity',0)
                .remove()

            // d3.selectAll("table").remove()
            // d3.selectAll("#sankey").remove()
             
            // draw new chart 
            getData(filename).then(data=> {
                data = data
                // console.log("fILE!",data)

                draw(data,config)})
        });   

    d3.selectAll("#selectYear")
        .on("change", function(d) {
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
                console.log("fILE!",filename)
                console.log("CONFIG!",config)

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
