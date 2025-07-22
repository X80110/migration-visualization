// Inspired by http://bl.ocks.org/nl-hugo/c1a6c6f5b459449b9832d9f3ef73cb7d
// Inspired by https://observablehq.com/@stroked/daily-options-activity-sankey
// (1) we'll set chart constants and utils
// (2) process graph
// (3) pass data and specify details to the chart

// --- Start of Top-Level Helper Functions ---
function formatValue_sankey(nStr, seperator) { // Renamed to avoid conflict if global formatValue exists
    seperator = seperator || ',';
    nStr += '';
    let x = nStr.split('.');
    let x1 = x[0];
    let x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + seperator + '$2');
    }
    return x1 + x2;
}

if (!Number.prototype.mod) { // Define if not already defined globally
    Number.prototype.mod = function (n) {
        return ((this % n) + n) % n;
    };
}

// getRegion_sankey is removed as getBasicMeta provides region information.

function isRegion_sankey(name, current_specificRawData) { // Retained for direct checks
    if (!current_specificRawData || !current_specificRawData.regions || !current_specificRawData.names) return false; 
    const nameIndex = current_specificRawData.names.indexOf(name);
    if (nameIndex === -1) return false;
    return current_specificRawData.regions.includes(nameIndex);
} 

// getMeta_sankey is removed. Logic is now: call global getBasicMeta, then augment with flows locally.

const getRegionColor_sankey = (name, current_specificRawData) => { // Retained, uses specificRawData
    if (!current_specificRawData || !current_specificRawData.regions || !current_specificRawData.names) return '#ccc'; 
    const regionNames = current_specificRawData.regions.map((d)=> { return current_specificRawData.names[d]});
    const regionIndex = regionNames.indexOf(name);
    const colorPalette = current_specificRawData.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE'];
    return colorPalette[regionIndex % colorPalette.length];
}

const colorCountries_sankey = (name, current_specificRawData, current_metadata_csv /* current_prepared_flows not needed here directly */) => {
    // Uses global getBasicMeta. current_metadata_csv is the metadata param from setData.
    const countryBasicMeta = getBasicMeta(name, current_specificRawData, current_metadata_csv); 
    
    let color_country = getRegionColor_sankey(countryBasicMeta.region_name, current_specificRawData);
    let hsl = d3.hsl(color_country);

    const id = Number(countryBasicMeta.id);
    const region = Number(countryBasicMeta.region); // This is the ID of the region name from getBasicMeta

    if (isNaN(id) || isNaN(region)) {
        // console.warn('colorCountries_sankey: Invalid id or region for name', name, countryBasicMeta);
        const r_palette_fallback = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
        return r_palette_fallback[0]; // Return a default/fallback color
    }
    
    const r_palette = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
    let palleteIndex = (id - region); 
    palleteIndex = ((palleteIndex % 5) + 5) % 5; // Ensure positive and within 0-4 range
    return r_palette[palleteIndex];
}
// --- End of Top-Level Helper Functions ---

// Define chart-specific dimensions to avoid ReferenceError if global width/height are not yet defined
const SANKEY_WIDTH = 800; // Matching value from prepare-data.js
const SANKEY_HEIGHT = 750; // Matching value from prepare-data.js


// create graph structure for sankey


let graph = (data) => {

    let keys = ["source", "target"]
    let index = -1;
    const nodes = [];
    const nodeByKey = new Map;
    const indexByKey = new Map;
    const links = [];
    
    for (const k of keys) {
        for (const d of data) {
        const key = JSON.stringify([k, d[k]]);
        if (nodeByKey.has(key)) continue;
        const node = {name: d[k]};
        nodes.push(node);
        nodeByKey.set(key, node);
        indexByKey.set(key, ++index);
        }
    }
    
    for (let i = 1; i < keys.length; ++i) {
        const a = keys[i - 1];
        const b = keys[i];
        const prefix = keys.slice(0, i + 1);
        const linkByKey = new Map;
        for (const d of data) {
        const names = prefix.map(k => d[k]);
        const key = JSON.stringify(names);

        const value = d.value || 1;
        let link = linkByKey.get(key);
        if (link) { link.value += value; continue; }
        link = {
            source: indexByKey.get(JSON.stringify([a, d[a]])),
            target: indexByKey.get(JSON.stringify([b, d[b]])),
            names,
            value
        };
        links.push(link);
        linkByKey.set(key, link); 
        }
    }
    
    return {nodes, links};
}

