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
// ------------------------------------------------------------------------------------

var width = 650;
var height = width;
const textId = "O-text-1"; 

// Define
var innerRadius = Math.min(width, height) *0.5-95;
var outerRadius = innerRadius + 17.5;

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
    .radius(innerRadius - 10)
    .padAngle(1 / innerRadius);
var formatValue = (x) => `${x.toFixed(0).toLocaleString()}`;


const getMetaData = async () => {
    const metadata = await d3.csv("data/country-metadata-flags.csv");

    return  metadata
    }
function dataPrepare(input,year){ // <-- 'values' & 'sex' should be filtered there . 
    year = year || 1990
    
    // sex = sex || 'Female' || {}
    // method = year || 1990
    // let metadata = getMetaData().then(d=> {return d});
    // // console.log(metadata)
    nodes = input//JSON.parse(JSON.stringify(dataMatrix));

    selectedMatrix  = nodes.matrix[year]
    // console.log("INput!!",dataMatrix)
    names = nodes.names
    // dataMatrix.regions.map(d=>console.log(dataMatrix.names[d]))

    // ASSIGN REGION TO EACH COUNTRY   ---   THIS WILL BE USED TO SORT EACH AFTER FILTERING OVER A THRESHOLD 
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
    
    function getRegionName(name){
        let regionName = []
        for (let i in input.names){
            let region = getRegion(i)
            regionName.push(input.names[region])
        }
        return regionName
    }
    // let region = getRegion()
    // let regionName = dataMatrix.names[region]
    // console.log(regionName)

        // dataMatrix.regionNames[j] = 
        
    
    /* for (let i in regions) {
        return i

        }
     */
     /*    let region 
            dataMatrix.region = region = dataMatrix.regions[i]
            console.log(region)
        })}
        ) */
    // console.log("NAAAMEEES!!",names,regionNames)
    // remove connections
    
    
    let result = { matrix: selectedMatrix, names: names,regionNames: getRegionName(names), regions: nodes.regions};
    console.log(result)
    return result;
}

let config = {}
config.year = 1990 || ""
config.stockflow = "stock"
config.sex = "all" || ""
config.type = "" || "outward"
config.method = "da_pb_closed" || ""


let fileName = (config) => {
    stockflow = config.stockflow 
    sex = config.sex === "all" || ""  
        ? ""
        : "_"+config.sex
    type = config.type
    method = stockflow === "stock" 
        ? ""
        : "_"+config.method || "_da_pb_closed"
    let json = 'json/'+stockflow+sex+type+method+'.json'
    
    
    json = json.replace("__","_").replace("_.",".")
    // console.log(json)
     return {
         json:json,
         values: stockflow, sex, type, method,
         type: config.type
        }
    }
     
filename = fileName(config).json
// console.log(filename)

async function getData(filename) {
    try {
        // const raw_data = await d3.json("json/mig_flows"+selectedValue+".json") 
        // console.log(filename)
        const raw_data = await d3.json(filename) 
        return  raw_data
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
}




// RUN SELECTORS
getMetaData().then((meta)=>{ 
    getData(filename).then((raw)=>{ 
        
        
        // console.log(raw.names[])
        // CREATE SELECTORS
        // YEAR SELECTOR  // -    -    -    -    -    -    -    -    -    -    -    -    - 
        let slider = document.getElementById("selectYear");
        let output = document.getElementById("yearRange");
        let sliderValue = parseInt(slider.value)+5
        output.innerHTML =slider.value+"  –  "+sliderValue; // Display the default slider value

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            let value = parseInt(this.value)+5
            output.innerHTML = this.value+"  –  "+value;
        }

        d3.select("#selectMethod")
            .selectAll('myOptions')
            .data(allMethods)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
    
        d3.select("#selectGender")
            .selectAll('myOptions')
            .data(allGenders)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
        
        d3.select("#selectType")
            .selectAll('myOptions')
            .data(allTypes)
            .enter()
            .append('option')
            .text(d=>{ return d; })    // text showed in the menu dropdown
            .attr("value",d=> { return d; }) 
    
        //// CHART RENDERING
        // draw(raw,config)    
    });    
})
    
