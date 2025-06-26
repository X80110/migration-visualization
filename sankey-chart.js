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

function getRegion_sankey(index, current_specificRawData) {
    if (!current_specificRawData || !current_specificRawData.regions) return 0; // Safety
    var r = 0;
    for (var i = 0; i < current_specificRawData.regions.length; i++) {
        if (current_specificRawData.regions[i] > index) {
        break;
        } r = i;
    } return current_specificRawData.regions[r];
}

function isRegion_sankey(name, current_specificRawData) {
    if (!current_specificRawData || !current_specificRawData.regions || !current_specificRawData.names) return false; // Safety
    const nameIndex = current_specificRawData.names.indexOf(name);
    if (nameIndex === -1) return false;
    return current_specificRawData.regions.includes(nameIndex);
} 

function getMeta_sankey(name, current_specificRawData, current_metadata_csv, current_prepared_flows) {
    const get_flag_for_name = (countryName, csv_data) => {
        if (!csv_data) return "";
        const country_row = csv_data.find(row => row.origin_name === countryName);
        return country_row ? country_row.origin_flag : "";
    };

    const nameIndex = current_specificRawData.names.indexOf(name);
    const flag_value = get_flag_for_name(name, current_metadata_csv);
    const region_val = getRegion_sankey(nameIndex, current_specificRawData);
    const region_name_val = nameIndex !== -1 && current_specificRawData.names[region_val] ? current_specificRawData.names[region_val] : "N/A";
    const id_val = nameIndex;
    
    const flow_data_for_name = current_prepared_flows ? current_prepared_flows.find(d=>d.name && d.name.includes(name)) : null; 
    const outflow_val = flow_data_for_name ? flow_data_for_name.outflow : 0;
    const inflow_val = flow_data_for_name ? flow_data_for_name.inflow : 0;

    return {flag: flag_value, region: region_val, region_name: region_name_val, id: id_val, outflow: outflow_val, inflow: inflow_val};
}

const getRegionColor_sankey = (name, current_specificRawData) => {
    if (!current_specificRawData || !current_specificRawData.regions || !current_specificRawData.names) return '#ccc'; // Safety
    const regionNames = current_specificRawData.regions.map((d)=> { return current_specificRawData.names[d]});
    const regionIndex = regionNames.indexOf(name);
    const colorPalette = current_specificRawData.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE'];
    return colorPalette[regionIndex % colorPalette.length];
}

