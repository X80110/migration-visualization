// function update(raw,config){
// /*     let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata} */
//     d3.selectAll("#chart g")
//            .remove()    
//     draw(raw,config)

//     /* graph = graph(dataPrepare(input,config).nldata.links) */
//     drawSankey(raw,config)
// }
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
function drawSankey(raw, config){
    let file_index = files.indexOf(filename)
    filename = fileName(config).json
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}
    function setSelectors() {
        // YEAR SELECTOR 

        const allYears = [...new Set(Object.keys(input.raw_data.matrix))]
        const lastYearPlusFive = (+allYears[allYears.length-1]+5).toString()
        /* console.log(lastYearPlusFive) */
        let allRangeYears = allYears.concat(lastYearPlusFive)
        /* console.log(allRangeYears) */

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
    total_flows = dataPrepare(input,config).total_flows
    
    function getMeta(name) {
        const flag = (name) =>{ 
            let flag = flags.filter(d=>d[name])[0] ?  flags.filter(d=>d[name])[0] : ""
            return Object.values(flag)[0] !== undefined ? Object.values(flag)[0] : ""
        }
        const region = getRegion(input.raw_data.names.indexOf(name))
        
        const region_name = input.raw_data.names[region]
        const id = input.raw_data.names.indexOf(name)

        const outflow = (name) =>{
            total_flows.filter(d=>d.name.includes(name))[0].outflow 
        }  
        const inflow = (name) =>{
            total_flows.filter(d=>d.name.includes(name))[0].inflow 
        }  
        
        
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
    


    

    graphData = graph(dataPrepare(input,config).nldata.links)
    
    /* console.log(total_flows) */
    /* console.log(graph.links) */
    const color = d3.scaleOrdinal(input.raw_data.names, colors)

    // Create svg 
    const svg = d3.select("#sankey")
        .append("svg")
        .attr("viewBox", [0 , 0, width, height])
    
    const t = svg.transition()
        .duration(500);

    /* console.log( gNodes) */
    sankey = d3.sankey()
        /* .nodeSort(d=> console.log(d)  ) */
        // .nodeSort(/* d=> d.index,  */d=> console.log(d))
        .nodeSort(d=> getMeta(d.name).id,d=> getMeta(d.name).id)// console.log(d3.ascending(getMeta(d.name))))
        /* .nodeSort(d=> getMeta(d.name).region && getMeta(d.name).id)// console.log(d3.ascending(getMeta(d.name)))) */
        .nodeWidth(25)
        .nodePadding(12) 
        .extent([[0, 5], [width, height - 5]])
    
        
    const {nodes, links} = sankey({
        nodes: graphData.nodes.map(d => Object.assign({}, d)),
        links: graphData.links.map(d => Object.assign({}, d))
        });

    const total = d3.sum(graphData.links, d => d.value);

 /*    labelPositioner = (d) => {
        const startLabel = (d) => d.depth === 0;
        const strikeLabel = (d) => d.depth === 1;
        // (d) => d.x0 < leftMargin;
        // const endLabel = (d) => d.x0 > width - 100;
        
        //  ? d.x0 - (d.x1 - d.x0) / 2
        return `translate(${
          startLabel(d) ? d.x0 - 15 : strikeLabel(d) ? d.x1 + 15 : d.x1 + 15
        },${(d.y1 + d.y0) / 2})`;
      }
 */
    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("display", "none")
        .style('z-index', 100)
        .text("new tooltip");
  
    let renderNodes = svg.append("g")
      .selectAll("g")
      .attr("class",".nodes")
      .data(nodes, d=> d.name)
      .join(
            (enter) => {
            let g = enter.append("g")
                .attr("class", "node");
                g.append("rect")    
                .attr("opacity", "0.5")
                .attr("fill", d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
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
            /// OPEN REGIONS
                .on('click', function(evt, d) {
                    if (config.regions.length + 1 > config.maxRegionsOpen) {
                        config.regions.shift();       
                    }
                    config.regions.push(d.name) // console.log(d.name)                
                    update(raw,config)
                    })
            /// CLOSE REGIONS
            d3.selectAll('.node')
                .filter(d=>!isRegion(d.name))
                .on('click', function(evt, d) {
                    config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
                    update(raw,config)
                })
                .append("title")
                .text(d => d.name + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() + "")
            },
            (update) => {
                update.select("rect")
                .transition()
                .duration(200)
                .attr("y", (d) => d.y0)
                .attr("height", (d) => d.y1 - d.y0);
              update.select("title").text((d) => `${d.name} - ${d.value}`);
            },
            (exit)  => {
                exit.remove();
            }/* 
            svg.selectAll(".nodes rect").on("click", function (e, d, i) {
                if (+clicked?.name === +d.name) {
                  mutable clicked = null;
                } else {
                  mutable clicked = d;
                }
              }); */
      )
  
        // d3.selectAll(".node")
        //     .on("click", function (evt, d) {                    
                
        //         /* config.previous = data  */
        //         d3.selectAll("g")
        //             .remove()    
        //         update(raw,config)
        //   })
           
        // },
        // (update) => { update
        //         .data(nodes)
        //         .transition()
        //         .duration(3000)
        //             /* .selectAll("rect") */
        // },
        // (exit) => {exit
        //     /* .attr("fill", "brown") */
        //     .call(exit => exit.transition(t)
        //         .attr("y", 30)
        //         .remove()
        //         )
        //     }
        // )


    let renderLinks = svg.append("g")
        .attr("fill", "none")
      .selectAll("g")
      .attr("class",".links")
      .data(links)
      .join( 
        (enter) => {
        const g = enter
        .transition()
     .duration(200)
                .append("path")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("class", "link")
                .attr("stroke", d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0]))
                .attr("opacity", "0.5")
                .attr("stroke-width", d => d.width)
                /* .style("mix-blend-mode", "multiply") */
                
                d3.selectAll(".link")
                    .on("mouseover", function (e, i) {
                        d3.select(this)
                            .transition()
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
                .text(d => d.names.join(" → ") + "\n" + Math.round(d.value/total*100) + "% (" + d.value.toLocaleString() )
        },
        (update) => {
            update.call(update=> {
                update
                .transition()
                .duration(200)
                .attr("d", d3.sankeyLinkHorizontal)
            })
  
           /*  .attr("stroke-width", (d) => Math.max(1, d.width))
            .attr(
              "id",
              (d, i) => "linklabel_" + i
              // "linklabel_" +
              // d.source.name +
              // "_" +
              // d.target.name +
              // "_" +
              // d.source.index +
              // "_" +
              // d.target.index
            )
            .attr("stroke",d=> isRegion(d.names[0]) ? getRegionColor(d.names[0]) :colorCountries(d.names[0])); */
         /*  update
            .select("textPath")
            .transition()
            .duration(2000)
            .attr(
              "href",
              (d, i) => "#linklabel_" + i
              // "#linklabel_" +
              // d.source.name +
              // "_" +
              // d.target.name +
              // "_" +
              // d.source.index +
              // "_" +
              // d.target.index
            )
            .text((d) => {
              return d.name;
              // return d.source.depth === 0
              //   ? `${d.value} OI`
              //   : d.source.depth === 1
              //   ? `${d.value} Vol`
              //   : d.source.depth === 2
              //   ? `${d.value} OIC`
              //   : "";
            }) */
        },
        (exit) => {
          exit.call(exit => exit.transition().duration(2000)
          /* .attr("y", 30) */
          .remove())
        }
        )    
  
    const renderLabels = svg
        .selectAll(".label")
        .attr("class","")
        .data(nodes/* , (d, i) => d.name */)
        .join(
          (enter) => {
            const g = enter
              .append("g")
              .attr("class", "label")
              
              /* .attr("transform", labelPositioner); */
            const labelElem = g
              .append("text")
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
             /*  .attr("font-size", (d) => {
                if (d.depth === 2) {
                  // temp.push(d);
                  return 12 * 3;
                }
                return 12 * 2;
              })
              .attr("fill", "#000")
              // .attr('stroke', 'white')
              .attr("stroke-width", 0.3)
              .attr("font-weight", 600) */
              .style("pointer-events", "none")

              /* .attr("class", d=> console.log(d)) */
              
                /* 
                const match = expirations.indexOf(d.name);
    
                return match >= 0 ? series[match] : d.name;
              }) */
    
              .attr("alignment-baseline", "middle")
             /*  .style(
                "text-shadow",
                `0 1px 0 rgba(255,255,255,0.8), 1px 0 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(255,255,255,0.8), -1px 0 0 rgba(255,255,255,0.8)`
              ) */
    /* 
            g.append("rect")
              .attr("height", 20)
              .attr("width", (d) => d.name.length * 8)
              .attr("fill", "white")
              .attr("y", -12 * 0.6)
              // .attr("x", -10)
              .style("mix-blend-mode", "screen")
              .lower(); */
              
          },
          (update) => {
            update.call(update =>
                update
                .transition()
                .duration(2000)
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
            )
            
          },
          (exit) => {
            exit.call(exit => exit.transition().duration(2000)
            /* .attr("y", 30) */
            .remove())
          }
          
        );
    
    // let renderLabels = svg.append("g")
    //   .selectAll("text")
    //   .data(nodes)
    //   .join( (enter) => {
    //     enter.append("text")
    //     .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    //     .attr("y", d => (d.y1 + d.y0) / 2 - 6)
    //     .attr("font-size", d=> isRegion(d.name) ? "80%": "65%")
    //     .attr("font-weight", d=> isRegion(d.name) ? "600": "400")
    //     .attr("dy", "0.6em")
    //     .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    //     .text(d => /* Math.round(d.value/total*100) + `% ` + */ d.name)
    //  /*  .append("tspan")
    //     .attr("fill-opacity", 0.6)
    //     .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    //     .attr("y", d => (d.y1 + d.y0) / 2 + 11)
    //     .attr("font-size", "50%")
    //     .text(d => `${d.value.toLocaleString()}`) */
    //     },
    //     (update) => {
    //         update.transition().duration(600).attr("transform", labelPositioner)
    //     },
    //     (exit) => {
    //         exit.remove()
    //     })
  

    d3.selectAll("#selectYear")
        .on("input", function(d) {

            /* config.previous = data  */
            config.year = +d3.select(this).property("value")
            update(raw,config)

            /* getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();
               return draw(data,config)
            }) */

        })        
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            /* config.previous = data  */
            config.stockflow = d3.select(this).property("value")
            update(raw,config)
            /*filename = fileName(config).json

            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */

    })    
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            /* config.previous = data  */
            config.method = d3.select(this).property("value")
            update(raw,config)
            /* d3.selectAll("g")
                .remove()    
                update(raw,config) */
            /* filename = fileName(config).json
                
            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */
            
    })    
        
    d3.selectAll(".selectSex")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")
            // console.log(config.sex)
            update(raw,config)
        /*     d3.selectAll("g")
                .remove()    
            draw(raw,config) */
            /* filename = fileName(config).json
            console.log(filename)

            getData(filename).then(data=> {
                data = data
                // Remove previous
                d3.selectAll("g")
                    .remove();

               return draw(data,config)
            }) */

        // drawSankey(config)
    })
    
    d3.selectAll(".selectType")
        .on("change", function(d) {
            config.previous = data 
            config.type = d3.select(this).property("value")
            update(raw,config)
      /*       d3.selectAll("g")
                .remove()    
            draw(raw,config)      */
    })
        



   
    /* return svg.node(); */
  }
  