const sankeyDiagram = d3.select("#sankey-chart")
    .append("svg")
    .attr("viewBox", [-(SANKEY_WIDTH/5) , -10, SANKEY_WIDTH, SANKEY_HEIGHT+50]);

const Links = sankeyDiagram.append("g")
    .attr("class", "links");

const Nodes = sankeyDiagram.append("g")
    .attr("class", "nodes");

const tooltip = d3.select('body').append('g')
    .attr('id', 'tooltip')
    .style('background-color','#ffffff')
    .style('padding','1em')
    .style('border-radius','4px')
    .style('position', 'absolute')
    .style('text-align', 'center')
    .style('visibility', 'hidden')
    .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')   

// Function signature changed:
// - `raw` is replaced by `specificRawData` (the single JSON for the current view) and `metadata`
// - `chartWidth` and `chartHeight` are now passed in.
// - Arguments changed to: sankeyData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight
function setData(sankeyData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight){
    // GET SELECTED DATASET - This section is removed as specificRawData is now passed directly.
    // filename = fileName(config).json; // Tooltips derive this locally if needed.
    // file_index = files.indexOf(filename); // 'files' global might not be reliable
    // let input_alias = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}; // Old way

    // `input_data` was an alias for the specific raw data JSON. Now use `specificRawData`.
    let input_data = specificRawData; // Used for specificRawData.names, .regions, .colours by helpers
    
    // Use the new structured input:
    // `sankeyData` contains .nodes, .links, .layout
    // `commonData` contains .flows
    // `metadataCsv` is the parsed flags CSV

    let indexedSource = sankeyData.layout.source;  // These are already name arrays
    let indexedTarget = sankeyData.layout.target;  // These are already name arrays
    
    let linksForGraph = [];
    if (sankeyData && Array.isArray(sankeyData.links)) {
        // The links in sankeyData.links should already be filtered by dataPrepare
        // to only include those between sankey_display_names.
        // The filter here using indexedSource/Target might be redundant if dataPrepare's
        // sankey_display_names logic is comprehensive. However, it provides an additional layer of safety.
        linksForGraph = sankeyData.links.filter(d => 
            (indexedSource.includes(d.source) || indexedSource.includes(d.source_region)) && // Check both name and region if applicable
            (indexedTarget.includes(d.target) || indexedTarget.includes(d.target_region))   // Check both name and region
        );
         // If links are pre-filtered in dataPrepare to only be between nodes in sankeyData.nodes,
         // then this filter might simplify or change. For now, assume this filtering is okay.
         // A simpler filter if sankeyData.links are guaranteed to be between displayed nodes:
         // linksForGraph = sankeyData.links;

    } else {
        console.error("Sankey: sankeyData.links is not available or not an array.", sankeyData);
        Links.selectAll("path").remove();
        Nodes.selectAll("g").remove();
        return; 
    }
    
    // graph() expects an array of {source, target, value} objects. 
    // sankeyData.links should be this.
    graphData = graph(linksForGraph); 
  
    const sankey = d3.sankey()
        /* .nodeId(d=> d.index) */
        .nodeWidth(16)
        .nodePadding(8) 
        /* .nodeAlign(d3.sankeyJustify) */
        .size([chartWidth-300, chartHeight]) // Use passed-in chartWidth and chartHeight
        /* .nodeSort(null) */
        /* .linkSort(null) */
     /*    .linkSort((a,b) => {
            if (b.source.sourceLinks.length > 0){
                return d3.ascending(indexedSource.indexOf(a.name),indexedSource.indexOf(b.name))
            } 
            else if (b.target.targetLinks.length > 0){
                return d3.ascending(indexedTarget.indexOf(a.name),indexedTarget.indexOf(b.name))
            }
        }) */
        .nodeSort((a,b) => {
            if (b.sourceLinks.length > 0){
                return d3.ascending(indexedSource.indexOf(a.name),indexedSource.indexOf(b.name))
            } 
            else if (b.targetLinks.length > 0){
                return d3.ascending(indexedTarget.indexOf(a.name),indexedTarget.indexOf(b.name))
            }
        })
 
   /*  const sankey_data = () => {           // generate sankey
        const nodeCopy = JSON.parse(JSON.stringify(graphData.nodes )); 
        const linkCopy = JSON.parse(JSON.stringify(graphData.links)); 
        return sankey({ nodes: nodeCopy, links: linkCopy });
    } */
    const {nodes, links} = sankey({
        nodes: graphData.nodes.map(d => Object.assign({}, d)),
        links: graphData.links.map(d => Object.assign({}, d))
      });
    /* graph_data = sankey_data()    */
    /* console.log(graph_data) */
    /* updateSankey(raw, input, config, graph_data) */
/* }

function updateSankey(raw, input, config, graph_data){ */
    // filename = fileName(config).json; // Removed: Tooltips derive this locally. No other use found.
    
    // Alias specificRawData and parts of preparedData for convenience if helpers remain inside.
    // However, helpers are moved out, so they will take these as params.
    const current_specificRawData = specificRawData;
    const current_metadata_csv = metadataCsv; // Corrected: was metadata
    const current_prepared_flows = commonData.flows; // Corrected: was preparedData.flows


    //// DRAW VECTORS ////////////////////////////////////////////////////////////////////////
    var link = Links.selectAll("path")
        .data(links)

    var linkEnter = link.enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill","none")
        .attr("class", "link")
        .style("opacity",d=> isRegion_sankey(d.source.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion_sankey(d.source.name, current_specificRawData) 
                            ? getRegionColor_sankey(d.source.name, current_specificRawData) 
                            : colorCountries_sankey(d.source.name, current_specificRawData, current_metadata_csv, current_prepared_flows))
    
    link
        .transition('link')
        .duration(500)
        .attr("d", d3.sankeyLinkHorizontal())
        .style("opacity",d=> isRegion_sankey(d.source.name, current_specificRawData) && isRegion_sankey(d.target.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion_sankey(d.source.name, current_specificRawData) 
                            ? getRegionColor_sankey(d.source.name, current_specificRawData)
                            : colorCountries_sankey(d.source.name, current_specificRawData, current_metadata_csv, current_prepared_flows))

    /* linkEnter.append("title")
      .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + formatValue_sankey(d.value / 1e3); }); */

    link.exit().remove();
    
    var node = Nodes.selectAll("g")
      .data(nodes);

    var nodeEnter = node.enter().append("g");

    nodeEnter.append("rect")
        .attr("class", "node")
        .attr("x", d => d.x0 < chartWidth / 2 ? d.x0-3 : d.x0+3 ) // Use chartWidth
        .attr("y", d=> d.y0)
        .attr("height", d=> d.y1 - d.y0 )
        .style("opacity",d=> isRegion_sankey(d.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)
        
        .attr("width", d=> d.x1 - d.x0)
        .attr("fill", d=> isRegion_sankey(d.name, current_specificRawData) 
                        ? getRegionColor_sankey(d.name, current_specificRawData) 
                        : colorCountries_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows))
        

    node.select("rect")  
        .transition('node')
        .duration(500)
        .attr("x", d => d.x0 < chartWidth / 2 ? d.x0-3 : d.x0+3 ) // Use chartWidth
        .attr("y", d => d.y0 )
        .attr("height", d=> d.y1 - d.y0 )
        /* .attr("width", d=>  isRegion_sankey(d.name, current_specificRawData) ? d.x1:d.x1 - d.x0) */
        
        .attr("fill", d=> isRegion_sankey(d.name, current_specificRawData) 
                        ? getRegionColor_sankey(d.name, current_specificRawData) 
                        : colorCountries_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows))
        .style("opacity",d=> isRegion_sankey(d.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)

    nodeEnter.append("text")
        .attr("x",d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < chartWidth / 2 && isReg) {return d.x1+6}          // Use chartWidth
            if(d.x0 > chartWidth / 2 && isReg) {return d.x0-6}          // Use chartWidth
            if(d.x0 < chartWidth / 2 && !isReg) {return d.x1-26}         // Use chartWidth
            if(d.x0 > chartWidth / 2 && !isReg) {return d.x0+26}         // Use chartWidth
        })
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("font-size", d=> isRegion_sankey(d.name, current_specificRawData) ? "85%": "65%")
        .attr("font-weight", d=> isRegion_sankey(d.name, current_specificRawData) ? "600": "400")
        
        .attr("dy", "0.6em")
        .attr("text-anchor", d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < chartWidth / 2 && isReg) {return "start"}         // Use chartWidth
            if(d.x0 > chartWidth / 2 && isReg) {return "end"}           // Use chartWidth
            if(d.x0 < chartWidth / 2 && !isReg) {return "end"}          // Use chartWidth
            if(d.x0 > chartWidth / 2 && !isReg) {return "start"}         // Use chartWidth
        })
        .text(d => {
            // Use global getBasicMeta; flow data not needed for node label, just flag.
            const basicMeta = getBasicMeta(d.name, current_specificRawData, current_metadata_csv);
            return d.sourceLinks.length > 0
                ?  d.name+ " "+ basicMeta.flag
                :  basicMeta.flag+ " "+  d.name;
        })


    node.select("text")
        .transition('text')
        .duration(500)
        .attr("font-size", d=> isRegion_sankey(d.name, current_specificRawData) ? "85%": "60%")
        .attr("font-weight", d=> isRegion_sankey(d.name, current_specificRawData) ? "600": "400")
        .attr("y", d => (d.y1 + d.y0) / 2 -4)
        .attr("x",d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < chartWidth / 2 && isReg) {return d.x1+6}          // Use chartWidth
            if(d.x0 > chartWidth / 2 && isReg) {return d.x0-6}          // Use chartWidth
            if(d.x0 < chartWidth / 2 && !isReg) {return d.x1-26}         // Use chartWidth
            if(d.x0 > chartWidth / 2 && !isReg) {return d.x0+26}         // Use chartWidth
        })
        .attr("dy", "0.6em")
        .attr("text-anchor", d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < chartWidth / 2 && isReg) {return "start"}         // Use chartWidth
            if(d.x0 > chartWidth / 2 && isReg) {return "end"}           // Use chartWidth
            if(d.x0 < chartWidth / 2 && !isReg) {return "end"}          // Use chartWidth
            if(d.x0 > chartWidth / 2 && isReg) {return "start"}         // Use chartWidth
        })
        .text(d => {
            const basicMeta = getBasicMeta(d.name, current_specificRawData, current_metadata_csv);
            return d.sourceLinks.length > 0
                ?  d.name+ " "+ basicMeta.flag
                :  basicMeta.flag+ " "+  d.name;
        })
    node.exit().remove();
    // OPEN REGIONS
    nodeEnter
        .on('click', function(evt, d_node) { // d_node is the clicked Sankey node data
            // compute clicked region
              // config.regions[0] will be *source*
              // config.regions[1] will be *target*
            function nodeSide(clickedNodeData){ 
                if (clickedNodeData.x0 < chartWidth / 2) { // Clicked a source node
                    // If clicking the same source region that's already the sole focus, collapse it.
                    if (config.regions[0] === clickedNodeData.name && (config.regions[1] === undefined || config.regions[1] === null)) {
                        config.regions[0] = undefined;
                    } else {
                        config.regions[0] = clickedNodeData.name;
                        config.regions[1] = undefined; // Clear target selection
                    }
                } else { // Clicked a target node
                    // If clicking the same target region that's already the sole focus, collapse it.
                    if (config.regions[1] === clickedNodeData.name && (config.regions[0] === undefined || config.regions[0] === null)) {
                        config.regions[1] = undefined;
                    } else {
                        config.regions[1] = clickedNodeData.name;
                        config.regions[0] = undefined; // Clear source selection
                    }
                }
                 // Ensure config.regions is an array of two, even if with undefined values
                if (!Array.isArray(config.regions)) config.regions = [];
                while(config.regions.length < 2) {
                    config.regions.push(undefined);
                }
                config.regions.length = 2; // Enforce length of 2
            }
            nodeSide(d_node) 
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    /// CLOSE REGIONS
    nodeEnter
        .filter(d_node=>!isRegion_sankey(d_node.name, current_specificRawData))
        .on('click', function(evt, d_node) {
            const basicMeta = getBasicMeta(d_node.name, current_specificRawData, current_metadata_csv);
            // We only need region_name from basicMeta here. Flow data is not relevant for this action.
            const regionNameToRemove = basicMeta.region_name;
            const indexToRemove = config.regions.indexOf(regionNameToRemove);
            if (indexToRemove > -1) {
                 config.regions.splice(indexToRemove, 1);
            }
            // If a region was in config.regions[0] or [1], make that slot undefined
            if (config.regions[0] === regionNameToRemove) config.regions[0] = undefined;
            if (config.regions[1] === regionNameToRemove) config.regions[1] = undefined;

            update(loadedJsonData, initialMetadata, config);
            
        })    

    
    /* nodeEnter.append("title")
        .text(function(d) { return d.name + "\n" + formatValue_sankey(d.value); });

    node.select("title")
        .text(function(d) { return d.name + "\n" + formatValue_sankey(d.value); }); */    
    function tooltipCountry(evt,d_link)  { // d_link is a link object from Sankey links
        const sourceBasicMeta = getBasicMeta(d_link.source.name, current_specificRawData, current_metadata_csv);
        // Flow data for tooltips should come from current_prepared_flows (commonData.flows)
        // const sourceFlowInfo = current_prepared_flows.find(f => f.name === d_link.source.name) || {};
        // const sourceFullMeta = { ...sourceBasicMeta, ...sourceFlowInfo };
        // For this tooltip, only flag is needed from meta, value from d_link itself.

        const targetBasicMeta = getBasicMeta(d_link.target.name, current_specificRawData, current_metadata_csv);
        // const targetFlowInfo = current_prepared_flows.find(f => f.name === d_link.target.name) || {};
        // const targetFullMeta = { ...targetBasicMeta, ...targetFlowInfo };

        var sourceDisplay = isRegion_sankey(d_link.source.name, current_specificRawData)  
            ? `<span style="color:${ getRegionColor_sankey(d_link.source.name, current_specificRawData)}"> ${d_link.source.name}</span>`
            : `<span style="color:${ colorCountries_sankey(d_link.source.name, current_specificRawData, current_metadata_csv)}"> ${sourceBasicMeta.flag+ " "+  d_link.source.name}</span>`;
        
        var targetDisplay = isRegion_sankey(d_link.target.name, current_specificRawData) 
            ? `<span style="color:${ getRegionColor_sankey(d_link.target.name, current_specificRawData)}"> ${d_link.target.name}</span>`
            : `<span style="color:${ colorCountries_sankey(d_link.target.name, current_specificRawData, current_metadata_csv)}"> ${targetBasicMeta.flag+ " "+  d_link.target.name}</span>`;
        
        let currentFilename = fileName(config).json; 
        if(currentFilename.includes('stock')){
            var valueDisplay = ` <div> 
                        <b>${formatValue_sankey(d_link.value)}</b> 
                        <br>in<br> </div> `;
        } else {
            var valueDisplay = ` <div> 
                        ▾<br>
                        <b>${formatValue_sankey(d_link.value)}</b> 
                        <br> </div> `;
        }
        return tooltip
            .html(`<span>\ <b>${sourceDisplay} </b> 
                        ${valueDisplay} 
                        ${targetDisplay}  </span>`)
            .transition('tooltip')
            .duration(50)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY+20)+"px")
            .style("left", (evt.pageX+30)+"px")
            .style("visibility", "visible")       
    }
    function tooltipRegion(evt,d_node) { // d_node is a node from Sankey nodes
        const basicMeta = getBasicMeta(d_node.name, current_specificRawData, current_metadata_csv);
        const flowInfo = current_prepared_flows.find(f => f.name === d_node.name) || {};
        const fullMeta = { ...basicMeta, ...flowInfo };

        let sourceDisplay = isRegion_sankey(d_node.name, current_specificRawData)
            ? `<span style="color:white"> <b>${d_node.name}</b></span>`
            : `<span style="color:white"> ${fullMeta.region_name}</span></br>
                <span style="color:white"><b> ${fullMeta.flag+ " "+  d_node.name}</b></span>`;
        
        var outflowDisplay = formatValue_sankey(fullMeta.outflow || 0); 
        var inflowDisplay = formatValue_sankey(fullMeta.inflow || 0);
        
        let currentFilename = fileName(config).json; 
        if (currentFilename.includes('stock') ){
            return tooltip
                .html(`<span>\ ${sourceDisplay} </br>
                        Total emigrants: <b> ${outflowDisplay}</b> </br>
                        Total immigrants: <b> ${inflowDisplay} </b> </span>`)
                .style('background-color',isRegion_sankey(d_node.name, current_specificRawData) 
                                        ? getRegionColor_sankey(d_node.name, current_specificRawData)
                                        : colorCountries_sankey(d_node.name, current_specificRawData, current_metadata_csv))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`<span>\ ${sourceDisplay} </br>
                        Total Out: <b> ${outflowDisplay}</b> </br>
                        Total In: <b> ${inflowDisplay} </b> </span>`)
                .style('background-color',isRegion_sankey(d_node.name, current_specificRawData) 
                                        ? getRegionColor_sankey(d_node.name, current_specificRawData)
                                        : colorCountries_sankey(d_node.name, current_specificRawData, current_metadata_csv))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
            }
        
        }
    
    // HOVER INTERACTIONS
    // -> Tooltip
    linkEnter
        .on("mousemove", tooltipCountry)
        .on("mouseout",d=> tooltip.selectAll("g").style("visibility", "hidden"));
    
    nodeEnter
        .on("mousemove", tooltipRegion)
        .on("mouseout", d=> d3.selectAll("g#tooltip").style("visibility", "hidden"))

        
    // Hover highlighting    
    nodeEnter
        .selectAll(".node")
        .on("mouseover", function (evt, d) {
            // dim non selected nodes
            sankeyDiagram.selectAll(".node")
              /*   .transition()
                .duration("50") */
                .style("opacity", 0.1)
            
            // highlight links
            sankeyDiagram.selectAll(".link")
            /*  .transition()
             .duration("50") */
                .style("opacity",0.1)
                .filter(p=> d.targetLinks.length === 0)     // Source
                .style("opacity", p=> p.names[0] === d.name ? 0.8:0.1)
            
            sankeyDiagram.selectAll(".link")
                .filter(p=> d.sourceLinks.length === 0)     // Target
              /*   .transition()
                .duration("50") */
                .style("opacity", p=> p.names[1] === d.name ? 0.8:0.1)
            d3.select(this)
              /*   .transition()
                .duration("50") */
                .style("opacity", 1)
        })
    linkEnter
        .on("mouseover", function (evt, d) {
            sankeyDiagram.selectAll(".link")
                .transition('mouseover')
                .duration("50")
                .style("opacity", 0.1)
            
            d3.select(this)
                .transition('mouseover')
                .duration("50")
                .style("opacity", 1)
        })
    sankeyDiagram
        .on('mouseout', function () {
            sankeyDiagram.select("g#tooltip").remove()
            sankeyDiagram.selectAll(".link")
                .style("opacity",d=> isRegion_sankey(d.source.name, current_specificRawData) && isRegion_sankey(d.target.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)
            sankeyDiagram.selectAll(".node")
                .style("opacity",d=> isRegion_sankey(d.name, current_specificRawData) && config.regions.length > 0 ? 0.1: 0.7)
        })

}
    
    