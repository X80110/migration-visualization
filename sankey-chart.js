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
const sankey = d3.sankey()
    .nodeWidth(25)
    .nodePadding(12) 
    .extent([[5, 5],[width, height]])
const sankeyDiagram = d3.select("#sankey")
    .append("svg")
    .attr("viewBox", [0 , 0, width, height])

var Links = sankeyDiagram.append("g")
    .attr("class", "links");

var Nodes = sankeyDiagram.append("g")
    .attr("class", "nodes");

function setData(raw,config){
    let file_index = files.indexOf(filename)
    filename = fileName(config).json
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
        
    preparedData = dataPrepare(input,config)
    data = {...preparedData.result}
    total_flows = preparedData.total_flows
    graphData = graph(preparedData.nldata.links)  

    let indexed_names = [...new Set(input.raw_data.names)]

    sortedLinks = graphData.links
            .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[0]), indexed_names.indexOf(b.names[0]) )) //sources
            .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[1]), indexed_names.indexOf(b.names[1]) )) //targets
    /* console.log(sortedLinks) */
    sortedNodes = graphData.nodes.sort((a, b) => indexed_names.indexOf(a) - indexed_names.indexOf(b));

    const sankey_data = () => {          
        const nodeCopy = JSON.parse(JSON.stringify(sortedNodes)); //.map((x) => _.cloneDeep(x));
        const linkCopy = JSON.parse(JSON.stringify(sortedLinks)); //.map((each) => _.cloneDeep(each));
    return sankey({ nodes: nodeCopy, links: linkCopy });
    }

    graph_data = sankey_data()   

    updateSankey(raw,config,graph_data)
}

