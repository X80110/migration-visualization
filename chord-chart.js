// Create svg 
const chordDiagram = d3.select("#chord-chart")
    .append("svg")
    /* .attr('preserveAspectRatio', 'xMinYMid') */
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

/* let regionIndex = 1     */    
var innerRadius = Math.min(width, height) *0.35+10;
var outerRadius = innerRadius + 17;
var labelRadius = labelRadius || (outerRadius + 10);
var labelThreshold =  1;

// Configure d3 chord 
var chord = chord(true,false)
        .padAngle(0.02)
        .sortSubgroups(d3.descending)
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
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n
  };

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
// - `preparedData` is now passed in directly.
function drawChords(specificRawData, metadata, preparedData, config){
    // allYears = Object.keys(raw.raw_data[0].matrix); // This was for the old 'raw' structure, specificRawData is one dataset
    // If allYears is still needed, it should be derived from specificRawData.matrix keys if it's a multi-year file, or passed differently.
    // For now, assuming it might not be directly needed or its source will be specificRawData.
    if (specificRawData && specificRawData.matrix) {
      allYears = Object.keys(specificRawData.matrix);
    } else {
      allYears = []; // Fallback if matrix is not available
    }
   
    // The following lines are removed as data preparation is now done externally:
    // let file_index = files.indexOf(filename) // 'filename' was removed, and 'files' global is not reliable here.
    // let raw_data = raw.raw_data[file_index]
    // let local_input = {raw_data: raw_data, metadata: metadata}
    // preparedData =  dataPrepare(local_input,config) // This was the global preparedData

    let data = preparedData.result; // Use the passed-in preparedData
    let flows = preparedData.flows; // Use the passed-in preparedData
    
    // 'input' variable was used for metadata lookups like input.names, input.regions, input.colours
    // These should now come from `specificRawData` or be part of `preparedData` if transformed.
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

    
    
    // Get metadata given a source/target name
    // Refactored to accept metadata_csv (parsed CSV data for flags) directly
    function getMeta(name, metadata_csv) {
        const get_flag_for_name = (countryName, csv_data) => {
            if (!csv_data) return "";
            const country_row = csv_data.find(row => row.origin_name === countryName);
            return country_row ? country_row.origin_flag : "";
        };
    
        const flag_value = get_flag_for_name(name, metadata_csv);
        const region = getRegion(input.names.indexOf(name)); // getRegion still uses 'input' from drawChords scope
        const region_name = input.names[region];
        const id = input.names.indexOf(name);
        
        // 'flows' is from preparedData in drawChords scope
        const flow_data_for_name = flows.find(d=>d.name.includes(name)); 
        const outflow = flow_data_for_name ? flow_data_for_name.outflow : 0;
        const inflow = flow_data_for_name ? flow_data_for_name.inflow : 0;
        const total_flow = outflow + inflow;
        const max_flow = flow_data_for_name ? flow_data_for_name.total_flow : 0;

        return {flag: flag_value, region,region_name,id,outflow,inflow,total_flow,max_flow};
    }
    /* console.log(getMeta("Austria", metadata)) */ // Example call if metadata is in scope
    
    // Get region index given a source/target name
    function getRegion(index) {
        var r = 0;
        for (var i = 0; i < input.regions.length; i++) {
            if (input.regions[i] > index) {
            break;
            }
            r = i;
        }
        return input.regions[r];
    }

    // Computes true if 'name' is identified as a region. Will be used to run conditional styles on each element. 
    function isRegion(name) {
        return input.regions.includes(input.names.indexOf(name))
    } 
    /* console.log(data.names.map(d=>getMeta(d))) */
    // Append variables to the processed data for d3 chord() data inputs

    function computedChords(data)  {        // data for each arrow
        let chords = chord(data.matrix).map(d=> {
            d.source.name = data.names[d.source.index]
            const sourceMeta = getMeta(d.source.name, metadata);
            d.source.region = sourceMeta.region;
            d.source.id = sourceMeta.id;

            //-----
            d.target.name = data.names[d.target.index]
            const targetMeta = getMeta(d.target.name, metadata);
            d.target.region = targetMeta.region;
            d.target.id = targetMeta.id;

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
            const groupMeta = getMeta(d.name, metadata);
            d.id = groupMeta.id;
            d.region = groupMeta.region;
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
        const countryMeta = getMeta(name, metadata); // 'metadata' is from drawChords's scope
        let color_country = getRegionColor(countryMeta.region_name); 
        let hsl = d3.hsl(color_country);
        
        const r_palette = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
        
        const id = Number(countryMeta.id);
        const region = Number(countryMeta.region);
    
        if (isNaN(id) || isNaN(region)) {
            // console.warn(`colorCountries: Invalid id or region for name "${name}". Meta:`, countryMeta);
            return r_palette[0]; // Return a default/fallback color
        }
        
        // Ensure the index is positive and within bounds for the palette
        let index = (id - region) % 5;
        if (index < 0) {
            index += 5;
        }
        return r_palette[index];
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
            const labelMeta = getMeta(d.name, metadata);
            return d.angle > Math.PI
                ? d.name+ " "+ labelMeta.flag
                :  labelMeta.flag+ " "+  d.name;
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
  
    var maxBarHeight = height / 2 - (70);
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
        
    function tooltipCountry(evt,d)  {
        const sourceMeta = getMeta(d.source.name, metadata);
        const targetMeta = getMeta(d.target.name, metadata);
        var source = isRegion(data.names[d.source.index])
            ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${sourceMeta.flag+ " "+  d.source.name}</span>`
        var target = isRegion(data.names[d.target.index] )
            ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
            : `<span style="color:${ colorCountries(d.source.name)}"> ${targetMeta.flag+ " "+  d.target.name}</span>`
        
        let currentFilename = fileName(config).json; // Derive filename from current config
        if(currentFilename.includes('stock')){
            var value = ` <div> 
                        <b>${formatValue(d.source.value)}</b> 
                        <br>in<br> `
        } else {
            var value = ` <div> 
                        ▾<br>
                        <b>${formatValue(d.source.value)}</b> 
                        <br>  `
        }
        return tooltip
            .html(`\ <b>${source} </b> 
                        ${value} 
                        ${target}  `)
            .transition('tooltip')
            .duration(15)
            .style('background-color','#ffffff')
            .style('padding','1em')
            .style("top", (evt.pageY+20)+"px")
            .style("left", (evt.pageX+30)+"px")
            .style("visibility", "visible")       
    }

    function tooltipRegion(evt,d) {
        const regionMeta = getMeta(d.name, metadata);
        let source = isRegion(d.name)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${regionMeta.region_name}</span></br>
                <span style="color:white"><b> ${regionMeta.flag+ " "+  d.name}</b></span>`
        if (data.matrix !== undefined) {
            var outflow = formatValue(regionMeta.outflow) 
            var inflow = formatValue(regionMeta.inflow)
        }
        let currentFilename = fileName(config).json; // Derive filename from current config
        // console.log(currentFilename.includes("stock")) ---> false ? then synthax is outflow/inflow instead of emigrants/immigrants
        if (currentFilename.includes('stock') ){
            return tooltip
                .html(`\ ${source} </br>
                        Total emigrants: <b> ${outflow}</b> </br>
                        Total immigrants: <b> ${inflow} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
                .style("top", (evt.pageY+20)+"px")
                .style("left", (evt.pageX+30)+"px")
                .style("visibility", "visible")
        }
        else {
            return tooltip
                .html(`\ ${source} </br>
                        Total Outflow: <b> ${outflow}</b> </br>
                        Total Inflow: <b> ${inflow} </b> `)
                .transition('tooltip')
                .duration(15)
                .style('background-color',isRegion(d.name) ? getRegionColor(d.name): colorCountries(d.name))
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
        .on('click', function(evt, d) {
            const regionNameToRemove = getMeta(d.name, metadata).region_name;
            config.regions.splice( config.regions.indexOf( regionNameToRemove ), 1);
            
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
    
    // INTERACTIONS: Click
    config.maxRegionsOpen = 2 
    
    // Open regions
    // This groups.on('click') handler seems to be duplicated. Removing the duplicate.
    // groups.on('click', function(evt, d) {
    //         if (config.regions.length + 1 > config.maxRegionsOpen) {
    //             config.regions.shift();       
    //         }
    //         config.regions.push(d.name) 
    //         d3.selectAll("g#tooltip")
    //             .remove()    
    //         update(loadedJsonData, initialMetadata, config); // Already updated above
    //     })
    // /// CLOSE REGIONS
    // groups // This is also part of the duplicated block
    //     .filter(function(d) {
    //         return d.id !== d.region;
    //     })
    //     .on('click', function(evt, d) {
    //         config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            
    //         d3.selectAll("g#tooltip")
    //             .remove()    
    //         update(loadedJsonData, initialMetadata, config); // Already updated above
    //     });

    // chordDiagram.selectAll(".group-arc") // This is also part of the duplicated block
    //     .on("click", function (evt, d) {                    
    //         config.previous = data 
    //         d3.selectAll("g#tooltip")
    //                     .remove()    
    //         update(loadedJsonData, initialMetadata, config); // Already updated above
    //     })
    
    // INTERACTIONS: Mouseover
    // chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
    chordDiagram.selectAll(".group-arc, .path-item")
            .on("mouseover", function (evt, d) {
                // console.log(d.id)
                if (config.regions < 1){
                    chords
                        // .selectAll(".path-item, .group-arc")
                        .selectAll(".path-item")
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    /* arcs.selectAll(".group-arc")
                    .style("opacity",d=> isRegion(d.name) ? 0.03: 0.80) */
                    d3.select(this)
                        .transition('hover-arc')
                        .duration(30)
                        .style("opacity", 0.80)
                            
                }
                else{
                    chords
                        // .selectAll(".path-item, .group-arc")
                        .selectAll(".path-item")
                        .transition('hover')
                        .duration(30)
                        .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                    d3.select(this)
                        .transition('hover')
                        .duration(30)
                        .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
                    }
                }
            )
    chordDiagram.selectAll("g")
        .on("mouseout", function (evt, d) {        
            chords.selectAll(".path-item")
                .transition('mouseover')
                .duration(30)
                .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.03: 0.80)
                
            /* groups.selectAll(".group-arc")
                .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80) */
            
        })  

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipCountry)
        .on("mouseout", function(){
                tooltip
                    .transition('mouseu')
                    .duration(30)
                    .style("visibility", "hidden");
        })

    chordDiagram.selectAll(".group-arc, .path-item, .country-label")
        .on("mousemove", tooltipRegion)
        .on("mouseout", function(){
                 tooltip.style("visibility", "hidden");
        })
    // function mouseover() {
    //     chordDiagram.selectAll(".group-arc, .path-item, .region-label-text")
    //         .on("mouseover", function(evt,d){
    //             chords.selectAll(".path-item, .group-arc")
    //                         .transition('mouseover')
    //                         .duration(80)
    //                         .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //                     d3.select(this)
    //                         .transition('mouseover-this')
    //                         .duration(80)
    //                         .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         })
    //         //  .on("mouseover", function (evt, d) {
    //         //         // console.log(d.id)
    //         //         if (config.regions < 1){
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity", 0.80)
    //         //         }
    //         //         else{
    //         //             chords.selectAll(".path-item, .group-arc")
    //         //                 .transition('mouseover')
    //         //                 .duration(80)
    //         //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
    //         //             d3.select(this)
    //         //                 .transition('mouseover-this')
    //         //                 .duration(80)
    //         //                 .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
    //         //         }
    //         //     }
    //         // )
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
    // // INTERACTIONS: Mouseover
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
                            .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
            })
            //  .on("mouseover", function (evt, d) {
            //         // console.log(d.id)
            //         if (config.regions < 1){
            //             chords.selectAll(".path-item, .group-arc")
            //                 .transition('mouseover')
            //                 .duration(80)
            //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
            //             d3.select(this)
            //                 .transition('mouseover-this')
            //                 .duration(80)
            //                 .style("opacity", 0.80)
            //         }
            //         else{
            //             chords.selectAll(".path-item, .group-arc")
            //                 .transition('mouseover')
            //                 .duration(80)
            //                 .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
            //             d3.select(this)
            //                 .transition('mouseover-this')
            //                 .duration(80)
            //                 .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
            //         }
            //     }
            // )
        groups
            .on("mouseover", function(evt,d) {
                d3.select(this).selectAll(".group-arc, .region-label-text")
                    .transition('mouseout')
                    .duration(80) 
                    .attr("d", arc.outerRadius(outerRadius))    
            })
    }   
        
    function mouseout() {
        // chordDiagram.selectAll("g")
        chordDiagram
            .on("mouseout", function (evt, d) {        
                
                chords.selectAll(".path-item .group-arc")
                    .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.1: 0.80)
                groups.selectAll(".group-arc")
                    .transition("mouseout")
                    .duration(80)
                    .attr("d",  arc.outerRadius(d=>isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius))
        })  
    }
    chordDiagram.selectAll(".path-item, .country-label-text")
        .on("mousemove", tooltipCountry)
        /* .on("mouseout", d=> tooltip.style("visibility", "hidden")) */

    chordDiagram.selectAll(".group-arc,  .region-label-text")
        .on("mousemove", tooltipRegion)
        /* .on("mouseout", d=> tooltip.style("visibility", "hidden")) */
    chordDiagram
        .on("mouseout", d=> tooltip.style("visibility", "hidden"))
    
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