function draw(input,config){
    // console.log(input)
    year = config.year
    region = config.region
    sex = config.sex
    let data = dataPrepare(input,year)
    
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names,data) {
        const index = new Map(names.map((name, i) => [name, i]));
        // console.log(index)
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
            return matrix;
    }

    function filteredMatrix(input){
        data = input

        // GET SOURCE-TARGET STRUCTURE 
        // Create array of name & connections objects
        let matrix = data.names.map((d,i)=> {
                let name = d
                let regionName = data.regionNames[i]
                let matrix = data.matrix.map(a=>a[i])

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
                if (value!== 0) {
                    links[l] = {source_region,source,target_region,target,value}
                    l = l+1 
                }
            }
        }
        
        
        let nldata = {nodes: nodes, links:links}
        console.log(nldata)
        // Filter data
        // Generate new names excluding non available values
        let filteredData = nldata.links.filter(d=> d.value > 100000)
        

        filteredData.sort((a,b)=> (a.source_region.localeCompare(b.source_region)))// /* || a.value - b.value  */&& a.source - b.source));

        console.log(filteredData)
        

        let names = Array.from(new Set(filteredData.flatMap(d => [d.source, d.target])));
        let regionNames = Array.from(new Set(filteredData.flatMap(d => [d.source_region, d.target_region])));
        // console.log(getRegion.indexOf(names))
        
        // AT THIS POINT WE REQUIRE TO RE BY REGIONS
        // let resort = filteredData.sortSORT((a, b) => a..localeCompare(b.city) || b.price - a.price);
        // Generate back the matrix with filtered values
        
        let filteredMatrix = getMatrix(names,filteredData)
        // Reindex regions
        let regions = []
        names.map((d,i)=> {
            if (isRegion(d)){
                regions.push(i)
                 return d
            }
        })
        // console.log(regions.map(d=>names[d]))
        return{ names: names, matrix: filteredMatrix, regions: regions}
    }
    

    

    stockflow = stockflow
    let names = []
    let unfilteredMatrix = []
    let matrix = []

    let nameRegionIndex
    let regionIndex = 1
    let nextNameRegionIndex
    function filterByRegion(input, region) {
        // here we'll find the region index -> we'll get next region -> finally we define a range between both index and replace the values in region in the selected region place 
        nameRegionIndex = input.names.indexOf(region) // index of selected region in names
        regionIndex =  input.regions.indexOf(nameRegionIndex) // index of selected region in regions
        nextNameRegionIndex =  input.regions[regionIndex] >= input.regions.slice(-1).pop() // if equal or higher than last element in regions
                                     ? input.names.length // return last index iin names
                                     : input.regions[regionIndex+1] // return next element in regions        
        // console.log(nameRegionIndex,nextNameRegionIndex)
        
        // get range between two values
        const range = (min, max) => Array.from({ length: max - min + 1 }, (a, i) => min + i);
        
        let countryRange = range(nameRegionIndex+1,nextNameRegionIndex-1/* -1 */)

        var selectedRegions = input.regions.flat()
        // output regions and selected countries
        selectedRegions[regionIndex] = countryRange

        return selectedRegions.flat()
    }
    let dataSliced = filteredMatrix(data,year)
    // data = dataSliced
    let filteredRegions = filterByRegion(data,region)

    
    console.log(dataSliced)

    // INITIAL MATRIX ONLY REGIONS
    filteredRegions.map(d=> {
        let name = data.names[d]
        let subgroup = data.matrix[d]
        names.push(name)
        unfilteredMatrix.push(subgroup)
    })
    unfilteredMatrix.map(d=> {
        let filtered = filteredRegions.map(a=> d[a])
        matrix.push(filtered)    
    })
    // console.log(unfilteredMatrix)
    // console.log(names.map(d=> isRegion(d)))
    
    
    function isRegion(name) {
        return data.regions.includes(data.names.indexOf(name))
    } 
    // console.log(isRegion('Oceania'))
    // console.log(isRegion('Angola'))
    // console.log(isRegion(names[0])) 
    // console.log(isRegion(names[1])) 


    // Visualization settings
    // const colorScale = chroma.scale(['#e85151', '#51aae8', '#F0E754', '#55e851'])
    // const colorScale = chroma.scale(["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00"])
    //       .mode('hsl').colors(11)
    //       .map(color => chroma(color).saturate(0.1));

    // const color = d3.scaleOrdinal(names, colorScale)
    const colorRegions = ["#cd3d08", "#ec8f00", "#6dae29", "#683f92", "#b60275", "#2058a5", "#00a592", "#009d3c", "#378974", "#ffca00","#5197ac"]
    
    const colorCountries = colorRegions[regionIndex]
    var color = d3.scaleOrdinal(
        names,
        colorRegions);


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
        .attr("fill", d=> color(names[d.source.index]))
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
            .attr("fill", d=> isRegion(names[d.index]) ? /* console.log(names[d.index]) & */color(names[d.index]) :colorCountries)
            // On each <g> we set a <path> for the arc
            .attr("stroke", "#fff")
            .attr("stroke-width", 2))
    
        // LABELS 
        // on specific attributes we use isRegion() to define country/region labels
        .call(g=>{ // 
                g.append('text')
                .attr("font-size", d=> !isRegion(names[d.index]) ? 5.2 : 7.2 )
                // .attr("fill", d => color(names[d.index]))
                .attr("dy", d=> !isRegion(names[d.index]) ? 2 : -4 )
                .each(d => !isRegion(names[d.index]) ? (d.angle = (d.startAngle + d.endAngle) / 2):"") // conditional style for countries
                .attr("transform", d => `
                    rotate(${(d.angle * 180 / Math.PI - 90)})
                    translate(${outerRadius + 5})
                    ${d.angle > Math.PI ? "rotate(180)" : ""}
                    `)
                .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
                .text(d => !isRegion(names[d.index])? names[d.index] : "") // conditional style for countries
                .append("textPath")
                .attr("fill", d => color(names[d.index]))
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
            // data = dataPrepare(raw,year)
            
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
            // drawSankey(config)
        })    
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            // Get selected year
            config.method = d3.select(this).property("value")

            filename = fileName(config).json
            console.log(filename)

            // data = dataPrepare(raw,year)
            
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

                draw(data,config)})
            // drawSankey(config)
        })
    

        
        // //// SANKEY CHART 
        // function drawSankey(config){
        //     let graph = prepareData(config).sankey
        //     let names = Array.from(new Set(prepareData(config).chord.flatMap(d => [d.source, d.target])));
            
        //     const colorScale = chroma.scale(['#e85151', '#51aae8', '#F0E754', '#55e851'])
        //           .mode('hsl').colors(10)
        //           .map(color => chroma(color).saturate(0.01));
      
        //     const color = d3.scaleOrdinal(names, colorScale)
        //     // let color = d3.scaleOrdinal(
        //     //     names,
        //     //     ["#1f77b4", "#d62728", "#ff7f0e", "#2ca02c",  "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]);
        //     let sankey = d3.sankey()
        //         .nodeSort(null)
        //         .linkSort(null)
        //         .nodeWidth(4)
        //         .nodePadding(20)
        //         .extent([[0, 5], [width, height - 5]])
        //     const svg = d3.select("#sankey")
        //         .append("svg")
        //         .attr("viewBox", [0, 0, width, height]);
    
        //     const {nodes, links} = sankey({
        //         nodes: graph.nodes.map(d => Object.assign({}, d)),
        //         links: graph.links.map(d => Object.assign({}, d))
        //     });
    
        //     svg.append("g")
        //         .selectAll("rect")
        //         .data(nodes)
        //         .join("rect")
        //         .attr("x", d => d.x0)
        //         .attr("y", d => d.y0)
        //         .attr("height", d => d.y1 - d.y0)
        //         .attr("width", d => d.x1 - d.x0)
        //         .attr("fill", d => color(d.name))
        //         .append("title")
        //         .text(d => `${d.name}\n${d.value.toLocaleString()}`);
    
        //     svg.append("g")
        //         .attr("fill", "none")
        //         .selectAll("g")
        //         .data(links)
        //         .join("path")
        //         .attr("class","chord")
        //         .attr("d", d3.sankeyLinkHorizontal())
        //         .attr("stroke", d => color(d.names[0]))
        //         .attr("stroke-width", d => d.width)
        //         .attr("stroke-opacity", 0.7)
        //         .style("mix-blend-mode", "multiply")
        //         .append("title")
        //         .text(d => `${d.names.join(" → ")}\n${d.value.toLocaleString()}`);
    
        //     svg.append("g")
        //         .style("font", "18px")
        //         .selectAll("text")
        //         .data(nodes)
        //         .join("text")
        //         .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        //         .attr("y", d => (d.y1 + d.y0) / 2)
        //         .attr("dy", "0.35em")
        //         /* function(d) {
        //             if (d.name !== d.region) {
        //                 return d.angle > Math.PI ? 'translate(0, -4) rotate(180)' : 'translate(0, 4)';
        //             }
        //         }) */
        //         .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        //         .attr('transform', 'translate(0, -4) rotate(180)' )
        //         .text(d => d.name)
        //         .append("tspan")
        //         .attr("fill-opacity", 0.7)
        //         .text(d => ` ${d.value.toLocaleString()}`);
    
            
        
        //     svg.selectAll(".path-item, .chord")
        //         .on("mouseover", function (evt, d) {
        //             svg.selectAll(".path-item, .chord")
        //                 .transition()
        //                 .style("opacity", 0.2);
    
        //             d3.select(this)
        //                 .transition()
        //                 .style("opacity", 1)
        //             })       
    
        //         .on("mouseout", function (evt, d) {
        //             svg.selectAll(".path-item, .chord")
        //                 .transition()
        //                 .style("opacity", 1);
        //             })  
        //     return svg.node();
            
                
        // }
        // // drawSankey(selectedYear,selectedRegion,selectedValues,selectedGender)
    // print last active filters
    /* let activeRegion = selectedRegion === region ? '<span style="color: grey">Non selected</span>' : region
    d3.selectAll("#activeData")
        .html("<br>"+
        "<strong>Variable:</strong> "+stockflow+"<br>"+
        "<strong>Method:</strong> "+method+"<br>"+
        "<strong>Year:</strong> "+year+"<br>"+
        "<strong>Gender:</strong> "+sex+"<br>"+
        "<strong>Type:</strong> "+type+"<br>"+
        "<strong>Last region selected:</strong>  "+activeRegion) */
}

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



