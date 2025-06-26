//  INITIAL PARAMETERS
var width = 800;
var height = width - 50;
const textId = "O-text-1";
let regionIndex = 1
let ranking = 6000
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
var fileName = (configs) => { // Changed let to var for wider global scope
    configs = {...config}

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

// --- Consolidated Metadata Function ---
// Provides basic metadata: flag, id (index in currentRawData.names), 
// region (index of parent region in currentRawData.names), and region_name.
// Does not include flow data.
function getBasicMeta(name, currentRawData, metadataCsv) {
    if (!name || !currentRawData || !currentRawData.names || !currentRawData.regions || !metadataCsv) {
        // console.warn("getBasicMeta: Missing required arguments or data structure.", name, currentRawData, metadataCsv);
        return { flag: "", id: -1, region: -1, region_name: "N/A" };
    }

    const id = currentRawData.names.indexOf(name);
    if (id === -1) {
        // console.warn(`getBasicMeta: Name "${name}" not found in currentRawData.names.`);
        return { flag: "", id: -1, region: -1, region_name: "N/A" };
    }

    let flag = "";
    const metaRow = metadataCsv.find(row => row.origin_name === name);
    if (metaRow) {
        flag = metaRow.origin_flag || "";
    }

    // Helper to find the region index (value from currentRawData.regions) for a given nameIndex
    // This is the index that points to the region's name in currentRawData.names
    const getRegionValueForNameIndex = (nameIndex, regionsArray, namesArrayLength) => {
        let regionVal = -1; // Default if not found or is a top-level region not further categorized
        // Find which region group the nameIndex belongs to
        // regionsArray contains the start indices of each region
        for (let i = 0; i < regionsArray.length; i++) {
            const currentRegionStartIndex = regionsArray[i];
            const nextRegionStartIndex = (i + 1 < regionsArray.length) ? regionsArray[i + 1] : namesArrayLength;
            if (nameIndex >= currentRegionStartIndex && nameIndex < nextRegionStartIndex) {
                regionVal = currentRegionStartIndex; // This IS the region index (value)
                break;
            }
        }
        // If the name itself is a region, its region is itself.
        if (regionsArray.includes(nameIndex)) {
            regionVal = nameIndex;
        }
        return regionVal;
    };

    const regionValue = getRegionValueForNameIndex(id, currentRawData.regions, currentRawData.names.length);
    const region_name = (regionValue !== -1 && currentRawData.names[regionValue]) ? currentRawData.names[regionValue] : "N/A";

    return { 
        flag: flag, 
        id: id,                   // Index of 'name' in currentRawData.names
        region: regionValue,      // Index of the region's name in currentRawData.names
        region_name: region_name
    };
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
// Commented out allTimeMax function removed.

// #########################################################################################
// #########################################################################################
//  DATA PREPARE
function dataPrepare(input, config) {

    var input_data = {...input}
    meta = input_data.metadata // meta is input.metadata (parsed CSV)
    threshold = /* input_data.raw_data.threshold || */ 10000 || +config.threshold
    ranking = /* input_data.raw_data.threshold || */ 10000 || +config.ranking
    // colors = input_data.raw_data.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE'] 
    // ^ Removed: Chart files now source 'colours' from specificRawData. The JSONs should contain a 'colours' array.
    
    // 'localFlags' definition removed as it's no longer used. 
    // getBasicMeta now uses 'meta' (input_data.metadata) directly.
    input = input_data.raw_data; // Alias for the specific JSON data content
    year = +config.year;
    sex = config.sex;

    // UTILS needed by filteredMatrix - defined here so they are in scope when filteredMatrix is called.
    // These operate on 'input' (input_data.raw_data - the raw JSON for the current file).
    const getRegion = (index_in_input_names) => {
        var r = 0;
        // input.regions contains indices relative to input.names
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index_in_input_names) {
                break;
            }
            r = i;
        }
        return input.regions[r]; // Returns the region's ID (which is an index in input.names)
    };
    
    const isRegion = (name_string) => {
        const nameIdx = input.names.indexOf(name_string);
        if (nameIdx === -1) return false;
        return input.regions.includes(nameIdx);
    };

    // 'dataFromFilterYear' contains the matrix, names, regions, and flow totals for the selected year
    // from the 'input' (specific JSON data).
    // Note: filterYear returns input.names and input.regions, so indices are consistent.
    var dataFromFilterYear = filterYear(input, year);
    
    // 'dataSliced' is the result of further processing/filtering (ranking, etc.) on 'dataFromFilterYear'.
    // It contains { names, matrix, regions, nldata, flows, unfilteredNL }
    // The .names, .matrix, .regions in dataSliced are potentially different from dataFromFilterYear
    // if countries/regions were filtered out by ranking or other criteria.
    let dataSliced = filteredMatrix(dataFromFilterYear); // Pass dataFromFilterYear to filteredMatrix

    // The 'flows' array within dataSliced already contains total_outflow, total_inflow, etc.
    // calculated based on dataFromFilterYear's totals, but mapped to potentially filtered 'names'.
    flows = dataSliced.flows; // Use the flows from dataSliced for consistency downstream.
                              // Note: 'data' variable below this point in the original code refers to dataSliced.
                              // To avoid confusion, let's consistently use dataSliced.

    // The nested getMeta function (around line 581) will be removed.
    // Calls to it will be replaced by getBasicMeta.
    // For example, in filteredMatrix, when building its local 'flows' array:
    // let region_name = getMeta(name).region_name; becomes
    // let region_name = getBasicMeta(name, data_for_basic_meta, meta).region_name;
    // 'data_for_basic_meta' would be 'input' (the JSON content) if getBasicMeta needs original names/regions,
    // or 'dataFromFilterYear' if it needs year-specific structure but pre-filteredMatrix names.
    // Or 'dataSliced' if it needs the names list post-filteredMatrix.
    // getBasicMeta is defined to take 'currentRawData' which is the JSON file content.
    // So, when getBasicMeta is called from within dataPrepare, currentRawData should be 'input'.
    // And metadataCsv should be 'meta'.

    /* console.log) */
    // Set a matrix of the data data to pass to the chord() function
    function getMatrix(names, matrixData) { 
        const index = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from(index, () => new Array(names.length).fill(0));

        // Ensure matrixData is iterable and an array before looping
        const iterableMatrixData = Array.isArray(matrixData) ? matrixData : [];

        for (const link of iterableMatrixData) { // Changed to simple loop variable 'link'
            // Destructure safely, providing defaults if properties are missing, though ideally they exist
            const { source, target, value = 0 } = link || {}; 

            if (source && target && index.has(source) && index.has(target)) {
                 matrix[index.get(source)][index.get(target)] += value;
            } else {
                 if (link) { // Avoid logging for completely null/undefined entries if iterableMatrixData was []
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
            // /* console.log(`${d.name} has ${nonZeroConnections} non-zero connections.`); */
        }); 

        // COMPUTE TOTAL FLOWS
        let flows = names.map((name, i) => {
            let outflow = data.total_outflow[i]
            let inflow = data.total_inflow[i]
            let net_flow = outflow - inflow
            let total_flow = outflow + inflow
            let connections = number_connections.map(d=>d.connections)[i]
            // Use global getBasicMeta. 'input' is specificRawData, 'meta' is metadataCsv for getBasicMeta.
            // 'data' in this scope is dataFromFilterYear.
            let basicMetaData = getBasicMeta(name, input, meta); 
            let region_name = basicMetaData.region_name;
            // let rank
            { return {
                    region_name,
                    name,
                    outflow,
                    inflow,
                    net_flow,
                    total_flow,
                    connections
                    // rank
                }
            }
        })

        // RANK COUNTRIES BY NET_FLOW
        // Get flows for each region, and sort them, append RANK value to original dataset
        function rankValues() {
            // COMPUTE GLOBAL RANKINGS BY TOTAL FLOW (OUTFLOW + INFLOW)
            const globalRank = flows.filter(d => !isRegion(d.name)) //Exclude regions
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
            // COMPUTE RANKINGS FOR EACH REGION BY TOTAL FLOW (OUTFLOW + INFLOW)
            //Set regions to loop and rank country values within
            const uniqueRegions = [...new Set(flows.map(d => d.region_name))]
            const rankings = {}
            let regionCountries
            uniqueRegions
                .forEach((region, index) => {
                    regionCountries = flows
                        .filter(d => d.region_name === region && d.name !== region) // discard region values
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
        // console.log(config.ranking)
        


       /*  */
       let filteredData = nldata.links
       const connectionsWithRelevance = filteredData.map(conn => {
            const sourceNode = flows.find(node => node.name === conn.source);
            const targetNode = flows.find(node => node.name === conn.target);
            // Calculate 'relevance' score for potential alternative ranking. Currently unused for sorting.
            const relevance = (sourceNode.total_flow + targetNode.total_flow) * conn.value; 
            return { ...conn, relevance }; // Include relevance in the object if needed later
      });
    
      // Sort connections by their actual migration 'value' in descending order.
      // The 'relevance' field is calculated but not used for this primary sorting.
      connectionsWithRelevance.sort((a, b) => b.value - a.value);

      // Filter to top N connections based on config.ranking (maps to UI slider "Connections displayed")
      const filteredConnections = connectionsWithRelevance.slice(0, config.ranking);
      filteredData = filteredConnections; // These are the primary links to consider for the visualization

    //     // FILTER BY TOP RANKING VALUES
    //     function filterSourceTarget(links, countryRank, ranking) {
    //         // Create a map for quick lookup of numbers by country name
    //         let rankMap = new Map();
    //       /*   links.forEach((d, i) => {
    //             d.rank = region_rank[i]  
    //             d.global_rank = global_rank[i]
    //         }) */
    //         countryRank.forEach(item => rankMap.set(item.name, item.global_rank === undefined ? 1000 : item.global_rank));
    //         /* links.map(d=> console.log(d))
    //          */
    //         let global_rank = countryRank.map(d=>d.global_rank)
    //         // console.log(global_rank)


    //         // Filter the source-target array
    //         return [links.filter(pair =>
    //             rankMap.get(pair.target) < ranking && rankMap.get(pair.target) < ranking
    //         ),global_rank];

    //     }



    
            // .filter(d=>)

        // console.log(config.ranking)
        // let rankedCountries = filterSourceTarget(filteredData, flows,10000)
        // filteredData = rankedCountries
        // console.log(rankedCountries)
        /*  let filteredData = filterSourceTarget(nldata.links,flows,40) */
        // into both source & target
        /* .filter(d=> d.source_target > threshold )    */

        // FILTER BY THRESHOLD
        /* .filter(d=> d.value > threshold )    */


        // EXCLUDE NON-RECIPROCAL COUNTRIES / REFINE NAMES LIST
        // The goal of this section is to refine the list of country names to be included in the visualization.
        // It aims to ensure that the countries are part of meaningful bidirectional flows or significant overall flows
        // after the initial top-N filtering by connection value.

        // First, filter out connections where a region flows to itself (e.g. "Europe" to "Europe").
        // This does not remove country-to-country flows within the same region.
        let dataSelect = filteredData.filter(d => d.source_region != d.target && d.target_region != d.source); 
        
        // removeNullNames aims to find countries that are part of some reciprocal interaction within dataSelect.
        // A country is kept if it appears as both a source and a target within the selected (and self-region-flow-removed) dataset.
        function removeNullNames() {
            let names_source = Array.from(new Set(dataSelect.flatMap(d => d.source))); 
            let names_target = Array.from(new Set(dataSelect.flatMap(d => d.target)));

            // Helper to find common elements in arrays (effectively an intersection)
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
        // console.log(names)

        // ranked_names = flows.filter(d=> isRegion(d.name) || d.rank < config.ranking).map(d=>d.name)
        // ranked_names = flows.filter(d=> isRegion(d.name) || d.global_rank < config.ranking).map(d=>d.name)
        // console.log(ranked_names)
        // Re order names
    /*     names = names.filter(d=> 
                ranked_names.includes(d)
        ) */
        /* // Filter by limit #selectedConns 
        limited_connections_names = flows.filter(d=> isRegion(d.name) || d.connections < config.limitConns).map(d=>d.name)
        console.log(limited_connections_names)
        names = names.filter(d=> 
                limited_connections_names.includes(d)
        )
         */
        // Match filtered countries to other data
        // flows = flows.filter(d => names.includes(d.name))
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
    // produce the filtered Matrix for a given a threshold value
    // let dataSliced = filteredMatrix(data) // THIS WAS THE REDECLARATION - REMOVED. 
    // dataSliced was already computed earlier (around line 216) using dataFromFilterYear.

    data = dataSliced; // 'data' now correctly refers to the result of the single filteredMatrix call.
                     // 'dataSliced' here refers to the one declared around L216.

    flows = dataSliced.flows; // 'flows' also correctly refers to the flows from the single filteredMatrix call.
    // console.log(dataSliced)
   /*  sankey_names.filter(d=> 
        limited_connections_names.includes(d)) */

    // Nested getMeta function (previously around here) is now removed. 
    // Calls will be updated to use global getBasicMeta.

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

        layout_indices.forEach(idx => { // Use forEach for clarity if map's return isn't used
            new_names.push(source_data.names[idx]);
            new_unfiltered_matrix_rows.push(source_data.matrix[idx]);
        });

        new_unfiltered_matrix_rows.forEach(row_data => { // Use forEach
            let filtered_row = layout_indices.map(col_idx => row_data[col_idx]);
            new_matrix.push(filtered_row);
        });
        return { names: new_names, matrix: new_matrix };
    }
    let result = buildChordData(filteredLayout, data); // 'data' is dataSliced

    // PREPARE SANKEY LAYOUT (uses dataSliced and config.regions directly)
    // Note: Sankey specific logic for source/target selection from config.regions
    let sankeySourceRegionName = config.regions && config.regions.length > 0 ? config.regions[0] : undefined;
    let sankeyTargetRegionName = config.regions && config.regions.length > 1 ? config.regions[1] : undefined;
    
    // If only one region is in config.regions for Sankey, treat it as source, and target becomes all other regions.
    // Or, if a specific interaction model for Sankey is desired with one region selected, this logic might need adjustment.
    // For now, assume config.regions[0] is source, config.regions[1] is target if they exist.

    let sankey_source_indices;
    let sankey_target_indices;

    if (sankeySourceRegionName && sankeyTargetRegionName) {
        // Both source and target regions are specified for expansion
        sankey_source_indices = expandRegion(data, sankeySourceRegionName).countryRange; // Only countries
        sankey_target_indices = expandRegion(data, sankeyTargetRegionName).countryRange; // Only countries
    } else if (sankeySourceRegionName) {
        // Only source region is specified for expansion
        sankey_source_indices = expandRegion(data, sankeySourceRegionName).countryRange; // Only countries
        // Target becomes all other top-level regions (excluding the source region itself)
        const sourceRegionNameIndex = data.names.indexOf(sankeySourceRegionName);
        sankey_target_indices = data.regions.filter(r_idx => r_idx !== sourceRegionNameIndex);
        if (sankey_target_indices.length === 0 && data.regions.length > 0) { // Avoid empty target if possible, fallback to all regions if only one region exists overall
             sankey_target_indices = data.regions.slice(); // Fallback if filtering left nothing
        }
    } else if (sankeyTargetRegionName) {
        // Only target region is specified for expansion
        sankey_target_indices = expandRegion(data, sankeyTargetRegionName).countryRange; // Only countries
        // Source becomes all other top-level regions (excluding the target region itself)
        const targetRegionNameIndex = data.names.indexOf(sankeyTargetRegionName);
        sankey_source_indices = data.regions.filter(r_idx => r_idx !== targetRegionNameIndex);
        if (sankey_source_indices.length === 0 && data.regions.length > 0) { // Avoid empty source if possible
            sankey_source_indices = data.regions.slice(); // Fallback
        }
    } else {
        // Neither source nor target region is specified for expansion (default view)
        sankey_source_indices = data.regions.slice(); // All top-level regions
        sankey_target_indices = data.regions.slice(); // All top-level regions
    }

    // Convert indices to names
    let sankey_source_names = sankey_source_indices.map(d_idx => data.names[d_idx]);
    let sankey_target_names = sankey_target_indices.map(d_idx => data.names[d_idx]);

    // Ensure consistent node ordering for Sankey if it relies on input order
    let sankey_display_names = [...new Set(sankey_source_names.concat(sankey_target_names))]
                                .sort((a,b) => data.names.indexOf(a) - data.names.indexOf(b)); 
    
    let sankey_nodes = sankey_display_names.map(name => ({
        name: name,
        // Use global getBasicMeta. 'input' is specificRawData (original JSON content), 'meta' is metadataCsv.
        id: getBasicMeta(name, input, meta).id 
    }));

    // dataSliced.nldata contains all links AFTER ranking filter.
    // Filter these links for Sankey based on the derived sankey_display_names.
    let selectedLinksForSankey = dataSliced.nldata.filter(link => 
        sankey_display_names.includes(link.source) && sankey_display_names.includes(link.target)
    );

    let nldata = { // This nldata is now specifically for Sankey
        nodes: sankey_nodes,
        links: selectedLinksForSankey,
        sankey_layout: { // Keep structure if sankey-chart.js expects this exact layout obj
            source: sankey_source_names, // These are names, not indices
            target: sankey_target_names  // These are names, not indices
        }
    };

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
        common: {
            allNames: dataSliced.names, // All relevant names after all filtering in dataPrepare
            allRegions: dataSliced.regions, // Corresponding region indices from dataSliced
            flows: flows, // This is dataSliced.flows
            configSnapshot: {...config} // Shallow copy of the config used for this preparation
        },
        chordData: {
            names: result.names, // from buildChordData
            matrix: result.matrix  // from buildChordData
        },
        sankeyData: {
            nodes: nldata.nodes,
            links: nldata.links,
            layout: nldata.sankey_layout // {source_names, target_names}
        }
        /* old return was { result, flows, nldata } */
    };
    

}
