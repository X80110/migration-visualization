// Define chart-specific dimensions to avoid ReferenceError if global width/height are not yet defined
const CHORD_WIDTH = 800; // Matching value from prepare-data.js
const CHORD_HEIGHT = 750; // Matching value from prepare-data.js
const textId = "O-text-1";
// Create svg 
const chordDiagram = d3.select("#chord-chart")
    .append("svg")
    /* .attr('preserveAspectRatio', 'xMinYMid') */
    .attr("viewBox", [-CHORD_WIDTH / 2, -CHORD_HEIGHT / 2, CHORD_WIDTH, CHORD_HEIGHT]);

/* let regionIndex = 1     */    
var innerRadius = Math.min(CHORD_WIDTH, CHORD_HEIGHT) *0.35+10;
var outerRadius = innerRadius + 17;
var labelRadius = labelRadius || (outerRadius + 10); // This will use the new outerRadius
var labelThreshold =  1;

// Configure d3 chord 
var chord = chord(true,false)
        .padAngle(0.02)
        .sortSubgroups(d3.descending)



// Utils: return label position for given angle
function labelPosition(angle) {
    var temp = angle.mod(2*Math.PI);
    return {
        x: Math.cos(temp - Math.PI / 2) * labelRadius,
        y: Math.sin(temp - Math.PI / 2) * labelRadius,
        r: angle > Math.PI ? (temp + Math.PI / 2) * 180 / Math.PI : (temp - Math.PI / 2) * 180 / Math.PI
      };
    }
