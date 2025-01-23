//  INITIAL PARAMETERS
var width = 800;
var height = width - 50;
const textId = "O-text-1";
let regionIndex = 1
let ranking = 10000
let regionColors = []

// #########################################################################################
// Util functions and initial config  ------------–––-----------------------------------–
/* console */
config.stockflow = config.stockflow
/* console.log(config.stockflow) */
if (config.stockflow === "flow") {
    // for flows
    config.year = 2015 || ""
} else {
    // for stcks
    config.year = 2020 || ""

}

config.sex
config.type
config.regions = []
config.maxRegionsOpen = 2 // config.regions = region || config.regions
config.threshold 
config.rankings

// build the data filename (json) with config values  ------------–––-------------------
let fileName = (configs) => {
    configs = {...config}
    console.log(configs)
    // build filename hierarchy
    let stockflow = config.stockflow
    sex = config.sex === "all" || "" ?
        "" :
        "_" + config.sex
    type = config.type + "_"
    method = stockflow === "stock" ?
        "" :
        "_" + config.method || "_da_pb_closed"
    let json = 'json/' + stockflow + '_' + sex + type + method + '.json'
    // clean non-lineal irregularities
    json = json.replace("__", "_").replace("_.", ".").replace("__", "_").replace("__", "_")
    // console.log( config.method, config.stockflow) 
    return {
        json: json,
        values: stockflow,
        sex,
        type,
        method,
        type: config.type
    }
}
let filename = fileName(config).json

// Method labels ------------–––------------------------------------------------------
let methods_indexed = ["sd_drop_neg", "sd_rev_neg", "mig_rate", "da_min_open", "da_min_closed", "da_pb_closed"]
let methods_labels_indexed = ["Stock Difference Drop Negative", "Stock Differencing Reverse Negative", "Migration Rates", "Open Demographic Accounting Minimisation", "Closed Demographic Accounting Minimisation", "Closed Demographic Accounting Pseudo-Bayesian"]

let methods = methods_indexed.map((d, i) => {
    id = d
    label = methods_labels_indexed[i]
    return {
        id,
        label
    }
})

if (allMethods.length < methods_indexed.length) { // Flows by type only has 3 methods, list only those id is specified
    methods = methods.filter(d => allMethods.includes(d.id)) // in the var allMethods in the .html and specify
}

d3.select("#selectMethod") // populate html
    .selectAll('myOptions')
    .data(methods)
    .enter()
    .append('option')
    .attr("value", d => d.id)
    .attr("label", d => d.label)
    .attr("selected", d => d.id === "da_pb_closed" ? "selected" : null) // 

// ranking labels ------------–––------------------------------------------------------
let ranking_labels_indexed = ["—", "50", "40", "35", "30", "20", "15"]

let rankings = ranking_labels_indexed.map((d, i) => {
    id = d
    label = ranking_labels_indexed[i]
    config.ranking = 10000
    return {
        id,
        label
    }
})

d3.select("#selectedRanking") // populate html
    .selectAll('myOptions')
    .data(rankings)
    .enter()
    .append('option')
    .attr("value", d => d.id)
    .attr("label", d => d.label)
    .attr("selected", d=> d.id === "da_pb_closed" ? "selected": null)   // 


