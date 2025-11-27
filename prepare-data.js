//  INITIAL PARAMETERS
var width = 800;
var height = width - 50;
let regionIndex = 1
let ranking = 500000
let regionColors = []

// #########################################################################################
// Util functions and initial config  ------------–––-----------------------------------–
config.stockflow = config.stockflow
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
//   Number.prototype.mod = function (n) {
//     return ((this % n) + n) % n
//   };

// // build the data filename (json) with config values  ------------–––-------------------
// var fileName = (configs) => { // Changed let to var for wider global scope
//     configs = {...config}
    
//     // build filename hierarchy
//     let stockflow = config.stockflow
//     year = config.year

//     sex2 = config.sex === "all" || "" ?
//         "" :
//         "/" + config.sex

//     method2 = /* stockflow === "stock" ?
//         "" :
//         "/" + */ config.method || "da_pb_closed"


//     let json = 'json/' + stockflow + sex2 + '/' + method2 + '/' + year + '.json'
//     let dataset_meta = 'json/' + stockflow + sex2 + '/' + method2 + '/dataset_meta.json'
    
//     // clean non-lineal irregularities
//     json = json.replace("__", "_").replace("_.", ".").replace("__", "_").replace("__", "_").replace("//","/")
//     dataset_meta = dataset_meta.replace("__", "_").replace("_.", ".").replace("__", "_").replace("__", "_").replace("//","/")

//     return {
//         json: json,
//         dataset_meta: dataset_meta,
//         values: stockflow,
//         sex: config.sex,
//         type: config.type,
//         method: config.method
//     }
// }
// let filename = fileName(config).json


/* const isRegion = (name_string) => {
    const nameIdx = input.names.indexOf(name_string);
    if (nameIdx === -1)
         return false;
    return input.regions.includes(nameIdx);
}; */
function createIsRegion(input) {
  // Extraiem els noms corresponents als índexs de regions
  const regionNames = new Set(input.regions.map(i => input.names[i]));

  return function(name) {
    return regionNames.has(name);
  };
}

function createRegionLookup(input) {
  const regionMap = new Map();
    
  for (let i = 0; i < input.regions.length; i++) {
    const regionIndex = input.regions[i];
    const regionName = input.names[regionIndex];

    // Determine where this region ends: before the next regionIndex or end of the array
    const end = (i + 1 < input.regions.length) ? input.regions[i + 1] : input.names.length;

    // Assign this region name to all indices from regionIndex to (end - 1)
    for (let j = regionIndex; j < end; j++) {
      regionMap.set(j, regionName);
    }
  }

  // Return a function that, given an index, returns the corresponding region name
  return function getRegionName(index) {
    return regionMap.get(index) || null;
  };
}

function createGetRegionColor(input, colours) {
  const regionNames = input.regions.map(i => input.names[i]);
  const colorPalette = colours || [
    '#40A4D8', '#35B8BD', '#7FC05E', '#D0C628',
    '#FDC32D', '#FBA127', '#F76F21', '#E5492D',
    '#C44977', '#8561D5', '#0C5BCE'
  ];

  return function getRegionColor(name) {
    const regionIndex = regionNames.indexOf(name);
    if (regionIndex === -1) {
      // fallback: return some default or null
      return colorPalette[0];
    }
    return colorPalette[regionIndex % colorPalette.length];
  };
}