const colorCountries_sankey = (name, current_specificRawData, current_metadata_csv, current_prepared_flows) => {
    const countryMeta = getMeta_sankey(name, current_specificRawData, current_metadata_csv, current_prepared_flows);
    let color_country = getRegionColor_sankey(countryMeta.region_name, current_specificRawData);
    let hsl = d3.hsl(color_country);
    // countryMeta contains id and region
    const r = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
    return r[(countryMeta.id - countryMeta.region) % 5]; // Ensure countryMeta.id and .region are numbers
}
// --- End of Top-Level Helper Functions ---


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
    .attr("viewBox", [-(width/5) , -10, width, height+50])

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
// - `preparedData` is now passed in directly, removing reliance on global state.
function setData(specificRawData, metadata, preparedData, config){
    // GET SELECTED DATASET - This section is removed as specificRawData is now passed directly.
    // filename = fileName(config).json; // Still needed for tooltip logic later, can be derived from config
    // file_index = files.indexOf(filename); // 'files' global might not be reliable
    // let input_alias = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}; // Old way

    // `input_data` was an alias for the specific raw data JSON. Now use `specificRawData`.
    let input_data = specificRawData; // Used for metadata like .regions, .names for getMeta, getRegion etc.
                                      // Also for specificRawData.matrix for tooltip logic.

    // `preparedData` is now an argument.
    // The following lines use `preparedData` that's passed in.
    let indexedSource = preparedData.nldata.sankey_layout.source;  // list all origin node
    let indexedTarget = preparedData.nldata.sankey_layout.target;  // list all destination nodes
    
    /* indexedNodes = indexedSource.concat(indexedTarget)     */          
    // Ensure `preparedData.nldata.links` exists and is an array before filtering
    let sort_links = [];
    if (preparedData && preparedData.nldata && Array.isArray(preparedData.nldata.links)) {
        sort_links = preparedData.nldata.links  // sort links by source and target
            .filter(d=> indexedSource.includes(d.source) &&  indexedTarget.includes(d.target));
    } else {
        console.error("Sankey: preparedData.nldata.links is not available or not an array.", preparedData);
        // Potentially clear the sankey chart or show an error
        Links.selectAll("path").remove();
        Nodes.selectAll("g").remove();
        return; // Exit if data is not properly structured
    }
    
    graphData = graph(sort_links); // generate graph
  
    const sankey = d3.sankey()
        /* .nodeId(d=> d.index) */
        .nodeWidth(16)
        .nodePadding(8) 
        /* .nodeAlign(d3.sankeyJustify) */
        .size([width-300, height])
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
    const current_metadata_csv = metadata;
    const current_prepared_flows = preparedData.flows;


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
        .attr("x", d => d.x0 < width / 2 
            ? d.x0-3
            : d.x0+3 
            )
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
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
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
            if(d.x0 < width / 2 && isReg) {return d.x1+6}
            if(d.x0 > width / 2 && isReg) {return d.x0-6}
            if(d.x0 < width / 2 && !isReg) {return d.x1-26}
            if(d.x0 > width / 2 && !isReg) {return d.x0+26}
        })
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("font-size", d=> isRegion_sankey(d.name, current_specificRawData) ? "85%": "65%")
        .attr("font-weight", d=> isRegion_sankey(d.name, current_specificRawData) ? "600": "400")
        
        .attr("dy", "0.6em")
        .attr("text-anchor", d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < width / 2 && isReg) {return "start"}
            if(d.x0 > width / 2 && isReg) {return "end"}
            if(d.x0 < width / 2 && !isReg) {return "end"}
            if(d.x0 > width / 2 && !isReg) {return "start"}
        })
        .text(d => {
            const meta = getMeta_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows);
            return d.sourceLinks.length > 0
                ?  d.name+ " "+ meta.flag
                :  meta.flag+ " "+  d.name;
        })


    node.select("text")
        .transition('text')
        .duration(500)
        .attr("font-size", d=> isRegion_sankey(d.name, current_specificRawData) ? "85%": "60%")
        .attr("font-weight", d=> isRegion_sankey(d.name, current_specificRawData) ? "600": "400")
        .attr("y", d => (d.y1 + d.y0) / 2 -4)
        .attr("x",d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < width / 2 && isReg) {return d.x1+6}
            if(d.x0 > width / 2 && isReg) {return d.x0-6}
            if(d.x0 < width / 2 && !isReg) {return d.x1-26}
            if(d.x0 > width / 2 && !isReg) {return d.x0+26}
        })
        .attr("dy", "0.6em")
        .attr("text-anchor", d =>{ 
            const isReg = isRegion_sankey(d.name, current_specificRawData);
            if(d.x0 < width / 2 && isReg) {return "start"}
            if(d.x0 > width / 2 && isReg) {return "end"}
            if(d.x0 < width / 2 && !isReg) {return "end"}
            if(d.x0 > width / 2 && isReg) {return "start"}
        })
        .text(d => {
            const meta = getMeta_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows);
            return d.sourceLinks.length > 0
                ?  d.name+ " "+ meta.flag
                :  meta.flag+ " "+  d.name;
        })
    node.exit().remove();
    // OPEN REGIONS
    nodeEnter
        .on('click', function(evt, d) {
            // compute clicked region
              // config.regions[0] will be *source*
              // config.regions[1] will be *target*
            function nodeSide(a){ // This function uses 'd' from the .on('click') scope.
                a = d
                a.x0 < width / 2 ?  config.regions[0] = a.name : null;
                a.x0 > width / 2 ? config.regions[1] = a.name : null
            }
            nodeSide(d)
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    /// CLOSE REGIONS
    nodeEnter
        .filter(d=>!isRegion_sankey(d.name, current_specificRawData))
        .on('click', function(evt, d) {
            const meta = getMeta_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows);
            config.regions.splice( config.regions.indexOf( meta.region_name ), 1);
            // d3.selectAll("#tooltip")
            //     .remove() 
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
            
        })    

    
    /* nodeEnter.append("title")
        .text(function(d) { return d.name + "\n" + formatValue(d.value); });

    node.select("title")
        .text(function(d) { return d.name + "\n" + formatValue(d.value); }); */    
    function tooltipCountry(evt,d)  {
        const sourceMeta = getMeta_sankey(d.source.name, current_specificRawData, current_metadata_csv, current_prepared_flows);
        const targetMeta = getMeta_sankey(d.target.name, current_specificRawData, current_metadata_csv, current_prepared_flows);

        var source = isRegion_sankey(d.source.name, current_specificRawData)  
            ? `<span style="color:${ getRegionColor_sankey(d.source.name, current_specificRawData)}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries_sankey(d.source.name, current_specificRawData, current_metadata_csv, current_prepared_flows)}"> ${sourceMeta.flag+ " "+  d.source.name}</span>`
        
        var target = isRegion_sankey(d.target.name, current_specificRawData) 
            ? `<span style="color:${ getRegionColor_sankey(d.target.name, current_specificRawData)}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries_sankey(d.target.name, current_specificRawData, current_metadata_csv, current_prepared_flows)}"> ${targetMeta.flag+ " "+  d.target.name}</span>` // Note: color used target's source color before, fixed to target
        
        let currentFilename = fileName(config).json; 
        if(currentFilename.includes('stock')){
            var value = ` <div> 
                        <b>${formatValue_sankey(d.value)}</b> 
                        <br>in<br> </div> `
        } else {
            var value = ` <div> 
                        ▾<br>
                        <b>${formatValue_sankey(d.value)}</b> 
                        <br> </div> `
        }
        return tooltip
            .html(`<span>\ <b>${source} </b> 
                        ${value} 
                        ${target}  </span>`)
            .transition('tooltip')
            .duration(50)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY+20)+"px")
            .style("left", (evt.pageX+30)+"px")
            .style("visibility", "visible")       
    }
    function tooltipRegion(evt,d) {
        const meta = getMeta_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows);
        let source = isRegion_sankey(d.name, current_specificRawData)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${meta.region_name}</span></br>
                <span style="color:white"><b> ${meta.flag+ " "+  d.name}</b></span>`;
        
        var outflow = formatValue_sankey(meta.outflow); // outflow & inflow are now directly from meta
        var inflow = formatValue_sankey(meta.inflow);
        
        let currentFilename = fileName(config).json; 
        // console.log(currentFilename.includes("stock")) ---> false ? then syntax is outflow/inflow instead of emigrants/immigrants
        if (currentFilename.includes('stock') ){
            return tooltip
                .html(`<span>\ ${source} </br>
                        Total emigrants: <b> ${outflow}</b> </br>
                        Total immigrants: <b> ${inflow} </b> </span>`)
                .style('background-color',isRegion_sankey(d.name, current_specificRawData) 
                                        ? getRegionColor_sankey(d.name, current_specificRawData)
                                        : colorCountries_sankey(d.name, current_specificRawData, current_metadata_csv, current_prepared_flows))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`<span>\ ${source} </br>
                        Total Out: <b> ${outflow}</b> </br>
                        Total In: <b> ${inflow} </b> </span>`)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
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
                .style("opacity",d=> isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1: 0.7)
            sankeyDiagram.selectAll(".node")
                .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.1: 0.7)
        })

}
    
    