//   function updateSankey() {
//     /* const path = sankey.link(); */
  
//     /* sankey.nodes(nodes).links(links)//.layout(1000); */
  
//     /* sankey.relayout(); */
//     /* fontScale.domain(d3.extent(nodes, (d) => d.value)); */
//     const svg = d3.select("#sankey")
//         .append("svg")
//         .attr("viewBox", [0 , 0, width, height])
//     // transition links
//     svg
//       .selectAll(".link")
//       .data(graplinks)
//       .transition("newSankey")
//       .duration(newYearTransition)
//       .attr("d", path)
//       .style("stroke-width", (d) => Math.max(1, d.dy));
  
//     // transition nodes
  
  
//     // transition rectangles for the nodes
//     svg
//       .selectAll(".node rect")
//       .data(nodes)
//       .transition("newSankey")
//       .duration(newYearTransition)
//       .attr("height", (d) => (d.dy < 0 ? 0.1 : d.dy))
//       .attr("value", (d) => d.value);
  
//     // transition title text for the nodes
//     svg
//       .selectAll(".nodeLabel")
//       .data(nodes)
//       .transition("newSankey")
//       .duration(newYearTransition)
//       .style("font-size", (d) => `${Math.floor(fontScale(d.value))}px`)
//       .attr("y", (d) => d.dy / 2);
// /*      
//     // transition % text for the nodes
//     svg
//       .selectAll(".nodePercent")
//       .data(nodes)
//       .transition("newSankey")
//       .duration(newYearTransition)
//       .text((d) => `${format(d.value)}%`)
//       .attr("y", (d) => d.dy / 2)
//       .style("opacity", 1)
//       .filter((d) => d.value < 1 || d.node == 20) //do spending seperately to correctly show surplus
//       .style("opacity", 0);
  
//     //remove old spending %
//     svg.selectAll(".spendingNodePercent").remove();
//    */
//     // % for spending in times of surplus using seperate data
//     node
//       .append("text")
//       .attr("text-anchor", "middle")
//       .attr("x", 30)
//       .attr("y", (d) => d.dy / 2)
//       .style("font-size", 18)
//       .attr("dy", ".35em")
//       .filter((d) => d.node == 20)
//       .text(() => format(thisYearDeficit[0].spending) + "%")
//       .attr("class", "spendingNodePercent");
//   }