// Get year data  ------------–––-----------------------------------–--------------------
function filterYear(input, year) {
    year = +year
    nodes = input
    // Total flows from file
    let total_inflow = Object.values(nodes.total_inflow[year])
    let total_outflow = Object.values(nodes.total_outflow[year])

    const selectedMatrix = nodes.matrix[year]
    let names = nodes.names
    let result = {
        matrix: selectedMatrix,
        names: names,
        regions: nodes.regions,
        total_outflow,
        total_inflow
    };
    return result;
}
// // Get allTime max Values  ------------–––-----------------------------------–--------------------
// function allTimeMax(input){
//     const allYears = [...new Set(Object.keys(input.matrix))]
//     const isRegion = (name) => {
//         return input.regions.includes(input.names.indexOf(name))
//     } 
//     const getRegion = (index) => {
//         var r = 0;
//         for (var i = 0; i < input.regions.length; i++) {
//             if (input.regions[i] > index) {
//                 break;
//             }
//             r = i;
//         }
//         return input.regions[r];
//     }
//     const  year_datasets = () =>{
//         // for each year process dataset flows
//         dataset_year = allYears.map((d,i) => {
//             let datasets = input.matrix[d]   //
//             let dataset = {[d]:datasets}
//             let year_dataset = dataset[d]
//             let countryNames = input.names
//             // GET SOURCE-TARGET STRUCTURE 
//             // Create array of name & connections objects
//             let matrix = countryNames.map((d,i)=> {
//                     let name = d
//                     let regionName = countryNames[getRegion(i)]
//                     let matrix = year_dataset.map(a=>a[i])
//                     return{ name:name,
//                             region: regionName,
//                             connections:matrix }
//             })
//             let nodes = matrix 
//             // Create object to push links during loop
//             let links = []
//             let l = 0 // <- iterator         
//             for (let j in matrix){
//                 let target_region = matrix[j].region    // <- include region why not
//                 let target = matrix[j].name
//                 // loop (into each 1st level array)
//                 for (let k in matrix[j].connections){
//                     let source = matrix[k].name
//                     let source_region = matrix[k].region    // <- include region why not
//                     let value = matrix[j].connections[k]
//                     links[l] = {source_region,source,target_region,target,value}
//                     l = l+1 
//                 }
//             }
//             // GRAPH STRUCTURE
//             let nldata = {nodes: nodes, links:links} 
//             let names = nldata.nodes.map(d=> d.name)
//             // COMPUTE OUTFLOWS, INFLOWS & TOTAL FLOWS FOR EACH YEAR
//             let country_totals = nldata.links.filter(d=> d.source_region != d.target && d.target_region != d.source && !isRegion(d.source) && !isRegion(d.target) ) // remove values for regions targeting countries
//             let country_outflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.source) 
//             let country_inflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.target) 
//             //--
//             let region_totals = nldata.links.filter(d=> isRegion(d.source) && isRegion(d.target))
//             let region_outflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.source) 
//             let region_inflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.target) 
//             //--
//             let outflows = region_outflows.concat(country_outflows)
//             let inflows = region_inflows.concat(country_inflows)
//             let total_flows = names.map(name=> {
//                 let outflow =  outflows.filter(d=> d[0].includes(name)).flat()[1]
//                 let inflow =  inflows.filter(d=> d[0].includes(name)).flat()[1]
//                 let total_flow = outflow + inflow
//                 {return total_flow}
//             })
//             return total_flows.flat()
//         })

//         //  Go through names (indexes) for each year and obtain max for each index
//         countryTotalFlows = input.names.map((name,id)=>{
//             countryTotalFlows = allYears.map((year,index)=> {
//                 year_dataset = dataset_year[index][id]                
//                 return year_dataset
//             })
//             let max = d3.max(countryTotalFlows)
//             return {[name]:max}
//         })
//         return countryTotalFlows
//     } 
//     allyear_totals = year_datasets()
//     return allyear_totals
// }