function updateSankey(raw,config,graph_data){
    let file_index = files.indexOf(filename)
    filename = fileName(config).json
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
    
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
        for (var i = 0; i < input.raw_data.regions.length; i++) {
            if (input.raw_data.regions[i] > index) {
            break;
            } r = i;
        } return input.raw_data.regions[r];
    }
    function isRegion(name) {
        return input.raw_data.regions.includes(input.raw_data.names.indexOf(name))
    } 
    function getMeta(name) {
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(input.raw_data.names.indexOf(name))
        const region_name = input.raw_data.names[region]
        const id = input.raw_data.names.indexOf(name)
        const outflow = total_flows.filter(d=>d.name.includes(name))[0].outflow
        const inflow = total_flows.filter(d=>d.name.includes(name))[0].inflow
            return {flag: flag(name), region,region_name,id,outflow,inflow}

    }
    const getRegionColor = (name) => {
        a = input.raw_data.regions.map((d)=> { return input.raw_data.names[d]})
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


    var link = Links.selectAll("path")
        .data(graph_data.links )

    var linkEnter = link.enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill","none")
        .attr("class", "link")
        .attr("opacity",0.6)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
    
    link
        .transition()
        .duration(500)
        .attr("stroke-width", function(d) { return Math.max(1, d.width); })
        /* .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0])) */
        .attr("d", d3.sankeyLinkHorizontal())

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
        // .attr("x", function(d) { return d.x0; })
        .attr("y", function(d) { return d.y0; })
        .attr("height", function(d) { return d.y1 - d.y0; });
        // .attr("width", function(d) { return d.x1 - d.x0; });

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
        /* .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6) */
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("dy", "0.6em")
        .text(d => d.sourceLinks.length > 0
            ? getMeta(d.name).flag+ " "+  d.name
            :  d.name+ " "+ getMeta(d.name).flag
        )
    nodeEnter
    // OPEN REGIONS
        .on('click', function(evt, d) {
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            config.regions.push(d.name); // console.log(d.name)                
            update(raw,config);
        })
    /// CLOSE REGIONS
    d3.selectAll('.node')
        .filter(d=>!isRegion(d.name))
        .on('click', function(evt, d) {
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            update(raw,config)
            
        })     
    
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
        var source = isRegion(data.names[d.source.index])
            ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
        
        var target = isRegion(data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
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
        if (data.matrix !== undefined) {
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
    d3.selectAll(".link")
        .on("mousemove", tooltipCountry)
        .on("mouseout",d=> tooltip.style("visibility", "hidden"));

    d3.selectAll(".nodes g")
        .on("mousemove", tooltipRegion)
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))
    
    
}
    
    
    // // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW // DRAW 
    // // DRAW // DRAW // DRAW     // DRAW // DRAW // DRAW     // DRAW // DRAW // DRAW     // DRAW // DRAW // DRAW     // DRAW // DRAW // DRAW     // DRAW // DRAW // DRAW 
    // function drawSankey(raw, config){ 
    //     let file_index = files.indexOf(filename)
    //     filename = fileName(config).json
    //     let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
        
        
    //     function formatValue(nStr, seperator) {
    //         seperator = seperator || ','
    //         nStr += ''
    //         x = nStr.split('.')
    //         x1 = x[0]
    //         x2 = x.length > 1 ? '.' + x[1] : ''
    //         var rgx = /(\d+)(\d{3})/

    //         while (rgx.test(x1)) {
    //         x1 = x1.replace(rgx, '$1' + seperator + '$2');
    //         }
    //         return x1 + x2;
    //     }
    //     Number.prototype.mod = function (n) {
    //         return ((this % n) + n) % n
    //     };

    //     function getRegion(index) {
    //         var r = 0;
    //         for (var i = 0; i < input.raw_data.regions.length; i++) {
    //             if (input.raw_data.regions[i] > index) {
    //             break;
    //             } r = i;
    //         } return input.raw_data.regions[r];
    //     }
    //     function isRegion(name) {
    //         return input.raw_data.regions.includes(input.raw_data.names.indexOf(name))
    //     } 
    //     function getMeta(name) {
    //         const flag = (name) =>{ 
    //             let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
    //             return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
    //         }
    //         const region = getRegion(input.raw_data.names.indexOf(name))
    //         const region_name = input.raw_data.names[region]
    //         const id = input.raw_data.names.indexOf(name)
    //         const outflow = total_flows.filter(d=>d.name.includes(name))[0].outflow
    //         const inflow = total_flows.filter(d=>d.name.includes(name))[0].inflow
    //          return {flag: flag(name), region,region_name,id,outflow,inflow}
    
    //     }
    //     const getRegionColor = (name) => {
    //         a = input.raw_data.regions.map((d)=> { return input.raw_data.names[d]})
    //         b = a.indexOf(name)
    //         return colors[b]
    //     }
    //     const colorCountries = (name) => {
    //         let color_country = getRegionColor(getMeta(name).region_name)
    //         let hsl = d3.hsl(color_country)
    //         let d =  getMeta(name)
    //         r = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)]
    //         return r[(d.id-d.region)%5]
    //     }
        
    //     preparedData = dataPrepare(input,config)
    //     data = {...preparedData.result}
        
    //     /* nldata = {...preparedData.nldata} */
    //     /* unfilteredNL = {...preparedData.unfilteredNL} */
    //     /* console.log(unfilteredNL) */
    //     total_flows = preparedData.total_flows
    //     graphData = graph(preparedData.nldata.links)
    //     /* allNodes = input.raw_data.names.map(d=>{
    //         return { name: d,
    //             id: input.raw_data.names.indexOf(d)
    //         }}
    //         ) */
    //     /* graphData.nodes = allNodes */
    //     /* console.log(graphData) */

    //     sankey = d3.sankey()
    //     /* .nodeId(d=>d.id) */
    //         /* .nodeSort((a, b) => {d3.descending(a.name, b.name)}) */
    //         /* .nodeSort((a, b) => indexed_names.indexOf(b)- indexed_names.indexOf(a))
    //         .linkSort((a, b) => indexed_names.indexOf(a.names[0]) - indexed_names.indexOf(b.names[1])) */
    //         .nodeWidth(25)
    //         .nodePadding(12)
    //         /* .nodeId((d) => d.name) */
    //         .extent([
    //         [5, 5],
    //         [width, height]
    //         ])
    //     let indexed_names = [...input.raw_data.names]
    //     /* console.log(indexed_names) */
    //     indexed_names = [...new Set(indexed_names)]
    
    //     sortedLinks = graphData.links
    //             .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[0]), indexed_names.indexOf(b.names[0]) ))
    //             .sort((a,b) => d3.ascending(indexed_names.indexOf(a.names[1]), indexed_names.indexOf(b.names[1]) ))
    //     console.log(sortedLinks)
    //     sortedNodes = graphData.nodes.sort((a, b) => indexed_names.indexOf(a) - indexed_names.indexOf(b));
    
    //     const sankey_data = () => {          
    //         const nodeCopy = JSON.parse(JSON.stringify(sortedNodes)); //.map((x) => _.cloneDeep(x));
    //         const linkCopy = JSON.parse(JSON.stringify(sortedLinks)); //.map((each) => _.cloneDeep(each));
    //         return sankey({ nodes: nodeCopy, links: linkCopy });
    //     }
       
    //     initialGraph = sankey_data()
     
        
    //     // add in the links
    //     link = svg.append("g")
    //         .selectAll(".link")
    //             .data(initialGraph.links)
    //         .enter().append("path")
    //             .attr("d", d3.sankeyLinkHorizontal())
    //             .attr("fill", "none")
    //             .attr("opacity",0.6)
    //             .attr("class", "link")
    //             .attr("stroke-width", d=>d.width)
    //             .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
    //     /* console.log(link.data()) */
    //     link
    //         .on("mouseover", function (e, i) {
    //             d3.select(this)
    //                 .transition()
    //                 .duration("50")
    //                 .style("mix-blend-mode", "multiply")
    //                 .attr("opacity", "0.85")
    //         })
        
    //         .on('mouseout', function () {
    //             d3.select(this).transition()
    //                 .duration('50')
    //                 .style("mix-blend-mode", "no")
    //                 .attr('opacity', '0.5')
    //         })
    //     // add in the nodes
        
    //     node = svg.append("g").selectAll(".node")
    //         .data(initialGraph.nodes)///* .filter(d=> names.includes(d.name)) */)
    //         .enter().append("g")
    //         /* .attr("class", d=>console.log(d)) */
    //     // add the rectangles for the nodes
    //     rects = node.append("rect")
    //         .attr("opacity", "0.5")
    //         .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
    //         .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
    //         .attr("y", d => d.y0)
    //         .attr("height", d => d.y1 - d.y0)
    //         .attr("width", d => d.x1 - d.x0)
        
    //     /// OPEN REGIONS
    //         .on('click', function(evt, d) {
    //             if (config.regions.length + 1 > config.maxRegionsOpen) {
    //                 config.regions.shift();       
    //             }
    //             config.regions.push(d.name) // console.log(d.name)                
    //             update(raw,config)
    //         })
    //     /// CLOSE REGIONS
    //     d3.selectAll('.node')
    //         .filter(d=>!isRegion(d.name))
    //         .on('click', function(evt, d) {
    //             config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
    //             update(raw,config)
    //         })     
    //     // add in the title for the nodes
    //     text = node.append("text")
    //         .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    //         .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    //         .attr("font-size", d=> isRegion(d.name) ? "80%": "65%")
    //         .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    //         .attr("dy", "0.6em")
    //         .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    //         .text(d => d.sourceLinks.length > 0
    //                 ? getMeta(d.name).flag+ " "+  d.name
    //                 :  d.name+ " "+ getMeta(d.name).flag
    //         )
        
    //     const tooltip = d3.select('body').append('g')
    //         .attr('id', 'tooltip')
    //         .style('background-color','#ffffff')
    //         .style('padding','1em')
    //         .style('border-radius','4px')
    //         .style('position', 'absolute')
    //         .style('text-align', 'center')
    //         .style('visibility', 'hidden')
    //         .style('box-shadow','rgba(0, 0, 0, 0.35) 0px 5px 15px')   
            
    //     function tooltipCountry(evt,d)  {
    //         var source = isRegion(data.names[d.source.index])
    //             ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
    //             : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
            
    //         var target = isRegion(data.names[d.target.index] )
    //             ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
    //             : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
            
    //         if(filename.includes('stock')){
    //             var value = ` <div> 
    //                         <b>${formatValue(d.value)}</b> 
    //                         <br>in<br> `
    //         } else {
    //             var value = ` <div> 
    //                         ▾<br>
    //                         <b>${formatValue(d.value)}</b> 
    //                         <br>  `
    //         }
    //         return tooltip
    //             .html(`\ <b>${source} </b> 
    //                         ${value} 
    //                         ${target}  `)
    //             .transition()
    //             .duration(50)
    //             .style('background-color','#ffffff')
    //             .style('padding','1em')
    //             .style("top", (evt.pageY-10)+"px")
    //             .style("left", (evt.pageX+10)+"px")
    //             .style("visibility", "visible")       
    //     }
    //     function tooltipRegion(evt,d) {
    //         let source = isRegion(d.name)
    //             ? `<span style="color:white"> <b>${d.name}</b></span>`
    //             : `<span style="color:white"> ${getMeta(d.name).region_name}</span></br>
    //                 <span style="color:white"><b> ${getMeta(d.name).flag+ " "+  d.name}</b></span>`
    //         if (data.matrix !== undefined) {
    //             /* console.log(getMeta(d.name)) */
    //             var outflow = formatValue(getMeta(d.name).outflow) 
    //             var inflow = formatValue(getMeta(d.name).inflow)
    //         }
    //         // console.log(filename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
    //         if (filename.includes('stock') ){
    //             return tooltip
    //                 .html(`\ ${source} </br>
    //                         Total emigrants: <b> ${outflow}</b> </br>
    //                         Total immigrants: <b> ${inflow} </b> `)
    //                 .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
    //                 .style("top", (evt.pageY-10)+"px")
    //                 .style("left", (evt.pageX+10)+"px")
    //                 .style("visibility", "visible")
    //         }
    //         else {
    //             return tooltip
    //                 .html(`\ ${source} </br>
    //                         Total Out: <b> ${outflow}</b> </br>
    //                         Total In: <b> ${inflow} </b> `)
    //                 .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
    //                 .style("top", (evt.pageY-10)+"px")
    //                 .style("left", (evt.pageX+10)+"px")
    //                 .style("visibility", "visible")
    //             }
    //         }
    //     d3.selectAll(".link")
    //         .on("mousemove", tooltipCountry)
    //         .on("mouseout", function(){
    //              tooltip.style("visibility", "hidden");
    //         })

    //     d3.selectAll(".node")
    //         .on("mousemove", tooltipRegion)
    //         .on("mouseout", function(){
    //             return tooltip.style("visibility", "hidden");
    //         })
    
        
    // } //end createSankey


    // // UPDATE // UPDATE // UPDATE   // UPDATE // UPDATE // UPDATE// UPDATE // UPDATE // UPDATE// UPDATE // UPDATE // UPDATE
    // // UPDATE // UPDATE // UPDATE       // UPDATE // UPDATE // UPDATE    // UPDATE // UPDATE // UPDATE    // UPDATE // UPDATE // UPDATE
    // function updateSankey(raw,config){
    //     let file_index = files.indexOf(filename)
    //     filename = fileName(config).json
    //     let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
    //     let indexed_names = [...input.raw_data.names]
    
    //     function isRegion(name) {
    //         return input.raw_data.regions.includes(input.raw_data.names.indexOf(name))
    //     }    
    //     function getMeta(name) {
    //         function getRegion(index) {
    //             var r = 0;
    //             for (var i = 0; i < input.raw_data.regions.length; i++) {
    //                 if (input.raw_data.regions[i] > index) {
    //             break } r = i;
    //             } return input.raw_data.regions[r];
    //         }
    //         const flag = (name) =>{ 
    //             let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
    //             return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
    //         }
    //         const region = getRegion(input.raw_data.names.indexOf(name))
    //         const region_name = input.raw_data.names[region]
    //         const id = input.raw_data.names.indexOf(name)
    //         const outflow = (name) =>{ total_flows.filter(d=>d.name.includes(name))[0].outflow }  
    //         const inflow = (name) =>{total_flows.filter(d=>d.name.includes(name))[0].inflow }  
    //         return {flag: flag(name), region,region_name,id,outflow,inflow}
    //     }
    //     const getRegionColor = (name) => {
    //             a = input.raw_data.regions.map((d)=> { return input.raw_data.names[d]})
    //             b = a.indexOf(name)
    //         return colors[b]
    //     }
    //     const colorCountries = (name) => {
    //             let color_country = getRegionColor(getMeta(name).region_name)
    //             let hsl = d3.hsl(color_country)
    //             let d =  getMeta(name)
    //             r = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)]
    //         return r[(d.id-d.region)%5]
    //     }

    //     /* console.log(names) */
    //     prepareNewData = dataPrepare(input,config)
    //     newGraphData = graph(prepareNewData.nldata.links)
    //     indexed_names = [...new Set(indexed_names)]

    //     sortedLinks = newGraphData.links.sort((a, b) => indexed_names.indexOf(a.names[0]) - indexed_names.indexOf(b.names[0]) ||indexed_names.indexOf(a.names[1]) - indexed_names.indexOf(b.names[1]) );

    //     sortedNodes = newGraphData.nodes.sort((a, b) => indexed_names.indexOf(a) - indexed_names.indexOf(b));
    //     console.log(sortedLinks)
    
    //     const sankey_data = () => {          
    //         const nodeCopy = JSON.parse(JSON.stringify(sortedNodes)); //.map((x) => _.cloneDeep(x));
    //         const linkCopy = JSON.parse(JSON.stringify(sortedLinks)); //.map((each) => _.cloneDeep(each));
    //         return sankey({ nodes: nodeCopy, links: linkCopy });
    //     }

    //     const {nodes, links} = sankey_data()
    //     newGraph = sankey_data()
    //     // select all links and update data
    //     link
    //         .data(newGraph.links)
    //         .transition()
    //         .duration(500)
    //         .attr("fill", "none")
    //         .attr("stroke-width",d=> d.width)
    //         .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
    //         .attr("d", d3.sankeyLinkHorizontal())
        

    //         // add the rectangles for the nodes
    //     rects.data(newGraph.nodes)
    //         .transition()
    //         .duration(500)
    //         .attr("y", d => d.y0)
    //         .attr("height", d => d.y1 - d.y0)
        
    //     text.data(newGraph.nodes)
    //         .transition()
    //         .duration(500)
    //         .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    //         .attr("font-size", d=> isRegion(d.name) ? "80%": "65%")
    //         .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    //         .attr("dy", "0.6em")
    //         .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    //         .text(d => d.sourceLinks.length > 0
    //             ? getMeta(d.name).flag+ " "+  d.name
    //             :  d.name+ " "+ getMeta(d.name).flag
    //         )    
    // } //end updateSankey
    
    
    
    
    
    // // function drawSankey(raw, config){
    // //     let file_index = files.indexOf(filename)
    // //     filename = fileName(config).json
    // //     let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
    // //     function setSelectors() {
    // //         // YEAR SELECTOR 
    
    // //         const allYears = [...new Set(Object.keys(input.raw_data.matrix))]
    // //         const lastYearPlusFive = (+allYears[allYears.length-1]+5).toString()
    // //         /* console.log(lastYearPlusFive) */
    // //         let allRangeYears = allYears.concat(lastYearPlusFive)
    // //         /* console.log(allRangeYears) */
    
    // //         let sliderticks = document.getElementById("sliderticks");
    // //         let slider = document.getElementById("selectYear");
    // //         let output = document.getElementById("yearRange");
    // //         let sliderValue = parseInt(slider.value)
            
    // //         function getTicks (year){
    // //             console.log(year)
    // //             let ticks = allYears.map(col =>
    // //                  +col === +year 
    // //                  ? `<p><b>${col}</b></p   >`
    // //                  : `<p>${col}</p   >`
    // //                 ).join("");
    // //             sliderticks.innerHTML = ticks
    // //         }
    // //         slider.setAttribute("min", allYears[0]);
    // //         slider.setAttribute("max", allYears[allYears.length-1]);
    
    // //         if (filename.includes("stock")){
    // //             function getTicks (year){
    // //                 /* console.log(year) */
    // //                 let ticks = allYears.map(col =>
    // //                      +col === +year 
    // //                      ? `<p style="color:black"><b>${col}</b></p   >`
    // //                      : `<p style="color:black">${col}</p   >`
    // //                     ).join("");
    // //                 sliderticks.innerHTML = ticks
    // //             }
    // //             getTicks(sliderValue)
    // //             // Update the current slider value (each time you drag the slider handle)
    // //             slider.oninput = function() {
    // //                 let value = parseInt(this.value)
    // //                 getTicks(value)
    // //             }
    // //         }
    // //         else if (filename.includes("flow")) {
    // //             function getTicks (year){
    
    // //                 let ticks = allRangeYears.map(col =>
    // //                      +col === +year  || +col === +year +5
    // //                      ? `<p><b>${col}</b></p   >`
    // //                      : `<p>${col}</p   >`
    // //                     ).join("");
    // //                 sliderticks.innerHTML = ticks
    // //             }
    // //             getTicks(sliderValue)
    // //              // Update the current slider value (each time you drag the slider handle)
    // //              slider.oninput = function() {
    // //                  let value = parseInt(this.value)
    // //                  getTicks(value)
    // //              }
    // //          }            
    // //     }
    // //     setSelectors()
    
    // //     // Get region index for a given name
    // //     function getRegion(index) {
    // //         var r = 0;
    // //         for (var i = 0; i < input.raw_data.regions.length; i++) {
    // //             if (input.raw_data.regions[i] > index) {
    // //             break;
    // //             }
    // //             r = i;
    // //         }
    // //         return input.raw_data.regions[r];
    // //     }
    
    // //     // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    // //     function isRegion(name) {
    // //         return input.raw_data.regions.includes(input.raw_data.names.indexOf(name))
    // //     } 
    // //     total_flows = dataPrepare(input,config).total_flows
        
    // //     function getMeta(name) {
    // //         const flag = (name) =>{ 
    // //             let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
    // //             return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
    // //         }
    // //         const region = getRegion(input.raw_data.names.indexOf(name))
            
    // //         const region_name = input.raw_data.names[region]
    // //         const id = input.raw_data.names.indexOf(name)
    
    // //         const outflow = (name) =>{
    // //             total_flows.filter(d=>d.name.includes(name))[0].outflow 
    // //         }  
    // //         const inflow = (name) =>{
    // //             total_flows.filter(d=>d.name.includes(name))[0].inflow 
    // //         }  
            
            
    // //         return {flag: flag(name), region,region_name,id,outflow,inflow}
    
    // //     }
    // //     const getRegionColor = (name) => {
    // //         a = input.raw_data.regions.map((d)=> { return input.raw_data.names[d]})
    // //         b = a.indexOf(name)
    // //         return colors[b]
    // //     }
        
    // //     const colorCountries = (name) => {
    // //         let color_country = getRegionColor(getMeta(name).region_name)
    // //         let hsl = d3.hsl(color_country)
    // //         let d =  getMeta(name)
    // //         r = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)]
    // //         return r[(d.id-d.region)%5]
    // //     }
        
    // //     graphData = graph(preparedData.nldata.links)
        
    // //     /* console.log(total_flows) */
    // //     /* console.log(graph.links) */
    // //     const color = d3.scaleOrdinal(input.raw_data.names, colors)
    
    // //     // Create svg 
    // //     const svg = d3.select("#sankey")
    // //         .append("svg")
    // //         .attr("viewBox", [0 , 0, width, height])
        
    // //     const t = svg.transition()
    // //         .duration(500);
    
    // //     /* console.log( gNodes) */
    // //     sankey = d3.sankey()
    // //         /* .nodeSort(d=> console.log(d)  ) */
    // //         // .nodeSort(/* d=> d.index,  */d=> console.log(d))
    // //         .nodeSort(d=> getMeta(d.name).id,d=> getMeta(d.name).id)// console.log(d3.ascending(getMeta(d.name))))
    // //         /* .nodeSort(d=> getMeta(d.name).region && getMeta(d.name).id)// console.log(d3.ascending(getMeta(d.name)))) */
    // //         .nodeWidth(25)
    // //         .nodePadding(12) 
    // //         .extent([[0, 5], [width, height - 5]])
        
            
    // //     const {nodes, links} = sankey({
    // //         nodes: graphData.nodes.map(d => Object.assign({}, d)),
    // //         links: graphData.links.map(d => Object.assign({}, d))
    // //         });
    
    // //     const total = d3.sum(graphData.links, d => d.value);
    
    // //     labelPositioner = (d) => {
    // //         const startLabel = (d) => d.depth === 0;
    // //         const strikeLabel = (d) => d.depth === 1;
    // //         // (d) => d.x0 < leftMargin;
    // //         // const endLabel = (d) => d.x0 > width - 100;
            
    // //         //  ? d.x0 - (d.x1 - d.x0) / 2
    // //         return `translate(${
    // //           startLabel(d) ? d.x0 - 15 : strikeLabel(d) ? d.x1 + 15 : d.x1 + 15
    // //         },${(d.y1 + d.y0) / 2})`;
    // //       }
    
    // //     let div = d3.select("body").append("div")
    // //         .attr("class", "tooltip")
    // //         .style("display", "none")
    // //         .style('z-index', 100)
    // //         .text("new tooltip");
      
    // //     let renderNodes = svg.append("g")
    // //       .selectAll("g")
    // //       .attr("class",".nodes")
    // //       .data(nodes, d=> d.name)
    // //       .join(
    // //             (enter) => {
    // //             let g = enter.append("g")
    // //                 .attr("class", "node");
    // //                 g.append("rect")    
    // //                 .attr("opacity", "0.5")
    // //                 .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
    // //                 .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
    // //                 .attr("y", d => d.y0)
    // //                 .attr("height", d => d.y1 - d.y0)
    // //                 .attr("width", d => d.x1 - d.x0)
    // //                 .on("mouseover", function (e, i) {
    // //                     div.html(d => i.name + "<br>" + Math.round(i.value/total*100) + "% (" + i.value.toLocaleString() + " <span style='text-transform: lowercase'></span>)")
    // //                     .style("display", "block");
    // //                     })
    // //                 .on("mousemove", function (i, e) {
    // //                     div.style("top", e.pageY - 48 + "px")
    // //                     .style("left", e.pageX + "px");
    // //                     })
    // //                 .on('mouseout', function () {
    // //                     div.style("display", "none");
    // //                     })
    // //             /// OPEN REGIONS
    // //                 .on('click', function(evt, d) {
    // //                     if (config.regions.length + 1 > config.maxRegionsOpen) {
    // //                         config.regions.shift();       
    // //                     }
    // //                     config.regions.push(d.name) // console.log(d.name)                
    // //                     preparedData = graph(dataPrepare(input,config).nldata.links)
    // //                     d3.select(".links").data(preparedData.links)
    // //                     d3.select(".nodes").data(preparedData.nodes)
    // //                     update(raw,config)
    // //                     })
    // //             /// CLOSE REGIONS
    // //             d3.selectAll('.node')
    // //                 .filter(d=>!isRegion(d.name))
    // //                 .on('click', function(evt, d) {
    // //                     config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
    // //                     update(raw,config)
    // //                 })
    // //                 .append("title")
    // //                 .text(d => d.name + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() + "")
    // //             },
    // //             (update) => {
    // //                 update.select("rect")
    // //                 .attr("y", (d) => d.y0)
    // //                 .attr("height", (d) => d.y1 - d.y0);
    // //                 update.select("title").text((d) => `${d.name} - ${d.value}`);
    // //             },
    // //             (exit)  => {
    // //                 exit.remove();
    // //             }
    // //       )
      
    // //         // d3.selectAll(".node")
    // //         //     .on("click", function (evt, d) {                    
                    
    // //         //         /* config.previous = data  */
    // //         //         d3.selectAll("g")
    // //         //             .remove()    
    // //         //         update(raw,config)
    // //         //   })
               
    // //         // },
    // //         // (update) => { update
    // //         //         .data(nodes)
    // //         //         .transition()
    // //         //         .duration(3000)
    // //         //             /* .selectAll("rect") */
    // //         // },
    // //         // (exit) => {exit
    // //         //     /* .attr("fill", "brown") */
    // //         //     .call(exit => exit.transition(t)
    // //         //         .attr("y", 30)
    // //         //         .remove()
    // //         //         )
    // //         //     }
    // //         // )
    
    
    // //     let renderLinks = svg.append("g")
    // //         .attr("fill", "none")
    // //       .selectAll("g")
    // //       .attr("class",".links")
    // //       .data(links)
    // //       .join( 
    // //         (enter) => {
    // //         const g = enter
    // //                 .append("path")
    // //                 .attr("d", d3.sankeyLinkHorizontal())
    // //                 .attr("class", "link")
    // //                 /* .transition()
    // //                 .duration(2000) */
    // //                 .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
    // //                 .attr("opacity", "0.5")
    // //                 .attr("stroke-width", d => d.width)
    // //                 /* .style("mix-blend-mode", "multiply") */
                    
    // //                 d3.selectAll(".link")
    // //                     .on("mouseover", function (e, i) {
    // //                         d3.select(this)
    // //                             .transition()
    // //                             .duration("50")
    // //                             .style("mix-blend-mode", "multiply")
    // //                             .attr("opacity", "0.85");
    // //                         div.html(d => i.names.join(" → ") + "<br>" + Math.round(i.value/total*100) + "% (" + i.value.toLocaleString() + " <span style='text-transform: lowercase'></span>)")
    // //                             .style("display", "block");
    // //                 })
    // //                 .on("mousemove", function (e) {
    // //                     div.style("top", e.pageY - 48 + "px")
    // //                         .style("left", e.pageX + "px");
    // //                 })
    // //                 .on('mouseout', function () {
    // //                     d3.select(this).transition()
    // //                         .duration('50')
    // //                         .style("mix-blend-mode", "no")
    // //                         .attr('opacity', '0.5');
    // //                     div.style("display", "none");
    // //                 })
    // //                 .append("title")
    // //                 .text(d => d.names.join(" → ") + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() )
    // //         },
    // //         (update) => {
    // //             update.call(update=> {
    // //                 update
    // //                 /* .transition()
    // //                 .duration(2000) */
    // //                 .attr("d", d3.sankeyLinkHorizontal)
    // //             })
      
    // //             .attr("stroke-width", (d) => Math.max(1, d.width))
    // //             .attr(
    // //               "id",
    // //               (d, i) => "linklabel_" + i
    // //               // "linklabel_" +
    // //               // d.source.name +
    // //               // "_" +
    // //               // d.target.name +
    // //               // "_" +
    // //               // d.source.index +
    // //               // "_" +
    // //               // d.target.index
    // //             )
    // //             .attr("stroke",d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]));
    // //           update
    // //             .sdelect("textPath")
    // //             .transition()
    // //             .duration(2000)
    // //             .attr(
    // //               "href",
    // //               (d, i) => "#linklabel_" + i
    // //               // "#linklabel_" +
    // //               // d.source.name +
    // //               // "_" +
    // //               // d.target.name +
    // //               // "_" +
    // //               // d.source.index +
    // //               // "_" +
    // //               // d.target.index
    // //             )
    // //             .text((d) => {
    // //               return d.name;
    // //               // return d.source.depth === 0
    // //               //   ? `${d.value} OI`
    // //               //   : d.source.depth === 1
    // //               //   ? `${d.value} Vol`
    // //               //   : d.source.depth === 2
    // //               //   ? `${d.value} OIC`
    // //               //   : "";
    // //             })
    // //         },
    // //         (exit) => {
    // //           exit.call(exit => exit.transition().duration(2000)
    // //           /* .attr("y", 30) */
    // //           .remove())
    // //         }
    // //         )    
      
    // //     const renderLabels = svg
    // //         .selectAll(".label")
    // //         .attr("class","")
    // //         .data(nodes/* , (d, i) => d.name */)
    // //         .join(
    // //           (enter) => {
    // //             const g = enter
    // //               .append("g")
    // //               .attr("class", "label")
    // //               /* .attr("transform", labelPositioner); */
    // //             const labelElem = g
    // //               .append("text")
    // //               .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    // //               .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    // //               .attr("font-size", d=> isRegion(d.name) ? "85%": "65%")
    // //               .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    // //               .attr("dy", "0.6em")
    // //               .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    // //              .text(d => d.sourceLinks.length > 0
    // //                     ? getMeta(d.name).flag+ " "+  d.name
    // //                     :  d.name+ " "+ getMeta(d.name).flag
    // //                 )
    // //              /*  .attr("font-size", (d) => {
    // //                 if (d.depth === 2) {
    // //                   // temp.push(d);
    // //                   return 12 * 3;
    // //                 }
    // //                 return 12 * 2;
    // //               })
    // //               .attr("fill", "#000")
    // //               // .attr('stroke', 'white')
    // //               .attr("stroke-width", 0.3)
    // //               .attr("font-weight", 600) */
    // //               .style("pointer-events", "none")
    
    // //               /* .attr("class", d=> console.log(d)) */
                  
    // //                 /* 
    // //                 const match = expirations.indexOf(d.name);
        
    // //                 return match >= 0 ? series[match] : d.name;
    // //               }) */
        
    // //               .attr("alignment-baseline", "middle")
    // //              /*  .style(
    // //                 "text-shadow",
    // //                 `0 1px 0 rgba(255,255,255,0.8), 1px 0 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(255,255,255,0.8), -1px 0 0 rgba(255,255,255,0.8)`
    // //               ) */
    // //     /* 
    // //             g.append("rect")
    // //               .attr("height", 20)
    // //               .attr("width", (d) => d.name.length * 8)
    // //               .attr("fill", "white")
    // //               .attr("y", -12 * 0.6)
    // //               // .attr("x", -10)
    // //               .style("mix-blend-mode", "screen")
    // //               .lower(); */
                  
    // //           },
    // //           (update) => {
                
    // //                update.transition()
    // //                 .duration(2000)
    // //                 .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    // //                 .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    // //                 .attr("font-size", d=> isRegion(d.name) ? "85%": "65%")
    // //                 .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    // //                 .attr("dy", "0.6em")
    // //                 .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    // //                .text(d => d.sourceLinks.length > 0
    // //                       ? getMeta(d.name).flag+ " "+  d.name
    // //                       :  d.name+ " "+ getMeta(d.name).flag
    // //                   )
                
                
    // //           },
    // //           (exit) => {
    // //             exit.call(exit => exit.transition().duration(2000)
    // //             /* .attr("y", 30) */
    // //             .remove())
    // //           }
              
    // //         );
        
    // //     // let renderLabels = svg.append("g")
    // //     //   .selectAll("text")
    // //     //   .data(nodes)
    // //     //   .join( (enter) => {
    // //     //     enter.append("text")
    // //     //     .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    // //     //     .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    // //     //     .attr("font-size", d=> isRegion(d.name) ? "80%": "65%")
    // //     //     .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    // //     //     .attr("dy", "0.6em")
    // //     //     .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    // //     //     .text(d => /* Math.round(d.value/total*100) + `% ` + */ d.name)
    // //     //  /*  .append("tspan")
    // //     //     .attr("fill-opacity", 0.6)
    // //     //     .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    // //     //     .attr("y", d => (d.y1 + d.y0) / 2 + 11)
    // //     //     .attr("font-size", "50%")
    // //     //     .text(d => `${d.value.toLocaleString()}`) */
    // //     //     },
    // //     //     (update) => {
    // //     //         update.transition().duration(600).attr("transform", labelPositioner)
    // //     //     },
    // //     //     (exit) => {
    // //     //         exit.remove()
    // //     //     })
      
    
    // //     d3.selectAll("#selectYear")
    // //         .on("input", function(d) {
    
    // //             /* config.previous = data  */
    // //             config.year = +d3.select(this).property("value")
    // //             update(raw,config)
    
    // //             /* getData(filename).then(data=> {
    // //                 data = data
    // //                 // Remove previous
    // //                 d3.selectAll("g")
    // //                     .remove();
    // //                return draw(data,config)
    // //             }) */
    
    // //         })        
    // //     d3.selectAll("#stockFlow")
    // //         .on("change", function(d) {
    // //             /* config.previous = data  */
    // //             config.stockflow = d3.select(this).property("value")
    // //             update(raw,config)
    // //             /*filename = fileName(config).json
    
    // //             getData(filename).then(data=> {
    // //                 data = data
    // //                 // Remove previous
    // //                 d3.selectAll("g")
    // //                     .remove();
    
    // //                return draw(data,config)
    // //             }) */
    
    // //     })    
    // //     d3.selectAll("#selectMethod")
    // //         .on("change", function(d) {
    // //             /* config.previous = data  */
    // //             config.method = d3.select(this).property("value")
    // //             update(raw,config)
    // //             /* d3.selectAll("g")
    // //                 .remove()    
    // //                 update(raw,config) */
    // //             /* filename = fileName(config).json
                    
    // //             getData(filename).then(data=> {
    // //                 data = data
    // //                 // Remove previous
    // //                 d3.selectAll("g")
    // //                     .remove();
    
    // //                return draw(data,config)
    // //             }) */
                
    // //     })    
            
    // //     d3.selectAll(".selectSex")
    // //         .on("change", function(d) {
    // //             config.previous = data 
    // //             config.sex = d3.select(this).property("value")
    // //             // console.log(config.sex)
    // //             update(raw,config)
    // //         /*     d3.selectAll("g")
    // //                 .remove()    
    // //             draw(raw,config) */
    // //             /* filename = fileName(config).json
    // //             console.log(filename)
    
    // //             getData(filename).then(data=> {
    // //                 data = data
    // //                 // Remove previous
    // //                 d3.selectAll("g")
    // //                     .remove();
    
    // //                return draw(data,config)
    // //             }) */
    
    // //         // drawSankey(config)
    // //     })
        
    // //     d3.selectAll(".selectType")
    // //         .on("change", function(d) {
    // //             config.previous = data 
    // //             config.type = d3.select(this).property("value")
    // //             update(raw,config)
    // //       /*       d3.selectAll("g")
    // //                 .remove()    
    // //             draw(raw,config)      */
    // //     })
            
    
    
    
       
    
    // // //   }
      
    
    // // // function updateSankey(raw,config){
    // // //     console.log(graphData)
    // // //     graphData = graph(preparedData.nldata.links)
    // // //     console.log(graphData)
    // // //     nodes = d3.selectAll('.node').data(graphData.nodes)
    // // //     console.log(nodes)
    // // //     d3.select('.link').data(graphData.links)
    // // // }
    
    
    
    // // //   function updateSankey() {
    // // //     const path = sankey.link();
      
    // // //     sankey.nodes(nodes).links(links)//.layout(1000);
      
    // // //     sankey.relayout();
    // // //     /* fontScale.domain(d3.extent(nodes, (d) => d.value)); */
      
    // // //     // transition links
    // // //     svg
    // // //       .selectAll(".link")
    // // //       .data(links)
    // // //       .transition("newSankey")
    // // //       .duration(newYearTransition)
    // // //       .attr("d", path)
    // // //       .style("stroke-width", (d) => Math.max(1, d.dy));
      
    // // //     // transition nodes
      
      
    // // //     // transition rectangles for the nodes
    // // //     svg
    // // //       .selectAll(".node rect")
    // // //       .data(nodes)
    // // //       .transition("newSankey")
    // // //       .duration(newYearTransition)
    // // //       .attr("height", (d) => (d.dy < 0 ? 0.1 : d.dy))
    // // //       .attr("value", (d) => d.value);
      
    // // //     // transition title text for the nodes
    // // //     svg
    // // //       .selectAll(".nodeLabel")
    // // //       .data(nodes)
    // // //       .transition("newSankey")
    // // //       .duration(newYearTransition)
    // // //       .style("font-size", (d) => `${Math.floor(fontScale(d.value))}px`)
    // // //       .attr("y", (d) => d.dy / 2);
    // // // /*      
    // // //     // transition % text for the nodes
    // // //     svg
    // // //       .selectAll(".nodePercent")
    // // //       .data(nodes)
    // // //       .transition("newSankey")
    // // //       .duration(newYearTransition)
    // // //       .text((d) => `${format(d.value)}%`)
    // // //       .attr("y", (d) => d.dy / 2)
    // // //       .style("opacity", 1)
    // // //       .filter((d) => d.value < 1 || d.node == 20) //do spending seperately to correctly show surplus
    // // //       .style("opacity", 0);
      
    // // //     //remove old spending %
    // // //     svg.selectAll(".spendingNodePercent").remove();
    // // //    */
    // // //     // % for spending in times of surplus using seperate data
    // // //     node
    // // //       .append("text")
    // // //       .attr("text-anchor", "middle")
    // // //       .attr("x", 30)
    // // //       .attr("y", (d) => d.dy / 2)
    // // //       .style("font-size", 18)
    // // //       .attr("dy", ".35em")
    // // //       .filter((d) => d.node == 20)
    // // //       .text(() => format(thisYearDeficit[0].spending) + "%")
    // // //       .attr("class", "spendingNodePercent");
    // // //   }