// #########################   DRAW 
// Function signature changed:
// - `raw` (collection of all datasets) is replaced by `specificRawData` (the single JSON for the current view) and `metadata`
// - `chartWidth` and `chartHeight` are now passed in.
// - Arguments changed to: chordData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight
function drawChords(chordData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight){
    // allYears = Object.keys(raw.raw_data[0].matrix); // This was for the old 'raw' structure, specificRawData is one dataset
    // If allYears is still needed, it should be derived from specificRawData.matrix keys (passed as specificRawData).
    // For now, assuming it might not be directly needed or its source will be specificRawData.
    if (specificRawData && specificRawData.matrix) {
      allYears = Object.keys(specificRawData.matrix);
    } else {
      allYears = []; // Fallback if matrix is not available
    }
   
    // The following lines are removed as data preparation is now done externally:
    // let file_index = files.indexOf(filename) // 'filename' was removed, and 'files' global is not reliable here.
    // let raw_data = raw.raw_data[file_index]
    // let local_input = {raw_data: raw_data, metadata: metadataCsv}
    // preparedData_local =  dataPrepare(local_input,config) 

    // Use the new structured input:
    let data = chordData; // Contains .names and .matrix for the chord diagram
    let flows = commonData.flows; // Array of flow objects {name, outflow, inflow, ...}
    
    // 'input' alias for specificRawData (original JSON content for current view)
    // Used for things like input.regions, input.names (original lists), input.colours
    // Let's alias specificRawData to 'input' for minimal changes to getMeta, getRegion, isRegion, getRegionColor etc.
    // This assumes specificRawData has .names, .regions, .colours properties.
    let input = specificRawData; 

    // Ensure flags are available for getMeta. Flags were originally from raw.metadata.
    // They are now passed as `metadata` argument which should be the CSV data.
    // `prepare-data.js` creates a `flags` variable from `meta`.
    // This `flags` variable is global in `prepare-data.js`.
    // For drawChords to use it, it either needs to be passed in, or `getMeta` needs access to `metadata` directly.
    // Let's assume `flags` is globally available from prepare-data.js execution context for now,
    // or that `getMeta` will be adapted if it's made local.
    // The `flags` variable used in `getMeta` is defined in `prepare-data.js` from the CSV.
    // This is a dependency that needs careful handling.
    // For now, `getMeta` in this file will rely on the global `flags` from `prepare-data.js`.

    let previous = config.previous || data;  // used to interpolate between layouts
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
        
       
        .targetRadius(innerRadius -5) 
        .headRadius(15)
    /* .radius(250) */

    // getFullMetaForChord wrapper removed. Logic will be inline or a simplified local helper if needed.
    // Global getBasicMeta will be used, and flow data will be merged from 'flows' (commonData.flows).

    // Local getRegion function is removed as getBasicMeta handles region determination.
    // function getRegion(index) { ... } 

    // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    // 'input' here is specificRawData.
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
    /* console.log(data.names.map(d=>getMeta(d))) */
    // Append variables to the processed data for d3 chord() data inputs

    function computedChords(data)  {        // data for each arrow
        let chords = chord(data.matrix).map(d=> {
            d.source.name = data.names[d.source.index];
            const sourceBasicMeta = getBasicMeta(d.source.name, input, metadataCsv); // 'input' is specificRawData, 'metadataCsv' is metadata
            // Flow data is not directly needed for source.region and source.id for chord structure
            d.source.region = sourceBasicMeta.region;
            d.source.id = sourceBasicMeta.id;

            //-----
            d.target.name = data.names[d.target.index];
            const targetBasicMeta = getBasicMeta(d.target.name, input, metadataCsv);
            d.target.region = targetBasicMeta.region;
            d.target.id = targetBasicMeta.id;

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
            d.name = data.names[d.index];
            const groupBasicMeta = getBasicMeta(d.name, input, metadataCsv);
            d.id = groupBasicMeta.id;
            d.region = groupBasicMeta.region;
            d.angle = (d.startAngle  + (d.endAngle - d.startAngle) / 2);
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
        // 'input' here is specificRawData
        const regionNames = input.regions.map((d)=> { return input.names[d]});
        const regionIndex = regionNames.indexOf(name);
        // Use colors from the specificRawData if available, otherwise fallback to a default (though not defined here)
        const colorPalette = input.colours || ['#40A4D8', '#35B8BD', '#7FC05E', '#D0C628', '#FDC32D', '#FBA127', '#F76F21', '#E5492D', '#C44977', '#8561D5', '#0C5BCE'];
        return colorPalette[regionIndex % colorPalette.length]; // Use modulo for safety
    }

    const colorCountries = (name) => {
        // 'input' is specificRawData from drawChords scope, 'metadataCsv' is the metadata param from drawChords
        const countryBasicMeta = getBasicMeta(name, input, metadataCsv); 
        let color_country = getRegionColor(countryBasicMeta.region_name); // getRegionColor uses 'input'
        let hsl = d3.hsl(color_country);
        
        const r_palette = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
        
        const id = Number(countryBasicMeta.id);
        const region = Number(countryBasicMeta.region); // This is the ID of the region name
    
        if (isNaN(id) || isNaN(region)) {
            // console.warn(`colorCountries: Invalid id or region for name "${name}". Meta:`, countryBasicMeta);
            return r_palette[0]; 
        }
        
        let palleteIndex = (id - region); // Original logic: index relative to the start of the region block
                                          // getBasicMeta's 'region' IS the index of the region name.
                                          // This is consistent with how 'id - region' was used before if 'region' was the region's own ID.
        palleteIndex = ((palleteIndex % 5) + 5) % 5; // Ensure positive and within 0-4 range
        return r_palette[palleteIndex];
    };

    // START CREATING SVG ELEMENTS
    const container = chordDiagram.append("g")
        .attr("class","container")
        .attr("id","container")
        /* .attr("viewBox", "xMinYMax meet) */    
    console.log(data)
    const groups = container.append("g")        
        .attr("class","groups")
        .selectAll("g")
        .data(computedGroups(data))
        .join("g")
        /* .attr("class",d=>"group-"+d.id) */

    groups.append("path")
        .attr("class","group-arc")
        .attr("d", arc)        
        .attr("id",d=>"group-" + d.id)
        .style("fill",d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity",/* d=> isRegion(d.name) && config.regions.length > 0 ? 0.1:  */0.80)
        .transition('group-arc')
        .duration(600)
        .style("transform", "translateZ(0)")
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
        .style("transform", "translateZ(0)")
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
        .text(d => {
            const labelBasicMeta = getBasicMeta(d.name, input, metadataCsv);
            return d.angle > Math.PI
                ? d.name+ " "+ labelBasicMeta.flag
                :  labelBasicMeta.flag+ " "+  d.name;
        })
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
  
    var maxBarHeight = chartHeight / 2 - (70); // Use passed-in chartHeight
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
        .style("transform", "translateZ(0)")
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
        
    function tooltipCountry(evt,d_link)  { // d_link is the link object from D3 {source, target, value}
        const sourceBasicMeta = getBasicMeta(d_link.source.name, input, metadataCsv);
        const sourceFlowInfo = flows.find(f => f.name === d_link.source.name) || {}; // 'flows' is commonData.flows
        const sourceFullMeta = { ...sourceBasicMeta, ...sourceFlowInfo };

        const targetBasicMeta = getBasicMeta(d_link.target.name, input, metadataCsv);
        const targetFlowInfo = flows.find(f => f.name === d_link.target.name) || {};
        const targetFullMeta = { ...targetBasicMeta, ...targetFlowInfo };

        var sourceDisplay = isRegion(d_link.source.name) 
            ? `<span style="color:${ getRegionColor(d_link.source.name)}"> ${d_link.source.name}</span>`
            : `<span style="color:${ colorCountries(d_link.source.name)}"> ${sourceFullMeta.flag+ " "+  d_link.source.name}</span>`;
        var targetDisplay = isRegion(d_link.target.name)
            ? `<span style="color:${ getRegionColor(d_link.target.name)}"> ${d_link.target.name}</span>`
            : `<span style="color:${ colorCountries(d_link.target.name)}"> ${targetFullMeta.flag+ " "+  d_link.target.name}</span>`;
        
        let currentFilename = fileName(config).json; 
        let valueDisplay;
        if(currentFilename.includes('stock')){
            valueDisplay = ` <div> 
                        <b>${formatValue(d_link.source.value)}</b> 
                        <br>in<br> </div> `;
        } else {
            valueDisplay = ` <div> 
                        ▾<br>
                        <b>${formatValue(d_link.source.value)}</b> 
                        <br>  </div> `;
        }
        return tooltip
            .html(`\ <b>${sourceDisplay} </b> 
                        ${valueDisplay} 
                        ${targetDisplay}  `)
            .transition('tooltip')
            .duration(15)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY+20)+"px")
            .style("left", (evt.pageX+30)+"px")
            .style("visibility", "visible")       
    }

    function tooltipRegion(evt,d_group) { // d_group is a group object
        const basicMeta = getBasicMeta(d_group.name, input, metadataCsv);
        const flowInfo = flows.find(f => f.name === d_group.name) || {}; // 'flows' is commonData.flows
        const fullMeta = { ...basicMeta, ...flowInfo };

        let sourceDisplay = isRegion(d_group.name) 
            ? `<span style="color:white"> <b>${d_group.name}</b></span>`
            : `<span style="color:white"> ${fullMeta.region_name}</span></br>
                <span style="color:white"><b> ${fullMeta.flag+ " "+  d_group.name}</b></span>`;
        
        var outflowDisplay = formatValue(fullMeta.outflow || 0); 
        var inflowDisplay = formatValue(fullMeta.inflow || 0);
        
        let currentFilename = fileName(config).json; 
        // console.log(currentFilename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
        if (currentFilename.includes('stock') ){
            return tooltip
                .html(`\ ${sourceDisplay} </br>
                        Total emigrants: <b> ${outflowDisplay}</b> </br>
                        Total immigrants: <b> ${inflowDisplay} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d_group.name) ? getRegionColor(d_group.name): colorCountries(d_group.name)) // Use d_group.name
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`\ ${sourceDisplay} </br> 
                        Total Outflow: <b> ${outflowDisplay}</b> </br>
                        Total Inflow: <b> ${inflowDisplay} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d_group.name) ? getRegionColor(d_group.name): colorCountries(d_group.name))
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
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    /// CLOSE REGIONS
    groups
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(evt, d_country_group) { // d_country_group is a group object for a country
            const basicMeta = getBasicMeta(d_country_group.name, input, metadataCsv);
            // Flow data not needed here, just region_name from basicMeta
            const regionNameToRemove = basicMeta.region_name;
            const indexToRemove = config.regions.indexOf(regionNameToRemove);
            if (indexToRemove > -1) {
                config.regions.splice(indexToRemove, 1);
            }
            
            d3.selectAll("g#tooltip")
                .remove()    
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        });

    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            config.previous = data 
            d3.selectAll("g#tooltip")
                        .remove()    
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    
    chordDiagram.selectAll(".group-arc, .path-item")
            .on("mouseover", function (evt, d) {
                if (config.regions < 1){
                    chords
                        .selectAll(".path-item")
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    d3.select(this)
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", 0.80)
                            
                }
                else{
                    chords
                        .selectAll(".path-item")
                        .transition('hover')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    d3.select(this)
                        .transition('hover')
                        .duration(30)
                        .style("opacity",0.80)
                    }
                }
            )
    chordDiagram.selectAll("g")
        .on("mouseout", function (evt, d) {        
            chords.selectAll(".path-item")
                .transition('mouseover')
                .duration(30)
                .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.03: 0.80)
                
            
        })  

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipCountry)
        .on("mouseout", function(){
                tooltip
                    .transition('mouseout')
                    .duration(10)
                    .style("visibility", "hidden");
        })

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipRegion)
        .on("mouseout", function(){
                 tooltip.style("visibility", "hidden");
        })
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
    chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
 
    function mouseover() {
        chordDiagram.selectAll(".group-arc, .path-item, .region-label-text")
            .on("mouseover", function(evt,d){
                chords.selectAll(".path-item, .group-arc")
                            .transition('mouseover')
                            .duration(80)
                            .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                        d3.select(this)
                            .transition('mouseover-this')
                            .duration(80)
                            .style("opacity",0.80)
            })
        groups
            .on("mouseover", function(evt,d) {
                d3.select(this).selectAll(".group-arc, .region-label-text")
                    .transition('mouseover')
                    .duration(80) 
                    .attr("d", arc.outerRadius(outerRadius))    
            })
    }   
        
    function mouseout() {
        chordDiagram
            .on("mouseout", function (evt, d) {        
                
                chords.selectAll(".path-item .group-arc, .region-label-text")
                    .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.1: 0.80)
                groups.selectAll(".group-arc")
                    .transition("mouseout")
                    .duration(80)
                    .style("transform", "translateZ(0)")
                    .attr("d",  arc.outerRadius(d=>isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius))
        })  
    }
    chordDiagram.selectAll(".path-item, .country-label-text")
        .on("mousemove", tooltipCountry)

    chordDiagram.selectAll(".group-arc, .region-label-text")
        .on("mousemove", tooltipRegion)
    chordDiagram
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))
    

    // ###### selectors    
    d3.selectAll("#selectYear")
        .on("input", function(d) {
            config.previous = data 
            config.year = +d3.select(this).property("value")
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    d3.selectAll("#stockFlow")
        .on("change", function(d) {
            config.previous = data 
            config.stockflow = d3.select(this).property("value")
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    d3.selectAll("#selectMethod")
        .on("change", function(d) {
            config.previous = data 
            config.method = d3.select(this).property("value")
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    d3.selectAll(".selectSex")
        .on("change", function(d) {
            config.previous = data 
            config.sex = d3.select(this).property("value")
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })
    d3.selectAll(".selectType")
        .on("change", function(d) {
            config.previous = data 
            config.type = d3.select(this).property("value")
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })   
    d3.selectAll("#selectedRanking")
        .on("change", function(d) {
            config.previous = data 
            config.ranking = +d3.select(this).property("value")
            // console.log(config.ranking)
            // Call the global update function from index.html
            update(loadedJsonData, initialMetadata, config);
        })   
    /* d3.selectAll(".maxValues")
        .on("change", function(d) {
            config.previous = data 
            config.max = d3.select(this).property("value")
            
            update(raw,config)
        })    */
}