function createGetMeta(input) {
    const currentRawData = input.raw_data;
    const metadataCsv = input.metadata.flags; // Adapted to new metadata structure

    // Create a lookup map for faster access
    const metadataMap = new Map();
    if (metadataCsv) {
        for (const row of metadataCsv) {
            metadataMap.set(row.origin_name, row);
        }
    }

    return function getMeta(name) {
        if (!name || !currentRawData || !currentRawData.names || !currentRawData.regions) {
            return { flag: "", id: -1, region: -1, region_name: "N/A" };
        }

        const id = currentRawData.names.indexOf(name);
        if (id === -1) {
            return { flag: "", id: -1, region: -1, region_name: "N/A" };
        }

        let flag = "";
        const metaRow = metadataMap.get(name); // Use the map for O(1) lookup
        if (metaRow) {
            flag = metaRow.origin_flag || "";
        }

        const getRegionValueForNameIndex = (nameIndex, regionsArray, namesArrayLength) => {
            let regionVal = -1;
            for (let i = 0; i < regionsArray.length; i++) {
                const currentRegionStartIndex = regionsArray[i];
                const nextRegionStartIndex = (i + 1 < regionsArray.length) ? regionsArray[i + 1] : namesArrayLength;
                if (nameIndex >= currentRegionStartIndex && nameIndex < nextRegionStartIndex) {
                    regionVal = currentRegionStartIndex;
                    break;
                }
            }
            if (regionsArray.includes(nameIndex)) {
                regionVal = nameIndex;
            }
            return regionVal;
        };

        const regionValue = getRegionValueForNameIndex(id, currentRawData.regions, currentRawData.names.length);
        const region_name = (regionValue !== -1 && currentRawData.names[regionValue]) ? currentRawData.names[regionValue] : "N/A";

        return {
            flag: flag,
            id: id,
            region: regionValue,
            region_name: region_name
        };
    }
}

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
/* function filterYear(input, year) {
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
} */
// Commented out allTimeMax function removed.

// #########################################################################################
// #########################################################################################
//  DATA PREPARE
function setSelectors(allYears) {
    if (!allYears || allYears.length === 0) {
        console.error("setSelectors called with no years.");
        return;
    }
    const lastYearPlusFive = (+allYears[allYears.length - 1] + 5).toString()

    let allRangeYears = allYears.concat(lastYearPlusFive)
    let sliderticks = document.getElementById("sliderticks");
    let slider = document.getElementById("selectYear");
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

    if (fileName(config).json.includes("stock")) {
        function getTicks(year) {
            let ticks = allYears.map(col =>
                +col === +year ?
                `<p><b>${col}</b></p   >` :
                `<p>${col}</p   >`
            ).join("");
            sliderticks.innerHTML = ticks
        }
        getTicks(sliderValue)
        slider.oninput = function () {
            let value = parseInt(this.value)
            getTicks(value)
        }
    } else if (fileName(config).json.includes("flow")) {
        function getTicks(year) {

            let ticks = allRangeYears.map(col =>
                +col === +year || +col === +year + 5 ?
                `<p><b>${col}</b></p   >` :
                `<p>${col}</p   >`
            ).join("");
            sliderticks.innerHTML = ticks
        }
        getTicks(sliderValue)
        slider.oninput = function () {
            let value = parseInt(this.value)
            getTicks(value)
        }
    }
}