// #########################################################################################
// #########################################################################################
//  DATA PREPARE
function dataPrepare(input, config) {

    var input_data = {...input}
    meta = input_data.metadata
    threshold = /* input_data.raw_data.threshold || */ 10000 || +config.threshold
    ranking = /* input_data.raw_data.threshold || */ 10000 || +config.ranking
    colors = input_data.raw_data.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE']
    flags = meta.map(d => {
        return {
            [d.origin_name]: d.origin_flag
        }
    })
    input = input_data.raw_data
    year = +config.year
    sex = config.sex

    var data = filterYear(input, year)
    /* maxValues = allTimeMax(input) */
    /* console.log(maxValues) */
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names, data) {
        const index = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from(index, () => new Array(names.length).fill(0));
        for (const {
                source,
                target,
                value
            } of data) matrix[index.get(source)][index.get(target)] += value;
        return matrix;
    }
    // UTILS ----------------------------------------------------------------------
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

    // APPLY FILTERS ------------------------------------------------------------
    function filteredMatrix(input) {
        data = input
        const countryNames = data.names
        // GET SOURCE-TARGET STRUCTURE 
        // Create array of name & connections objects
        let matrix = data.names.map((d, i) => {
            let name = d
            let regionName = countryNames[getRegion(i)]
            let matrix = data.matrix.map(a => a[i])
            return {
                name: name,
                region: regionName,
                connections: matrix
            }
        })
        let nodes = matrix
        // Create object to push links during loop
        let links = []
        let l = 0 // <- iterator         
        for (let j in matrix) {
            let target_region = matrix[j].region // <- include region why not
            let target = matrix[j].name
            // loop (into each 1st level array)
            for (let k in matrix[j].connections) {
                let source = matrix[k].name
                let source_region = matrix[k].region // <- include region why not
                let value = matrix[j].connections[k]
                links[l] = {
                    source_region,
                    source,
                    target_region,
                    target,
                    value
                }
                l = l + 1
            }
        }
        // GRAPH STRUCTURE
        const nldata = {
            nodes: nodes,
            links: links
        }

        let unfilteredNL = {
            ...nldata
        }
        let names = nldata.nodes.map(d => d.name)

        // COMPUTE No. of CONNECTIONS FOR EACH
        let number_connections = []
        nldata.nodes.forEach((country,i) => { 
            let nonZeroConnections = country.connections.filter(connection => connection !== 0).length;
            number_connections[i] = {name: country.name, connections: nonZeroConnections}
            /* console.log(`${d.name} has ${nonZeroConnections} non-zero connections.`); */
        }); 

        // COMPUTE TOTAL FLOWS
        let total_flows = names.map((name, i) => {
            let outflow = data.total_outflow[i]
            let inflow = data.total_inflow[i]
            let total_flow = outflow - inflow
            let connections = number_connections.map(d=>d.connections)[i]
            let region_name = getMeta(name).region_name
            // let rank
            { return {
                    region_name,
                    name,
                    outflow,
                    inflow,
                    total_flow,
                    connections
                    // rank
                }
            }
        })

        // RANK COUNTRIES BY NET_FLOW
        // Get total_flows for each region, and sort them, append RANK value to original dataset
        function rankValues() {
            //Set regions to loop and rank country values within
            const uniqueRegions = [...new Set(total_flows.map(d => d.region_name))]
            const rankings = {}
            let regionCountries
            uniqueRegions
                .forEach((region, index) => {
                    regionCountries = total_flows
                        .filter(d => d.region_name === region && d.name !== region) // discard region values
                        .sort((a, b) => b.total_flow - a.total_flow) 
                        .map((d, i) => {
                            let name = d.name
                            let value = d.total_flow
                            let rank = i + 1
                            return {
                                region,
                                name,
                                value,
                                rank
                            }
                        })
                    rankings[index] = regionCountries
                })
            return regionCountries, rankings
        }
        const rankedValues = Object.values(rankValues()).flat()
        const ranked_data = names.map(name => {
            rank = rankedValues.filter(d => d.name === name)[0]
            rank = Object(rank).rank
            return rank
        })
        console.log(total_flows)
        
        total_flows.forEach((d, i) => {
            d.rank = ranked_data[i]
        })
        // console.log(config.ranking)


       /*  */
        // console.log(total_flows)

   /*      // FILTER BY TOP RANKING VALUES
        function filterSourceTarget(nldata, countryRank, ranking) {
            // Create a map for quick lookup of numbers by country name
            let rankMap = new Map();
            countryRank.forEach(item => rankMap.set(item.name, item.rank === undefined ? 1000 : item.rank));
            // console.log(rankMap)

            // Filter the source-target array
            return nldata.filter(pair =>
                rankMap.get(pair.target) < ranking && rankMap.get(pair.target) < ranking
            );
        } */



        let filteredData = nldata.links
            // .filter(d=>)

        // console.log(config.ranking)
    /*     let rankedCountries = filterSourceTarget(filteredData, total_flows,10000)
        filteredData = rankedCountries */
        
        /*  let filteredData = filterSourceTarget(nldata.links,total_flows,40) */
        // into both source & target
        /* .filter(d=> d.source_target > threshold )    */

        // FILTER BY THRESHOLD
        /* .filter(d=> d.value > threshold )    */

        // EXCLUDE NON-RECIPROCAL COUNTRIES
        // Generate new names array for both source-target to exclude non-reciprocal (0 to sth && sth to 0) relationships 
        let dataSelect = filteredData.filter(d => d.source_region != d.target && d.target_region != d.source) // remove values if flow targets source region
        function removeNullNames() {
            let names_source = Array.from(new Set(dataSelect.flatMap(d => d.source))); // <- be careful, this broke the country sorting by regions when d.target specified  
            let names_target = Array.from(new Set(dataSelect.flatMap(d => d.target)));

            function common(...arr) {
                return arr.reduce((first, second) => {
                    return first.filter(el => second.includes(el));
                })
            }
            let innerjoin = common(names_source, names_target)
            // Repeat filtering
            // --- beware that i.e: countryA targeted countryB and countryC targeted countryA, after deleting countryB, countryA now shows no outflow, but it is still accounted
            // filteredData = dataSelect.filter(d=> 
            //     innerjoin.includes(d.source) && innerjoin.includes(d.target)
            // )
            let sources = Array.from(new Set(filteredData.flatMap(d => d.source)))
            let targets = Array.from(new Set(filteredData.flatMap(d => d.target)))
            innerjoin = common(sources, targets)

            // reindex joined names
            let names_indexed = names.filter(d => innerjoin.includes(d))
            /* console.log(names.length, names_source.length, names_target.length, innerjoin.length) */
            return names_indexed
        }
        // Clean country list
        names = Array.from(new Set(removeNullNames()))
        
        // Filter by #selectedRanking top netflow values
        console.log(config.ranking)
        ranked_names = total_flows.filter(d=> isRegion(d.name) || d.rank < config.ranking).map(d=>d.name)
        names = names.filter(d=> 
                ranked_names.includes(d)
        )
        /* // Filter by limit #selectedConns 
        limited_connections_names = total_flows.filter(d=> isRegion(d.name) || d.connections < config.limitConns).map(d=>d.name)
        console.log(limited_connections_names)
        names = names.filter(d=> 
                limited_connections_names.includes(d)
        )
         */
        // Match filtered countries to other data
        // total_flows = total_flows.filter(d => names.includes(d.name))
        // SET OUTPUT DATA

        let finalData = filteredData.filter(d =>
            names.includes(d.source) && names.includes(d.target)
        )
        // Generate back the matrix with filtered values
        let filteredMatrix = getMatrix(names, finalData)

        // Reindex regions
        let regions = []
        names.map((d, i) => {
            if (isRegion(d)) {
                regions.push(i)
            }
        })
        console.log(names)
        return {
            names: names,
            matrix: filteredMatrix,
            regions: regions,
            nldata: finalData,
            total_flows: total_flows,
            unfilteredNL: unfilteredNL
        }
    }

    // DEFINE LAYOUT FOR SELECTED REGIONS
    // Expand countries under selected regions
    function expandRegion(input, region) {
        // here we'll find the region index -> we'll get following region -> finally we define a range between both index and replace them on selected region value
        const nameRegionIndex = input.names.indexOf(region) // index of selected region in names
        const regionIndex = input.regions.indexOf(nameRegionIndex) // index of selected region in regions
        const nextNameRegionIndex = input.regions[regionIndex] >= input.regions.slice(-1).pop() // if equal or higher than last element in regions
            ?
            input.names.length // return last index in names
            :
            input.regions[regionIndex + 1] // return next element in regions        
        // console.log(nameRegionIndex,nextNameRegionIndex)
        // get range between two values
        const range = (min, max) => Array.from({
            length: max - min + 1
        }, (a, i) => min + i); // computes
        let countryRange = range(nameRegionIndex + 1, nextNameRegionIndex - 1) // applies
        let indexList = new Array(input.regions).flat()
        // replace selected region on index and append its countries instead
        indexList[regionIndex] = countryRange
        return {
            indexList: indexList.flat(),
            countryRange
        }
    }
    // produce the filtered Matrix for a given a threshold value
    let dataSliced = filteredMatrix(data, year)

    data = dataSliced

    total_flows = dataSliced.total_flows


    function getMeta(name) {
        // get flag for a given country name
        const flag = (name) => {
            let flag = flags.filter(d => d[name])[0] ? flags.filter(d => d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(data.names.indexOf(name))
        const region_name = data.names[region]

        const id = data.names.indexOf(name)

        return {
            flag: flag(name),
            region,
            region_name,
            id
        }
    }
    // Produce layout by concatenating and sort all expaned regions and their countries indexes
    let last_selected = expandRegion(data, config.regions[1]).indexList
    let first_selected = expandRegion(data, config.regions[0]).indexList
    let target = last_selected.map(d => data.names[d])
    let source = first_selected.map(d => data.names[d])
    let sankey_layout = {
        source: source,
        target: target
    }

    let mergeFilter = () => {
        let together = last_selected.concat(first_selected)
        let unique = [...new Set(together)]
        let ids = config.regions.map(d => {
            return getMeta(d).id
        }) // remove values for regions expaned
        let unique_id = unique.filter(d => !ids.includes(d))
        let sort = unique_id.sort(function (a, b) {
            return a - b
        }) // 
        return sort
    }

    let filteredLayout = mergeFilter()

    // PREPARE SANKEY LAYOUT
    let sankey_names = [...new Set(sankey_layout.source.concat(sankey_layout.target))]
    let nodes = []
    sankey_names.map(d => {
        let item = {
            name: d,
            id: getMeta(d).id
        }
        nodes.push(item)
    })
    let selectedLinks = dataSliced.nldata
        .filter(d => sankey_names.includes(d.source) && sankey_names.includes(d.target))

    let nldata = {
        nodes: nodes,
        links: selectedLinks,
        sankey_layout
    }

    // PREPARE CHORD DATA
    let names = []
    let unfilteredMatrix = [] // this will gather the first level of selectedCountries + regions but having each a yet unfiltered array of values to match the matrix
    let matrix = [] // yeah, this is the final matrix 

    // Populate the filtered matrix and names in to the objects  
    function finalNamesMatrix() {
        filteredLayout.map(d => {
            let name = data.names[d]
            let subgroup = data.matrix[d]
            names.push(name)
            unfilteredMatrix.push(subgroup)
        })

        unfilteredMatrix.map(d => {
            let filtered = filteredLayout.map(a => d[a])
            matrix.push(filtered)
        })
        data = {
            names,
            matrix
        }
        return data
    }
    let result = finalNamesMatrix()


    function setSelectors() {
        // YEAR SELECTOR 
        let allYears = [...new Set(Object.keys(input_data.raw_data.matrix))]
        const lastYearPlusFive = (+allYears[allYears.length - 1] + 5).toString()

        /* config.year = allYears.reverse()[0] */
        //--
        let allRangeYears = allYears.concat(lastYearPlusFive)
        let sliderticks = document.getElementById("sliderticks");
        let slider = document.getElementById("selectYear");
        //--
        let sliderValue = parseInt(slider.value)

        function getTicks(year) {

            let ticks = allYears.map(col =>
                +col === +year ?
                `<p><b>${col}</b></p   >` :
                `<p>${col}</p   >`
            ).join("");
            sliderticks.innerHTML = ticks
        }
        slider.setAttribute("min", allYears[0]);
        slider.setAttribute("max", allYears[allYears.length - 1]);

        if (filename.includes("stock")) {
            function getTicks(year) {
                /* console.log(year) */
                let ticks = allYears.map(col =>
                    +col === +year ?
                    `<p><b>${col}</b></p   >` :
                    `<p>${col}</p   >`
                ).join("");
                sliderticks.innerHTML = ticks
            }
            getTicks(sliderValue)
            // Update the current slider value (each time you drag the slider handle)
            slider.oninput = function () {
                let value = parseInt(this.value)
                getTicks(value)
            }
        } else if (filename.includes("flow")) {
            function getTicks(year) {

                let ticks = allRangeYears.map(col =>
                    +col === +year || +col === +year + 5 ?
                    `<p><b>${col}</b></p   >` :
                    `<p>${col}</p   >`
                ).join("");
                sliderticks.innerHTML = ticks
            }
            getTicks(sliderValue)
            // Update the current slider value (each time you drag the slider handle)
            slider.oninput = function () {
                let value = parseInt(this.value)
                getTicks(value)
            }
        }
    }

    setSelectors()

    return {
        result,
        total_flows,
        nldata /* ,maxValues */
    }
}

// Create svg 
const chordDiagram = d3.select("#chord-chart")
    .append("svg")
    /* .attr('preserveAspectRatio', 'xMinYMid') */
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

/* let regionIndex = 1     */    
var innerRadius = Math.min(width, height) *0.35+10;
var outerRadius = innerRadius + 17;
var labelRadius = labelRadius || (outerRadius + 10);
var labelThreshold =  1;

// Configure d3 chord 
var chord = chord(true,false)
        .padAngle(0.02)
        .sortSubgroups(d3.descending)
// Utils: Format values
function formatValue(nStr, seperator) {
    seperator = seperator || ','
    nStr += ''
    x = nStr.split('.')
    x1 = x[0]
    x2 = x.length > 1 ? '.' + x[1] : ''
    var rgx = /(\d+)(\d{3})/
    //--
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + seperator + '$2');
    }
    return x1 + x2;
  }
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n
  };

