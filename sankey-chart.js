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

const sankeyDiagram = d3.select("#sankey-chart")
    .append("svg")
    .attr("viewBox", [0 , 0, width, height+50])

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

function setData(raw,config){
    // GET SELECTED DATASET   
    filename = fileName(config).json
    file_index = files.indexOf(filename)
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}

    input_data = input.raw_data               // used for metadata¡

    //--- Prepare layout for selected origin-destination regions
    let indexedSource = preparedData.nldata.sankey_layout.source  // list all origin node
    let indexedTarget = preparedData.nldata.sankey_layout.target  // list all destination nodes
    
    /* indexedNodes = indexedSource.concat(indexedTarget)     */          
    sort_links = preparedData.nldata.links  // sort links by source and target
        .filter(d=> indexedSource.includes(d.source) &&  indexedTarget.includes(d.target))
    
    graphData = graph(sort_links)                               // generate graph
  
    const sankey = d3.sankey()
        /* .nodeId(d=> d.index) */
        .nodeWidth(25)
        .nodePadding(8) 
        .nodeAlign(d3.sankeyJustify)
        .extent([[125, 25],[width-150, height]])
        // .nodeSort(null)
        /* .linkSort(null) */
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
    filename = fileName(config).json
    //// UTIL FUNCTIONS ////////////////////////////////////////////////////////////////////////
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
        for (var i = 0; i < input_data.regions.length; i++) {
            if (input_data.regions[i] > index) {
            break;
            } r = i;
        } return input_data.regions[r];
    }
    function isRegion(name) {
        return input_data.regions.includes(input_data.names.indexOf(name))
    } 
    function getMeta(name) {
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(input_data.names.indexOf(name))
        const region_name = input_data.names[region]
        const id = input_data.names.indexOf(name)
        const outflow = total_flows.filter(d=>d.name.includes(name))[0].outflow
        const inflow = total_flows.filter(d=>d.name.includes(name))[0].inflow
            return {flag: flag(name), region,region_name,id,outflow,inflow}
    }
    
    const getRegionColor = (name) => {
        a = input_data.regions.map((d)=> { return input_data.names[d]})
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
    ///////////////////////////////////////////////////////////////////////////////////////////
    
    
    //// DRAW VECTORS ////////////////////////////////////////////////////////////////////////
    var link = Links.selectAll("path")
        .data(links)

    var linkEnter = link.enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill","none")
        .attr("class", "link")
        .style("opacity",d=> isRegion(d.source.name) && config.regions.length > 0 ? 0.1: 0.7)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))
    
    link
        .transition('link')
        .duration(500)
        .attr("d", d3.sankeyLinkHorizontal())
        .style("opacity",d=> isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1: 0.7)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion(d.source.name) ? getRegionColor(d.source.name) :colorCountries(d.source.name))

    /* linkEnter.append("title")
      .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value / 1e3); }); */

    link.exit().remove();
    
    var node = Nodes.selectAll("g")
      .data(nodes);

    var nodeEnter = node.enter().append("g");

    nodeEnter.append("rect")
        .attr("class", "node")
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
        .attr("y", d=> d.y0)
        .attr("height", d=> d.y1 - d.y0 )
        .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.1: 0.7)
        
        .attr("width", d=> d.x1 - d.x0)
        .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        

    node.select("rect")  
        .transition('node')
        .duration(500)
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
        .attr("y", d => d.y0 )
        .attr("height", d=> d.y1 - d.y0 )
        /* .attr("width", d=>  isRegion(d.name) ? d.x1:d.x1 - d.x0) */
        .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.1: 0.7)

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
        .transition('text')
        .duration(500)
        .attr("font-size", d=> isRegion(d.name) ? "85%": "65%")
        .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("dy", "0.6em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.sourceLinks.length > 0
            ? getMeta(d.name).flag+ " "+  d.name
            :  d.name+ " "+ getMeta(d.name).flag
        )
    node.exit().remove();
    // OPEN REGIONS
    nodeEnter
        .on('click', function(evt, d) {
            // compute clicked region
              // config.regions[0] will be *source*
              // config.regions[1] will be *target*
            function nodeSide(a){
                a = d
                a.x0 < width / 2 ?  config.regions[0] = a.name : null;
                a.x0 > width / 2 ? config.regions[1] = a.name : null
            }
            nodeSide(d)
       
            update(raw,config);
        })
    /// CLOSE REGIONS
    nodeEnter
        .filter(d=>!isRegion(d.name))
        .on('click', function(evt, d) {
            /* console.log(d.name) */
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            // d3.selectAll("#tooltip")
            //     .remove() 
            update(raw,config)
            
        })    

    
    /* nodeEnter.append("title")
        .text(function(d) { return d.name + "\n" + formatValue(d.value); });

    node.select("title")
        .text(function(d) { return d.name + "\n" + formatValue(d.value); }); */    
    function tooltipCountry(evt,d)  {
        /* console.log(d) */
        var source = isRegion(input_data.names[d.source.index])  
            ? `<span style="color:${ getRegionColor(input_data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        
        var target = isRegion(input_data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(input_data.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
        
        if(filename.includes('stock')){
            var value = ` <div> 
                        <b>${formatValue(d.value)}</b> 
                        <br>in<br> </div> `
        } else {
            var value = ` <div> 
                        ▾<br>
                        <b>${formatValue(d.value)}</b> 
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
            .style("top", (evt.pageY-10)+"px")
            .style("left", (evt.pageX+10)+"px")
            .style("visibility", "visible")       
    }
    function tooltipRegion(evt,d) {
        let source = isRegion(d.name)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
                <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`
        if (input_data.matrix !== undefined) {
            /* console.log(getMeta(d.name)) */
            var outflow = formatValue(getMeta(d.name).outflow) 
            var inflow = formatValue(getMeta(d.name).inflow)
        }
        // console.log(filename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
        if (filename.includes('stock') ){
            return tooltip
                .html(`<span>\ ${source} </br>
                        Total emigrants: <b> ${outflow}</b> </br>
                        Total immigrants: <b> ${inflow} </b> </span>`)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`<span>\ ${source} </br>
                        Total Out: <b> ${outflow}</b> </br>
                        Total In: <b> ${inflow} </b> </span>`)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY-10)+"px")
                .style("left", (evt.pageX+10)+"px")
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
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))

        
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
                .style("opacity",0.1)
                .filter(p=> d.targetLinks.length === 0)     // Source
               /*  .transition()
                .duration("50") */
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
            sankeyDiagram.selectAll(".link")
                .style("opacity",d=> isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1: 0.7)
            sankeyDiagram.selectAll(".node")
                .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.1: 0.7)
        })

}
    
    