function dataPrepare(input, config) {
    var input_data = {...input}
    
    // Add names and regions to raw_data from metadata
    input_data.raw_data.names = input_data.metadata.names;
    input_data.raw_data.regions = input_data.metadata.regions;

    const getMeta = createGetMeta({raw_data: input_data.raw_data, metadata: input_data.metadata.flags});
    var meta = input_data.metadata.flags // meta is input.metadata (parsed CSV)
    config.threshold = input_data.dataset_meta.threshold
    threshold = 10000 || +config.threshold
    ranking = 10000 || +config.ranking
    
    const datasetMeta = input_data.dataset_meta
    const maxFlows = datasetMeta.max_total_inflow.map((val, d) => val + datasetMeta.max_total_outflow[d])

    input = input_data.raw_data; // Alias for the specific JSON data content
    year = +config.year;
    sex = config.sex;

    // UTILS needed by filteredMatrix - defined here so they are in scope when filteredMatrix is called.
    // These operate on 'input' (input_data.raw_data - the raw JSON for the current file).
    const getRegion = createRegionLookup(input)
    const isRegion = createIsRegion(input);
    /* const isRegion = (name_string) => {
        const nameIdx = input.names.indexOf(name_string);
        if (nameIdx === -1) return false;
        return input.regions.includes(nameIdx);
    }; */

    var dataFromFilterYear = input;
    
    let dataSliced = filteredMatrix(dataFromFilterYear); // Pass dataFromFilterYear to filteredMatrix

    flows = dataSliced.flows; 

    function getMatrix(names, matrixData) { 
        const index = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        const iterableMatrixData = Array.isArray(matrixData) ? matrixData : [];

        for (const link of iterableMatrixData) { 
            const { source, target, value = 0 } = link || {}; 

            if (source && target && index.has(source) && index.has(target)) {
                 matrix[index.get(source)][index.get(target)] += value;
            } else {
                 if (link) { 
                    console.warn(`Skipping link in getMatrix due to missing name in index or invalid link structure: ${source} -> ${target}`, link);
                 }
            }
        }
        return matrix;
    }
    // UTILS ----------------------------------------------------------------------
    // Definitions of getRegion and isRegion moved to before filteredMatrix call.
    // This block is now removed to prevent redeclaration.
    // const getRegion = (index) => { ... }
    // const isRegion = (name) => { ... }

    // APPLY FILTERS ------------------------------------------------------------
    function filteredMatrix(input) {
        data = input
        const countryNames = data.names
        
        // Compute total inflow and outflow from the matrix if they are not pre-calculated
    
        const matrix = data.matrix;
        const n = matrix.length;
        const total_outflow = new Array(n).fill(0);
        const total_inflow = new Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                total_outflow[i] += matrix[i][j];
                total_inflow[j] += matrix[i][j];
            }
        }
   /*      data.total_outflow = total_outflow;
            data.total_inflow = total_inflow; */
        
        // GET SOURCE-TARGET STRUCTURE 
        // Create array of name & connections objects

        let matrix_connections = data.names.map((d, i) => {
            let name = d
            let regionName = getRegion(i)
            let connections = data.matrix.map(a => a[i])
            return {
                name: name,
                region: regionName,
                connections: connections
            }
        })
        
        let nodes = matrix_connections
        // Create object to push links during loop
        let links = []
        let l = 0 // <- iterator
        for (let j in matrix_connections) {
            let target_region = matrix_connections[j].region // <- include region why not
            let target = matrix_connections[j].name
            // loop (into each 1st level array)
            for (let k in matrix_connections[j].connections) {
                let source = matrix_connections[k].name
                let source_region = matrix_connections[k].region // <- include region why not
                let value = matrix_connections[j].connections[k]
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
        }); 

        // COMPUTE TOTAL FLOWS
        // console.log(nldata)
        let country_totals = unfilteredNL.links.filter(d=> d.source_region != d.target && d.target_region != d.source && !isRegion(d.source) && !isRegion(d.target) ) // remove values for regions targeting countries

        let country_inflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.target) 
        let country_outflows = d3.flatRollup(country_totals, v => d3.sum(v, d => d.value), d => d.source) 
        // let country_inflows = fastRollup(country_totals, 'target', 'value');
        // let country_outflows = fastRollup(country_totals, 'source', 'value');
        // console.log(country_inflows)
        // //--
        let region_totals = unfilteredNL.links.filter(d=> isRegion(d.source) && isRegion(d.target))
        // let region_inflows = fastRollup(region_totals, 'target', 'value');
        // let region_outflows = fastRollup(region_totals, 'source', 'value');
        // let region_totals = unfilteredNL.links.filter(d=> !isRegion(d.source) && !isRegion(d.target))
        let region_inflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.target_region) 
        let region_outflows = d3.flatRollup(region_totals, v => d3.sum(v, d => d.value), d => d.source_region) 
        // /* console.log(region_outflows) */
        let outflows = region_outflows.concat(country_outflows)
        let inflows = region_inflows.concat(country_inflows)
        
        let flows = names.map((name, i) => {

            let outflow =  outflows.filter(d=> d[0].includes(name)).flat()[1]
            let inflow =  inflows.filter(d=> d[0].includes(name)).flat()[1]
         /*    let net_flow = outflow[i] - inflow[i]
            let total_flow = outflows[i] + inflow[i] */
            let connections = number_connections.map(d=>d.connections)[i]
            let basicMetaData = getMeta(name); 
            let region_name = basicMetaData.region_name;
                { return {
                        region_name,
                        name,
                        outflow,
                        inflow,
           /*              net_flow,
                        total_flow, */
                        connections
                    }
                }
        })

        // RANK COUNTRIES BY NET_FLOW
        function rankValues() {
            const globalRank = flows.filter(d => !isRegion(d.name)) 
            .sort((a, b) => b.total_flow - a.total_flow) 
            .map((d, i) => {
                let name = d.name
                let value = d.total_flow
                let global_rank = i + 1
                return {
                    name,
                    value,
                    global_rank
                }
            })
            const uniqueRegions = [...new Set(flows.map(d => d.region_name))]
            const rankings = {}
            let regionCountries
            uniqueRegions
                .forEach((region, index) => {
                    regionCountries = flows
                        .filter(d => d.region_name === region && d.name !== region) 
                        .sort((a, b) => b.total_flow - a.total_flow) 
                        .map((d, i) => {
                            let name = d.name
                            let value = d.total_flow
                            let rank = i + 1
                            let global_rank = globalRank.filter(a=> a.name == d.name).map(a=>a.global_rank)[0]

                            return {
                                region,
                                name,
                                value,
                                rank,
                                global_rank
                            }
                        })
                    rankings[index] = regionCountries
                })
            return regionCountries, rankings
        }
        const rankedValues = Object.values(rankValues()).flat()
        const region_rank = names.map(name => {
            rank = rankedValues.filter(d => d.name === name)[0]
            rank = Object(rank).rank
            return rank
        })
        const global_rank = names.map(name => {
            g_rank = rankedValues.filter(d => d.name === name)[0]
            g_rank = Object(g_rank).global_rank
            return g_rank
        })
        flows.forEach((d, i) => {
            d.rank = region_rank[i]
            d.global_rank = global_rank[i]
        })

        let filteredData = nldata.links
        const connectionsWithRelevance = filteredData.map(conn => {
            const sourceNode = flows.find(node => node.name === conn.source);
            const targetNode = flows.find(node => node.name === conn.target);
            const relevance = (sourceNode.connections + targetNode.connections) * conn.value; 

            return { ...conn, relevance }; 
        });
        connectionsWithRelevance.sort((a, b) => b.value - a.value);

        const filteredConnections = connectionsWithRelevance.slice(0, config.ranking+250 || connectionsWithRelevance.length);
        filteredData = filteredConnections; 

        
        let dataSelect = filteredData.filter(d => d.source_region != d.target && d.target_region != d.source); 

        function removeNullNames() {
            let names_source = Array.from(new Set(dataSelect.flatMap(d => d.source))); 
            let names_target = Array.from(new Set(dataSelect.flatMap(d => d.target)));

            function common(...arr) {
                return arr.reduce((first, second) => {
                    return first.filter(el => second.includes(el));
                })
            }
            let innerjoin = common(names_source, names_target)
            let sources = Array.from(new Set(filteredData.flatMap(d => d.source)))
            let targets = Array.from(new Set(filteredData.flatMap(d => d.target)))
            innerjoin = common(sources, targets)

            let names_indexed = names.filter(d => innerjoin.includes(d))
            return names_indexed
        }
        names = Array.from(new Set(removeNullNames()))
        
        let finalData = filteredData.filter(d =>
            names.includes(d.source) && names.includes(d.target)
        )
        console.log(names)
        // Generate back the matrix with filtered values
        let filteredMatrix = getMatrix(names, finalData)

        // Reindex regions
        let regions = []
        names.map((d, i) => {
            if (isRegion(d)) {
                regions.push(i)
            }
        })
        return {
            names: names,
            matrix: filteredMatrix,
            regions: regions,
            nldata: finalData,
            flows: flows,
            unfilteredNL: unfilteredNL
        }
    }

    // DEFINE LAYOUT FOR SELECTED REGIONS
    // Expand countries under selected regions
    function expandRegion(currentData, regionName) { // Renamed 'input' to 'currentData' for clarity
        if (typeof regionName === 'undefined' || regionName === null || regionName === "") {
            // If no specific region is to be expanded, return all region indices themselves.
            // And an empty countryRange, as no countries are being expanded.
            // Ensure currentData.regions exists and is an array
            const regions = Array.isArray(currentData.regions) ? currentData.regions : [];
            return {
                indexList: regions.slice(), // Return a copy of the region indices
                countryRange: [] 
            };
        }
    
        const nameRegionIndex = currentData.names.indexOf(regionName);
        // Ensure currentData.regions exists for the includes check
        const regionsArray = Array.isArray(currentData.regions) ? currentData.regions : [];

        if (nameRegionIndex === -1 || !regionsArray.includes(nameRegionIndex)) {
            // If the provided regionName is not a known region or not in names list,
            // behave as if no specific region was selected for expansion.
            console.warn(`expandRegion: regionName "${regionName}" not found or not a valid region. Returning all regions.`);
            return {
                indexList: regionsArray.slice(), 
                countryRange: []
            };
        }
    
        const regionIndexInRegionsArray = regionsArray.indexOf(nameRegionIndex); // Index OF nameRegionIndex in currentData.regions array
    
        // Determine the end index for the country range
        let endRangeIndex;
        if (regionIndexInRegionsArray === regionsArray.length - 1) {
            // This is the last region, so countries go up to the end of the names list
            endRangeIndex = currentData.names.length;
        } else {
            // Not the last region, so countries go up to the index of the next region
            endRangeIndex = regionsArray[regionIndexInRegionsArray + 1];
        }
    
        const range = (min, max) => Array.from({ length: Math.max(0, max - min) }, (_, i) => min + i);
        // Countries are from nameRegionIndex + 1 up to endRangeIndex (exclusive for end)
        let countriesInRange = range(nameRegionIndex + 1, endRangeIndex); 
    
        // Construct the new indexList: start with all regions, then replace one region with its countries
        let newIndexList = regionsArray.slice(); // Start with a copy of all region indices
        
        const positionToReplace = newIndexList.indexOf(nameRegionIndex);
        if (positionToReplace !== -1) {
            newIndexList.splice(positionToReplace, 1, ...countriesInRange); // Replace region with its countries
        } else {
            console.warn("Could not find region index in list for replacement in expandRegion");
        }
        
        return {
            indexList: newIndexList.flat(), 
            countryRange: countriesInRange 
        };
    }
    data = dataSliced; 
    flows = dataSliced.flows;

    // Produce layout for CHORD diagram based on config.regions
    let final_chord_indices = [];
    if (config.regions && config.regions.length > 0) {
        let expanded_country_indices = [];
        let processed_parent_region_indices = new Set();

        config.regions.forEach(regionName => {
            if (regionName) {
                const expansion = expandRegion(data, regionName); // 'data' is dataSliced
                expanded_country_indices.push(...expansion.countryRange);
                const parentRegionIndex = data.names.indexOf(regionName);
                if (parentRegionIndex !== -1) {
                    processed_parent_region_indices.add(parentRegionIndex);
                }
            }
        });
        final_chord_indices.push(...expanded_country_indices);
        data.regions.forEach(regionIdx => {
            if (!processed_parent_region_indices.has(regionIdx)) {
                final_chord_indices.push(regionIdx);
            }
        });
    } else {
        final_chord_indices = data.regions.slice();
    }
    final_chord_indices = [...new Set(final_chord_indices)].sort((a, b) => a - b);
    
    let filteredLayout = final_chord_indices; // This is the list of indices for the chord diagram

    // Function to create matrix and names for Chord
    function buildChordData(layout_indices, source_data) {
        let new_names = [];
        let new_unfiltered_matrix_rows = [];
        let new_matrix = [];
        let new_maxFlows = [];
        
        console.log(source_data.names)
        layout_indices.forEach(idx => { // Use forEach for clarity if map's return isn't used
            original_id = getMeta(source_data.names[idx]).id
            new_names.push(source_data.names[idx]);
            new_unfiltered_matrix_rows.push(source_data.matrix[idx]);
            new_maxFlows.push(maxFlows[original_id])
        });

        new_unfiltered_matrix_rows.forEach(row_data => { // Use forEach
            let filtered_row = layout_indices.map(col_idx => row_data[col_idx]);
            new_matrix.push(filtered_row);
        });
        console.log(new_maxFlows)
        return { names: new_names, matrix: new_matrix, maxFlows: new_maxFlows};
    }
    let result = buildChordData(filteredLayout, data); // 'data' is dataSliced

    let sankeySourceRegionName = config.regions && config.regions.length > 0 ? config.regions[0] : undefined;
    let sankeyTargetRegionName = config.regions && config.regions.length > 1 ? config.regions[1] : undefined;
    
    let sankey_source_indices;
    let sankey_target_indices;

    if (sankeySourceRegionName && sankeyTargetRegionName) {
        sankey_source_indices = expandRegion(data, sankeySourceRegionName).countryRange; 
        sankey_target_indices = expandRegion(data, sankeyTargetRegionName).countryRange; 
    } else if (sankeySourceRegionName) {
        sankey_source_indices = expandRegion(data, sankeySourceRegionName).countryRange; 
        const sourceRegionNameIndex = data.names.indexOf(sankeySourceRegionName);
        sankey_target_indices = data.regions.filter(r_idx => r_idx !== sourceRegionNameIndex);
        if (sankey_target_indices.length === 0 && data.regions.length > 0) { 
             sankey_target_indices = data.regions.slice(); 
        }
    } else if (sankeyTargetRegionName) {
        sankey_target_indices = expandRegion(data, sankeyTargetRegionName).countryRange; 
        const targetRegionNameIndex = data.names.indexOf(sankeyTargetRegionName);
        sankey_source_indices = data.regions.filter(r_idx => r_idx !== targetRegionNameIndex);
        if (sankey_source_indices.length === 0 && data.regions.length > 0) { 
            sankey_source_indices = data.regions.slice(); 
        }
    } else {
        sankey_source_indices = data.regions.slice(); 
        sankey_target_indices = data.regions.slice(); 
    }

    let sankey_source_names = sankey_source_indices.map(d_idx => data.names[d_idx]);
    let sankey_target_names = sankey_target_indices.map(d_idx => data.names[d_idx]);

    let sankey_display_names = [...new Set(sankey_source_names.concat(sankey_target_names))]
                                .sort((a,b) => data.names.indexOf(a) - data.names.indexOf(b)); 
    
    let sankey_nodes = sankey_display_names.map(name => ({
        name: name,
        id: getMeta(name).id 
    }));

    let selectedLinksForSankey = dataSliced.nldata.filter(link => 
        sankey_display_names.includes(link.source) && sankey_display_names.includes(link.target)
    );

    let nldata = { 
        nodes: sankey_nodes,
        links: selectedLinksForSankey,
        sankey_layout: { 
            source: sankey_source_names, 
            target: sankey_target_names  
        }
    };
   
    
    return {
        common: {
            allNames: dataSliced.names, 
            allRegions: dataSliced.regions, 
            flows: flows, 
            configSnapshot: {...config} 
        },
        chordData: {
            names: result.names, 
            matrix: result.matrix,
            maxFlows: result.maxFlows
        },
        sankeyData: {
            nodes: nldata.nodes,
            links: nldata.links,
            layout: nldata.sankey_layout
        }
    };
    

}
