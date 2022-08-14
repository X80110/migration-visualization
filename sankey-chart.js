// Inspired by http://bl.ocks.org/nl-hugo/c1a6c6f5b459449b9832d9f3ef73cb7d
// Inspired by https://observablehq.com/@stroked/daily-options-activity-sankey
// (1) we'll set chart constants and utils
// (2) process graph
// (3) pass data and specify details to the chart


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
let input_data = {}
const sankey = d3.sankey()
    .nodeWidth(25)
    .nodePadding(12) 
    .extent([[5, 5],[width, height]])
    .nodeSort(null)
    .linkSort(null)
    
const sankeyDiagram = d3.select("#sankey-chart")
    .append("svg")
    .attr("viewBox", [0 , 0, width, height+50])

var Links = sankeyDiagram.append("g")
    .attr("class", "links");

var Nodes = sankeyDiagram.append("g")
    .attr("class", "nodes");

function setData(raw,config){
     // GET SELECTED DATASET   
     filename = fileName(config).json
     let file_index = files.indexOf(filename)
     let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
 
     // CREATE SELECTORS
     /* preparedData =  dataPrepare(input,config) */
     let data = preparedData.result
 
     let total_flows = preparedData.total_flows
     input = input.raw_data                  // used for metadata
     let previous = config.previous || data  // used to interpolate between layouts

    graphData = graph(preparedData.nldata.links)  

    let indexed_names = [...new Set(data.names)]

    sortedLinks = graphData.links
            .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[0]), indexed_names.indexOf(b.names[0]) )) //sources
            /* .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[1]), indexed_names.indexOf(b.names[1]) )) //targets */

    indexed_nodes = indexed_names.map(d=> {return {name: d}}) // create node-graph datastructure
    sortedNodes = indexed_nodes.concat(indexed_nodes)
       

    const sankey_data = () => {          
        const nodeCopy = JSON.parse(JSON.stringify(sortedNodes)); //.map((x) => _.cloneDeep(x));
        const linkCopy = JSON.parse(JSON.stringify(sortedLinks)); //.map((each) => _.cloneDeep(each));
    return sankey({ nodes: nodeCopy, links: linkCopy });
    }

    graph_data = sankey_data()   

    updateSankey(raw, input, config, graph_data)
}

function updateSankey(raw, input, config, graph_data){
    let file_index = files.indexOf(filename)
    filename = fileName(config).json
    /* input = {raw_data: raw.raw_data[0][file_index], metadata: raw.metadata} */
    graph_data = graph_data
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

    function getRegion(index) {
        var r = 0;
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index) {
            break;
            } r = i;
        } return input.regions[r];
    }
    
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
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
            return {flag: flag(name), region,region_name,id,outflow,inflow}
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
    /* console.log(graph_data) */

    var link = Links.selectAll("path")
        .data(graph_data.links )

    var linkEnter = link.enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill","none")
        .attr("class", "link")
        .attr("opacity",0.6)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))
    
    link
        .transition()
        .duration(500)
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))

    /* linkEnter.append("title")
      .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value / 1e3); }); */

    link.exit().remove();
    
    var node = Nodes.selectAll("g")
      .data(graph_data.nodes);

    var nodeEnter = node.enter().append("g");

    nodeEnter.append("rect")
        .attr("class", "link")
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
        .attr("y", d=> d.y0)
        .attr("height", d=> d.y1 - d.y0 )
        .attr("opacity",0.6)
        .attr("width", d=> d.x1 - d.x0)
        .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))

    node.select("rect")  
        .transition()
        .duration(500)
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
        .attr("y", function(d) { return d.y0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        /* .attr("width", d=>  isRegion(d.name) ? d.x1:d.x1 - d.x0) */
        .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))

    nodeEnter.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("font-size", d=> isRegion(d.name) ? "85%": "65%")
        .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
        .attr("dy", "0.6em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.sourceLinks.length > 0
            ? getMeta(d.name).flag+ " "+  d.name
            :  d.name+ " "+ getMeta(d.name).flag
        )

    node.select("text")
        .transition()
        .duration(500)
        .attr("font-size", d=> isRegion(d.name) ? "85%": "65%")
        .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("dy", "0.6em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.sourceLinks.length > 0
            ? getMeta(d.name).flag+ " "+  d.name
            :  d.name+ " "+ getMeta(d.name).flag
        )
    // OPEN REGIONS
    nodeEnter
        .on('click', function(evt, d) {
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            if (isRegion(d.name)){
               config.regions.push(d.name); // console.log(d.name)                
            } /* else {
                config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            } */
            /* console.log(config.regions) */
            update(raw,config);
        })
    /// CLOSE REGIONS
     node
        .filter(d=>!isRegion(d.name))
        .on('click', function(evt, d) {
            /* console.log(d.name) */
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            update(raw,config)
            
        })    
    /*     chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            config.previous = data 
            d3.selectAll("#tooltip")
                        .remove()    
            update(raw,config)
        }) */

    node.exit().remove();
    /* nodeEnter.append("title")
        .text(function(d) { return d.name + "\n" + format(d.value / 1e3); });

    node.select("title")
        .text(function(d) { return d.name + "\n" + format(d.value / 1e3); }); */
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
        /* console.log(d) */
        var source = isRegion(input.names[d.source.index])  
            ? `<span style="color:${ getRegionColor(input.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        
        var target = isRegion(input.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(input.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
        
        if(filename.includes('stock')){
            var value = ` <div> 
                        <b>${formatValue(d.value)}</b> 
                        <br>in<br> `
        } else {
            var value = ` <div> 
                        ▾<br>
                        <b>${formatValue(d.value)}</b> 
                        <br>  `
        }
        return tooltip
            .html(`\ <b>${source} </b> 
                        ${value} 
                        ${target}  `)
            .transition()
            .duration(50)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY-10)+"px")
            .style("left", (evt.pageX+10)+"px")
            .style("visibility", "visible")       
    }
    function tooltipRegion(evt,d) {
        let source = isRegion(d.name)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
                <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`
        if (input.matrix !== undefined) {
            /* console.log(getMeta(d.name)) */
            var outflow = formatValue(getMeta(d.name).outflow) 
            var inflow = formatValue(getMeta(d.name).inflow)
        }
        // console.log(filename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
        if (filename.includes('stock') ){
            return tooltip
                .html(`\ ${source} </br>
                        Total emigrants: <b> ${outflow}</b> </br>
                        Total immigrants: <b> ${inflow} </b> `)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`\ ${source} </br>
                        Total Out: <b> ${outflow}</b> </br>
                        Total In: <b> ${inflow} </b> `)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
                .style("visibility", "visible")
            }
        }
    linkEnter
        .on("mousemove", tooltipCountry)
        .on("mouseout",d=> tooltip.style("visibility", "hidden"));

    nodeEnter
        .on("mousemove", tooltipRegion)
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))
    
 /*    sankeyDiagram
        .on("mouseout", d=> tooltip.style("visibility", "hidden")) */
}
    
    