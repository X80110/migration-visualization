

function drawSankey(input, config){
    
    let file_index = files.indexOf(filename)
    filename = fileName(config).json
    
    // Get region index for a given name
    function getRegion(index) {
        var r = 0;
        for (var i = 0; i < input.raw_data.regions.length; i++) {
            if (input.raw_data.regions[i] > index) {
            break;
            }
            r = i;
        }
        return input.raw_data.regions[r];
    }

    // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
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
    input = {raw_data: input.raw_data[file_index], metadata: input.metadata}


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

    graph = graph(dataPrepare(input,config).nldata.links)
    const color = d3.scaleOrdinal(input.raw_data.names, colors)
    
  // Create svg 
  
  const svg = d3.select("#sankey")
    .append("svg")
    .attr("viewBox", [0 , 0, width, height])
    


    /* console.log( gNodes) */
sankey = d3.sankey()
    .nodeSort(null)
    .linkSort(null)
    .nodeWidth(25)
    .nodePadding(12)
    .extent([[0, 5], [width, height - 5]])
    
    

const {nodes, links} = sankey({
      nodes: graph.nodes.map(d => Object.assign({}, d)),
      links: graph.links.map(d => Object.assign({}, d))
    });

    const total = d3.sum(graph.links, d => d.value);
  
    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("display", "none")
        .style('z-index', '10')
        .text("new tooltip");
  
    svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
        .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .attr("opacity", "0.5")
        .attr("x", d => d.x0 < width / 2 ? d.x0-3:d.x0+3 )
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .on("mouseover", function (e, i) {
            div.html(d => i.name + "<br>" + Math.round(i.value/total*100) + "% (" + i.value.toLocaleString() + " <span style='text-transform: lowercase'></span>)")
               .style("display", "block");
        })
        .on("mousemove", function (i, e) {
            div.style("top", e.pageY - 48 + "px")
               .style("left", e.pageX + "px");
        })
        .on('mouseout', function () {
            div.style("display", "none");
        })
      .append("title")
        .text(d => d.name + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() + "");
    
    svg.append("g")
        .attr("fill", "none")
        
      .selectAll("g")
      .data(links)
      .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
        .attr("opacity", "0.5")
        .attr("stroke-width", d => d.width)
        /* .style("mix-blend-mode", "multiply") */
        .on("mouseover", function (e, i) {
            d3.select(this).transition()
              .duration("50")
              .style("mix-blend-mode", "multiply")
              .attr("opacity", "0.85");
            div.html(d => i.names.join(" → ") + "<br>" + Math.round(i.value/total*100) + "% (" + i.value.toLocaleString() + " <span style='text-transform: lowercase'></span>)")
               .style("display", "block");
        })
        .on("mousemove", function (e) {
            div.style("top", e.pageY - 48 + "px")
               .style("left", e.pageX + "px");
        })
        .on('mouseout', function () {
            d3.select(this).transition()
               .duration('50')
               .style("mix-blend-mode", "no")
               .attr('opacity', '0.5');
            div.style("display", "none");
        })
      .append("title")
        .text(d => d.names.join(" → ") + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() );    
  
    svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2 - 6)
        .attr("font-size", "80%")
        .attr("dy", "0.6em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => /* Math.round(d.value/total*100) + `% ` + */ d.name)
      .append("tspan")
        .attr("fill-opacity", 0.6)
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2 + 11)
        .attr("font-size", "50%")
        .text(d => `${d.value.toLocaleString()}`)

//     .selectAll("rect")
//     .data(nodes)
//     .join("rect")
//       .attr("x", d => d.x0)
//       .attr("y", d => d.y0)
//       .attr("height", d => d.y1 - d.y0)
//       .attr("width", d => d.x1 - d.x0)
//       .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
//       .attr("opacity", 0.5)
//     .append("title")
//       .text(d => `${d.name}\n${d.value.toLocaleString()}`);

//   svg.append("g")
//       .attr("fill", "none")
//     .selectAll("g")
//     .data(links)
//     .join("path")
//       .attr("d", d3.sankeyLinkHorizontal())
//       .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
//       .attr("stroke-width", d => d.width)
//       .attr("opacity", 0.5)
//       /* .style("mix-blend-mode", "multiply") */
//     .append("title")
//       .text(d => `${d.names.join(" → ")}\n${d.value.toLocaleString()}`);

//   svg.append("g")
//       .style("font", "10px sans-serif")
//     .selectAll("text")
//     .data(nodes)
//     .join("text")
//       .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
//       .attr("y", d => (d.y1 + d.y0) / 2)
//       .attr("dy", "0.35em")
//       .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
//       .text(d => d.name)
//     .append("tspan")
//       .attr("fill-opacity", 0.7)
//       .text(d => ` ${d.value.toLocaleString()}`);

    return svg.node();
  }