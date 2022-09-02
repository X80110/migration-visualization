//  INITIAL PARAMETERS
var width = 800;
var height = width-50;
const textId = "O-text-1"; 

let regionIndex = 1        

let threshold = []
let regionColors = []

// ##########################################################
// Functions and initial config
config.year = 1990 || ""
config.stockflow = config.stockflow
config.sex 
config.type 
config.regions = []
config.maxRegionsOpen = 2 // config.regions = region || config.regions
function filterYear(input,year){ 

    year = +year || 1990
    nodes = input
    const selectedMatrix  = nodes.matrix[year]
    let names = nodes.names
        
    let result = { matrix: selectedMatrix, names: names,  regions: nodes.regions};
    return result;
}

/* d3.select("#selectMethod")
                .selectAll('myOptions')
                .data(allMethods)
                .enter()
                .append('option')
                .text(d=>{ return d; })    // text showed in the menu dropdown
                .attr("value",d=> { return d; })  */
              
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

d3.select("#selectMethod")
                .selectAll('myOptions')
                .data(allMethods)
                .enter()
                .append('option')
                .text(d=>{ return d; })    // text showed in the menu dropdown
                .attr("value",d=> { return d; }) 

// ##########################################################
//  DATA PREPARE
function dataPrepare(input, config){
    /* console.log(input) */
    var input_data = {...input}
    
    /* console.log(input_data) */
    meta = input_data.metadata 
    threshold = input_data.raw_data.threshold
    colors = input_data.raw_data.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE']
    flags = meta.map(d=>{return { [d.origin_name]:d.origin_flag }})
    input = input_data.raw_data    
    /* console.log(input) */
    year = +config.year
    sex = config.sex
    var data = filterYear(input,year)   
    
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names,data) {

        const index = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
            return matrix;
    }
    // Assign region to each index
    const getRegion = (index) => {
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
    const isRegion = (name) => {
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
        let unfilteredNL = {...nldata}
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
        return{ names: names, matrix: filteredMatrix, regions: regions, nldata: finalData, total_flows: total_flows, unfilteredNL: unfilteredNL}
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
    let unfilteredNL = {...filteredMatrix(data,year).unfilteredNL}    
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
    let source = expandRegion(data,config.source).indexList
    let target = expandRegion(data,config.target).indexList
    let sankey_layout = {source:source,target:target}
    console.log(sankey_layout)

    let mergeFilter = () =>  {
        let together = last_selected.concat(first_selected)
        let unique = [...new Set(together)]
        let ids = config.regions.map(d=>{return getMeta(d).id}) // remove values for regions expaned
        let unique_id = unique.filter(d=> !ids.includes(d))
        let sort = unique_id.sort(function(a, b){return a-b}) // 
        return sort
    } 
    
    let filteredLayout = mergeFilter()    

    console.log(filteredLayout)
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
    let nodes = []
    names.map(d=>{
        let item ={name: d, id: getMeta(d).id}
        nodes.push(item)
    })
    /* nodes = nodes.concat(nodes) */
    let nldata = {nodes:nodes,links: dataSliced.nldata.filter(d=> names.includes(d.source) && names.includes(d.target))}

    function setSelectors() {
        // YEAR SELECTOR 
        /* let input_data = input */
        const allYears = [...new Set(Object.keys(input_data.raw_data.matrix))]
        const lastYearPlusFive = (+allYears[allYears.length-1]+5).toString()
        /* console.log(lastYearPlusFive) */
        let allRangeYears = allYears.concat(lastYearPlusFive)
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
    console.log(result)
    return {result,total_flows, nldata}
}