// Utils: return label position for given angle
function labelPosition(angle) {
    var temp = angle.mod(2*Math.PI);
    return {
        x: Math.cos(temp - Math.PI / 2) * labelRadius,
        y: Math.sin(temp - Math.PI / 2) * labelRadius,
        r: angle > Math.PI ? (temp + Math.PI / 2) * 180 / Math.PI : (temp - Math.PI / 2) * 180 / Math.PI
      };
    }
    // ##########################################################
    //  DRAW   DRAW    DRAW   DRAW    DRAW   DRAW    DRAW   DRAW    DRAW
function drawChords(raw,config){
    allYears = Object.keys(raw.raw_data[0].matrix)
   

    // Get selected dataset
    /* console.log(config.max) */
    filename = fileName(config).json
    let file_index = files.indexOf(filename)
    let raw_data = raw.raw_data[file_index]
    let input = {raw_data: raw_data, metadata: raw.metadata}

    preparedData =  dataPrepare(input,config)
    /* let maxValues = dataPrepare(input,config).maxValues */

    let data = preparedData.result
    let total_flows = preparedData.total_flows
    input = input.raw_data                  // used for metadata
    

    let previous = config.previous || data  // used to interpolate between layouts
    var aLittleBit = Math.PI / 100000;
    config.initialAngle =  {};
    config.initialAngle.arc = { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

    rememberTheChords()
    rememberTheGroups() 

   /* console.log(chord(data.matrix)) */

    /* console.log(preparedData.maxValues) */
    // Define svg geometries
    var arc = d3.arc() 
        .innerRadius(innerRadius)
        /* .outerRadius(outerRadius) */
        
        .outerRadius(d=> isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius)
    var ribbon = d3.ribbonArrow()
        .sourceRadius(innerRadius)
        
          /*   .endAngle(d=> d.endAngle*0.05+0.1)
            .startAngle(d=> d.startAngle*0.05+0.1) */
        .targetRadius(innerRadius -5) 
        .headRadius(15)
    /* .radius(250) */

    
    
    // Get metadata given a source/target name
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
        const total_flow = outflow + inflow
        /* const allTimeMaxFlow = maxValues[id][name]
        const isMax = total_flow === allTimeMaxFlow ? true: false */
        return {flag: flag(name), region,region_name,id,outflow,inflow,total_flow/* ,allTimeMaxFlow, isMax */}
    }
    /* console.log(getMeta("Austria")) */
    
    // Get region index given a source/target name
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
    /* console.log(data.names.map(d=>getMeta(d))) */
    // Append variables to the processed data for d3 chord() data inputs
    function computedChords(data)  {        // data for each arrow
        let chords = chord(data.matrix).map(d=> {
            d.source.name = data.names[d.source.index]
            d.source.region = getMeta(d.source.name).region
            d.source.id = getMeta(d.source.name).id
            //-----
            d.target.name = data.names[d.target.index]
            d.target.region = getMeta(d.target.name).region
            d.target.id = getMeta(d.target.name).id
            //-----
            direction = d.source.id > d.target.id ? 'source' :'target'
            d.id = direction+`-`+d.source.id+`-`+d.target.id
            let result = {id:d.id, source: d.source, target:d.target}
            return result  
        })
        
        return chords
    }

    function computedGroups(data)  {            // data for each arc
        let groups = chord(data.matrix).groups
        groups.map(d=>{
            d.name = data.names[d.index]
            d.id = getMeta(data.names[d.index]).id
            d.region = getMeta(data.names[d.index]).region
            d.angle = (d.startAngle  + (d.endAngle - d.startAngle) / 2)
            })
    return groups
    } 

    // process last layout values (used for transitions)
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

    // Utils
    function getCountryRange(id) {
        var end = input.regions[input.regions.indexOf(id) + 1];
        return {
            start: id + 1,
            end: end ? end - 1 : input.names.length - 1
        };
    }

    function meltPreviousGroupArc(d) {
        if (d.id !== d.region) {return}
        var range = getCountryRange(d.id);
        var start = previous.groups[range.start];
        var end = previous.groups[range.end];
        if (!start || !end) {
             return 
        } return {
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
        /* .attr("class",d=>"group-"+d.id) */

    groups.append("path")
        .attr("class","group-arc")
        /* .attr("d", arc)  */
        .attr("id",d=>"group-" + d.id)
        .style("fill",d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity",/* d=> isRegion(d.name) && config.regions.length > 0 ? 0.1:  */0.80)
        .transition('group-arc')
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
        /* .attr("d", d3.arc()({ outerRadius:outerRadius, startAngle: 0, endAngle:   2 * Math.PI  })); */

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
        .style("opacity",d=> isRegion(d.source.name) && config.regions.length > 0 ? 0.1: 0.80)
        .transition('path-item')
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
        .transition('country-label')
        .duration(600)
        .attrTween("transform", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
            return function (t) {
                var t = labelPosition(i(t).angle);
                  return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
              };
        });
  
    var maxBarHeight = height / 2 - (70);
    var arcRegionLabel = d3.arc()
        .innerRadius(maxBarHeight)
        .outerRadius(maxBarHeight + 2)

    var regionText = groups.selectAll("path.region_label_arc")
        .data(computedGroups(data))
        .enter().append("path")
        .filter(d=> isRegion(d.name))
        .attr("id", (d,i) => {return  "region_label_" + i}) 
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

    groups.append("text")
        .attr("class", "region-label-text")
        .filter(d=> isRegion(d.name))
        .append("textPath")
        .attr("font-size",11)
        .attr("font-weight",600)
        .attr("fill", d => getRegionColor(d.name))
        .attr("xlink:href", function(d, i) {
            return "#region_label_" + i;
        })
        .text(d=> d.name)
        .transition('region-label-text')
        .duration(600)
        .call(wrapTextOnArc,maxBarHeight +40 /* / 2 - (70) */);

    // adjust dy (labels vertical start) based on number of lines (i.e. tspans)
    regionText.each((d,i)=> { 
        var textPath =d3.selectAll("textPath")["_groups"][0][i]
        tspanCount = textPath.childNodes.length;
        if (d.startAngle > Math.PI / 2 && d.startAngle < 3 * Math.PI / 2 && d.endAngle > Math.PI / 2 && d.endAngle < 3 * Math.PI / 2) {
            d3.select(textPath.childNodes[0]).attr("dy", .3 + (tspanCount - 1) * -0.6 + 'em');
        } else {
            d3.select(textPath.childNodes[0]).attr("dy", -.3 + (tspanCount - 1) * -0.6 + 'em');
        }
    })
    

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
            lineHeight = 1, 
            x = 0,
            y = 0,
            dy = 0,
            tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em"),
            arcLength = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * (2 * Math.PI * radius),
            paddedArcLength = arcLength +10;
            // textLength = getTextLength(tspan.text());
            
            // if(textLength > paddedArcLength+5 /* && line.length < 1 */) {
            //     d3.selectAll(this)
            //         .attr("style",d=>console.log(d))
            // }

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                textLength = getTextLength(tspan.text());
                tspan.attr("x", (arcLength - textLength) / 2);

                // if (line.length === 1 && word === "Oceania"){
                if (textLength > paddedArcLength && line.length === 1){
                    /* textLength = getTextLength(tspan.text()); */
                    /* tspan.attr("x", (arcLength - textLength) / 2); */

                    /* tspan = text.append("tspan").attr("dy", lineHeight + dy + "em").text(word); */
                    textLength = getTextLength(tspan.text());
                    console.log(tspan.text())
                    /* tspan.style("opacity",0) */
                }

                
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
        })
        // Fix specific labels 
        .filter(d=>d.name.includes("Ocea")).selectAll("tspan").attr("x",-4); 
    }
    const tooltip = d3.select('body').append('g')
        .attr('id', 'tooltip')
        .style('background-color','#ffffff')
        .style('padding','1em')
        .style('border-radius','4px')
        .style('position', 'absolute')
        .style('text-align', 'center')
        .style('visibility', 'hidden')
        .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')   
        
    function tooltipCountry(evt,d)  {
        var source = isRegion(data.names[d.source.index])
            ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        var target = isRegion(data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
        if(filename.includes('stock')){
            var value = ` <div> 
                        <b>${formatValue(d.source.value)}</b> 
                        <br>in<br> `
        } else {
            var value = ` <div> 
                        ▾<br>
                        <b>${formatValue(d.source.value)}</b> 
                        <br>  `
        }
        return tooltip
            .html(`\ <b>${source} </b> 
                        ${value} 
                        ${target}  `)
            .transition('tooltip')
            .duration(15)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY+20)+"px")
            .style("left", (evt.pageX+30)+"px")
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
                .html(`\ ${source} </br>
                        Total emigrants: <b> ${outflow}</b> </br>
                        Total immigrants: <b> ${inflow} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`\ ${source} </br>
                        Total Outflow: <b> ${outflow}</b> </br>
                        Total Inflow: <b> ${inflow} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
            }
    }

    // INTERACTIONS: Click
    config.maxRegionsOpen = 2 
    
    // Open regions
    groups.on('click', function(evt, d) {
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            config.regions.push(d.name) 
            d3.selectAll("g#tooltip")
                .remove()    
            update(raw,config)
        })
    /// CLOSE REGIONS
    groups
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(evt, d) {
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            
            d3.selectAll("g#tooltip")
                .remove()    
            update(raw,config)
        });

    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            config.previous = data 
            d3.selectAll("g#tooltip")
                        .remove()    
            update(raw,config)
        })
    
    // INTERACTIONS: Click
    config.maxRegionsOpen = 2 
    
    // Open regions
    groups.on('click', function(evt, d) {
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            config.regions.push(d.name) 
            d3.selectAll("g#tooltip")
                .remove()    
            update(raw,config)
        })
    /// CLOSE REGIONS
    groups
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(evt, d) {
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            
            d3.selectAll("g#tooltip")
                .remove()    
            update(raw,config)
        });

    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            config.previous = data 
            d3.selectAll("g#tooltip")
                        .remove()    
            update(raw,config)
        })
    
    // INTERACTIONS: Mouseover
    // chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
    chordDiagram.selectAll(".group-arc, .path-item")
            .on("mouseover", function (evt, d) {
                // console.log(d.id)
                if (config.regions < 1){
                    chords
                        // .selectAll(".path-item, .group-arc")
                        .selectAll(".path-item")
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    /* arcs.selectAll(".group-arc")
                    .style("opacity",d=> isRegion(d.name) ? 0.03: 0.80) */
                    d3.select(this)
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", 0.80)
                            
                }
                else{
                    chords
                        // .selectAll(".path-item, .group-arc")
                        .selectAll(".path-item")
                        .transition('hover')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    d3.select(this)
                        .transition('hover')
                        .duration(30)
                        .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
                    }
                }
            )
    chordDiagram.selectAll("g")
        .on("mouseout", function (evt, d) {        
            chords.selectAll(".path-item")
                .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.03: 0.80)
            /* groups.selectAll(".group-arc")
                .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80) */
            
        })  

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipCountry)
        .on("mouseout", function(){
                tooltip.style("visibility", "hidden");
        })

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipRegion)
        .on("mouseout", function(){
                 tooltip.style("visibility", "hidden");
        })
    // function mouseover() {
    //     chordDiagram.selectAll(".group-arc, .path-item, .region-label-text")
    //         .on("mouseover", function(evt,d){
    //             chords.selectAll(".path-item, .group-arc")
    //                         .transition('mouseover')
    //                         .duration(80)
    //                         .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //                     d3.select(this)
    //                         .transition('mouseover-this')
    //                         .duration(80)
    //                         .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         })
    //         //  .on("mouseover", function (evt, d) {
    //         //         // console.log(d.id)
    //         //         if (config.regions < 1){
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity", 0.80)
    //         //         }
    //         //         else{
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         //         }
    //         //     }
    //         // )
        groups
            .on("mouseover", function(evt,d) {
                d3.select(this).selectAll(".group-arc, .region-label-text")
                    .transition('mouseover')
                    .duration(10) 
                    .attr("d", arc.outerRadius(outerRadius))    
            })
            .on("mouseout", function(evt,d) {
                d3.selectAll(".group-arc, .region-label-text")
                    .transition("mouseout")
                    .duration(10)
                    .attr("d",  arc.outerRadius(d=>isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius))
            })
    // // INTERACTIONS: Mouseover
    // chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
 
    // function mouseover() {
    //     chordDiagram.selectAll(".group-arc, .path-item, .region-label-text")
    //         .on("mouseover", function(evt,d){
    //             chords.selectAll(".path-item, .group-arc")
    //                         .transition('mouseover')
    //                         .duration(80)
    //                         .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //                     d3.select(this)
    //                         .transition('mouseover-this')
    //                         .duration(80)
    //                         .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         })
    //         //  .on("mouseover", function (evt, d) {
    //         //         // console.log(d.id)
    //         //         if (config.regions < 1){
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity", 0.80)
    //         //         }
    //         //         else{
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         //         }
    //         //     }
    //         // )
    //     groups
    //         .on("mouseover", function(evt,d) {
    //             d3.select(this).selectAll(".group-arc, .region-label-text")
    //                 .transition('mouseout')
    //                 .duration(80) 
    //                 .attr("d", arc.outerRadius(outerRadius))    
    //         })
    // }   
        
    // function mouseout() {
    //     // chordDiagram.selectAll("g")
    //     chordDiagram
    //         .on("mouseout", function (evt, d) {        
                
    //             chords.selectAll(".path-item .group-arc")
    //                 .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.1: 0.80)
    //             groups.selectAll(".group-arc")
    //                 .transition("mouseout")
    //                 .duration(80)
    //                 .attr("d",  arc.outerRadius(d=>isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius))
    //     })  
    // }
    chordDiagram.selectAll(".path-item, .country-label-text")
        .on("mousemove", tooltipCountry)
        /* .on("mouseout", d=> tooltip.style("visibility", "hidden")) */

    chordDiagram.selectAll(".group-arc,  .region-label-text")
        .on("mousemove", tooltipRegion)
        /* .on("mouseout", d=> tooltip.style("visibility", "hidden")) */
    chordDiagram
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))
    
    d3.selectAll("#selectYear")
        .on("input", function(d) {
            config.previous = data 
            config.year = +d3.select(this).property("value")
            update(raw,config)
        })
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            config.previous = data 
            config.stockflow = d3.select(this).property("value")
            update(raw,config)
        })
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            config.previous = data 
            config.method = d3.select(this).property("value")
            update(raw,config)
        })
    d3.selectAll(".selectSex")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")
            update(raw,config)
        })
    d3.selectAll(".selectType")
        .on("change", function(d) {
            config.previous = data 
            config.type = d3.select(this).property("value")
            update(raw,config)
        })   
        d3.selectAll("#selectedRanking")
        .on("change", function(d) {
            config.previous = data 
            config.ranking = +d3.select(this).property("value")
            // console.log(config.ranking)
            update(raw,config)
})   
    /* d3.selectAll(".maxValues")
        .on("change", function(d) {
            config.previous = data 
            config.max = d3.select(this).property("value")
            
            update(raw,config)
        })    */
}


