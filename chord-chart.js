

// ##########################################################
//  INITIAL PARAMETERS
var width = 800;
var height = width-50;
const textId = "O-text-1"; 
// Create svg 
const chordDiagram = d3.select("#chord-chart")
    .append("svg")
    .attr('preserveAspectRatio', 'xMinYMid')
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

let regionIndex = 1        
var innerRadius = Math.min(width, height) *0.35+10;
var outerRadius = innerRadius + 17;
var labelRadius = labelRadius || (outerRadius + 10);

let threshold = []
let regionColors = []

// ##########################################################
// Functions and initial config
config.year = 1990 || ""
config.stockflow = config.stockflow
config.sex 
config.type 
config.method = "da_pb_closed" || ""
config.regions = []

var chord = chord(true,false)
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
      
var arc = d3.arc() 
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

var ribbon = d3.ribbonArrow()
    .sourceRadius(innerRadius)
    .targetRadius(innerRadius -10) 
    .headRadius(15)

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

function labelPosition(angle) {
    var temp = angle.mod(2*Math.PI);
    return {
        x: Math.cos(temp - Math.PI / 2) * labelRadius,
        y: Math.sin(temp - Math.PI / 2) * labelRadius,
        r: angle > Math.PI ? (temp + Math.PI / 2) * 180 / Math.PI : (temp - Math.PI / 2) * 180 / Math.PI
      };
    }

// ##########################################################
//  DRAW
// We set this outside the draw() function to avoid appending a new array to the selector on each run. 
d3.select("#selectMethod")
                .selectAll('myOptions')
                .data(allMethods)
                .enter()
                .append('option')
                .text(d=>{ return d; })    // text showed in the menu dropdown
                .attr("value",d=> { return d; }) 

function drawChords(raw,config){
    // GET SELECTED DATASET   
    filename = fileName(config).json
    let file_index = files.indexOf(filename)
    let input = {raw_data: raw.raw_data[file_index], metadata: raw.metadata}

    // CREATE SELECTORS
    preparedData =  dataPrepare(input,config)
    let data = preparedData.result

    let total_flows = preparedData.total_flows
    input = input.raw_data                  // used for metadata
    let previous = config.previous || data  // used to interpolate between layouts
    var aLittleBit = Math.PI / 100000;
    config.initialAngle =  {};
    config.initialAngle.arc = { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

    rememberTheChords()
    rememberTheGroups() 
    // ----------------------
    // Utils functions 
    
    // Get metadata for a given name
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
    /* console.log(getMeta("Austria")) */
    
    // Get region index for a given name
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
    
    // Extend chord() function values
    function computedChords(data)  {
        let chords = chord(data.matrix).map(d=> {
            d.source.name = data.names[d.source.index]
            d.source.region = getMeta(d.source.name).region
            d.source.id = getMeta(d.source.name).id
            
            d.target.name = data.names[d.target.index]
            d.target.region = getMeta(d.target.name).region
            d.target.id = getMeta(d.target.name).id
            
            direction = d.source.id > d.target.id ? 'source' :'target'
            d.id = direction+`-`+d.source.id+`-`+d.target.id
            let result = {id:d.id, source: d.source, target:d.target}
            return result  
        })
    return chords
    }

    function computedGroups(data)  {
        let groups = chord(data.matrix).groups
        groups.map(d=>{
            d.name = data.names[d.index]
            d.id = getMeta(data.names[d.index]).id
            d.region = getMeta(data.names[d.index]).region
            d.angle = (d.startAngle  + (d.endAngle - d.startAngle) / 2)
            })
    return groups
    } 

    // process last layout values for c
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

    function getCountryRange(id) {
        var end = input.regions[input.regions.indexOf(id) + 1];
        return {
            start: id + 1,
            end: end ? end - 1 : input.names.length - 1
        };
    }

    function inRange(id, range) {
        return id >= range.start && id <= range.end;
    }

    function inAnyRange(d, ranges) {
        return !!ranges.filter(function (range) {
            return inRange(d.source.id, range) || inRange(d.target.id, range);
        })
        .length;
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

    // START CREATING SVG ELEMENTS
    const container = chordDiagram.append("g")
        .attr("class","container")
        .attr("id","container")
        /* .attr("viewBox", "xMinYMax meet) */    
        
    const groups = container.append("g")        
        .attr("class","groups")
        .selectAll("g")
        .data(computedGroups(data))
        .join("g")
        .attr("class",d=>"group-"+d.id)

    groups.append("path")
        .attr("class","group-arc")
        .attr("d", arc) 
        .attr("id",d=>"group-" + d.id)
        .style("fill",d=> isRegion(d.name) ? getRegionColor(d.name) :colorCountries(d.name))
        .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80)
        .transition()
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
        .attr("d", d3.arc()({ outerRadius:outerRadius   , startAngle: 0, endAngle:   2 * Math.PI  }));

    // const arcs2 = container.append("g")        
    //     .attr("class","group")
    //     .selectAll("g")
    //     .data(computedChords(data))
    //     .join("g")
    
    // arcs2.append("path")
    //     .attr("class","arc2")
    //     .attr("d", arc.innerRadius(innerRadius-5).outerRadius(outerRadius)) 
    //     .style("fill",d=> isRegion(d.target.name) ? getRegionColor(d.target.name) :colorCountries(d.target.name))
    //     /* .style("opacity",d=> isRegion(d.target.name) && config.regions.length > 0 ? 0.03: 0.80) */
    //     .transition()
    //     .duration(500)
    //     .attrTween("d", function(d,j) {
    //         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
    //         return function (t) {
    //             return arc(i(t))
    //         }
    //     })    
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
        .style("opacity",d=> isRegion(d.source.name) && config.regions.length > 0 ? 0.03: 0.80)
        .transition()
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
        .text(d => d.angle > Math.PI
                ? d.name+ " "+ getMeta(d.name).flag
                :  getMeta(d.name).flag+ " "+  d.name
            )
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .transition()
        .duration(600)
        .attrTween("transform", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
            return function (t) {
                var t = labelPosition(i(t).angle);
                  return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
              };
        });
//     var groupTextPathPath = groups      
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.group-textpath-arc')
//         .data(computedGroups(data));
//     groupTextPathPath.enter()
//     .append('path')
//     .attr("class", "group-textpath-arc")
//     .attr("id", function(d, i, k) { return "group-textpath-arc" + d.id; });
//     groupTextPathPath
//     .style("fill", 'none')
//     .transition()
//     .duration(500)
//     .attrTween("d", function(d) {
//         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d );
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//         return function (t) {
//             return textPathArc2(i(t));
//         };
//         } else {
//         return function (t) {
//             return textPathArc(i(t));
//         };
//         }
//     });
//     groupTextPathPath.exit().remove();
//     // Creating a Field for the Textfield
//     var groupTextPathPath2 = groups
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.group-textpath-arc2')
//         .data(computedGroups(data));
//     groupTextPathPath2.enter()
//         .append('path')
//         .attr("class", "group-textpath-arc2")
//         .attr("id", function(d, i, k) { return "group-textpath-arc2" + d.id; });
//     groupTextPathPath2
//         .style("fill", 'none')
//         .transition()
//         .duration(500)
//         .attrTween("d", function(d) {
//         var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d );
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//             return function (t) {
//             return textPathArc3(i(t));
//             };
//         } else {
//             return function (t) {
//             return textPathArc4(i(t));
//             };
//         }
//         });
//     groupTextPathPath2.exit().remove();
//     // text on path
//     var groupTextPath = groups
//     .filter(function(d) {return d.id === d.region})
//     .selectAll('textPath')
//     .data(computedGroups(data));

//     groupTextPath
//     .enter()
//     .append("textPath");

//     groupTextPath
//         .text(function(d) {
//         var meanCalc = (d.endAngle + d.startAngle ) / 2 ;
//         if (nname2[d.id] == ""){
//             return nname1[d.id] ;
//         }else if (meanCalc < 1.57 || meanCalc > 4.711 ){
//             var out = nname2[d.id] ;
//             //var out = "first" ;
//         }else {
//             var out = nname1[d.id] ;
//             // var out = "second";
//         }                         //First NAME  !!!!
//         return  out ; })                  
//         .attr('startOffset', function(d) {
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//         return '75%';
//         } else {
//         return '25%';
//         }
//     })
//     .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; })
// // Added for creating a second layer of TextField for longer names
//     var groupTextPath2 = groups
//         .filter(function(d) {return d.id === d.region})
//         .selectAll('.sec')
//         .data(computedGroups(data));
//     groupTextPath2
//         .enter()
//         .append("textPath")
//         .attr("class", "sec");
//     groupTextPath2
//         .text(function(d) {
//         var meanCalc = (d.endAngle + d.startAngle ) / 2 ;
//         if (nname2[d.id] == ""){
//             return  ;
//         }
//             else if (meanCalc < 1.57 || meanCalc > 4.711 ){
//             var out = nname1[d.id] ; // var out = "first" ;
//         }else {
//             var out = nname2[d.id] ; // var out = "second";
//         }                         
//         return out;  })           
//         .attr('startOffset', function(d) {
//         if (d.angle > Math.PI/2 && d.angle < Math.PI*3/2) {
//             return '75%';
//         } else {
//             return '25%';
//         }
//         })
//         .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc2" + d.id; })    
//     groupTextPath
//     .filter(function(d, i) {
//         return this.getComputedTextLength() > (d.endAngle - d.startAngle) * (config.outerRadius + 18);
//     })
//     .remove();
  
var maxBarHeight = height / 2 - (70);
var arcRegionLabel = d3.arc()
    .innerRadius(maxBarHeight)
    .outerRadius(maxBarHeight + 2)

var regionText = container.selectAll("path.region_label_arc")
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

container.selectAll(".region-label-text")
    .data(computedGroups(data))
    .enter().append("text")
    .attr("class", "region-label-text")
    .filter(d=> isRegion(d.name))
    .append("textPath")
    .attr("font-size",11.5)
    .attr("fill", d => getRegionColor(d.name))
    .attr("xlink:href", function(d, i) {
        return "#region_label_" + i;
    })
    .text(d=> d.name)
    .call(wrapTextOnArc, height / 2 - (70));

// adjust dy (labels vertical start) based on number of lines (i.e. tspans)
regionText.each((d,i)=> { 
    var textPath =d3.selectAll("textPath")["_groups"][0][i]
    tspanCount = textPath.childNodes.length;
    if (d.startAngle > Math.PI / 2 && d.startAngle < 3 * Math.PI / 2 && d.endAngle > Math.PI / 2 && d.endAngle < 3 * Math.PI / 2) {
        d3.select(textPath.childNodes[0]).attr("dy", .3 + (tspanCount - 1) * -0.6 + 'em');
    } else {
        d3.select(textPath.childNodes[0]).attr("dy", -.3 + (tspanCount - 1) * -0.6 + 'em');
    }
});
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
        lineHeight = 1.1, // ems
        x = 0,
        y = 0,
        dy = 0,
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em"),
        arcLength = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * (2 * Math.PI * radius),
        paddedArcLength = arcLength - 12;
    /* console.log(wordCount) */
        while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        textLength = getTextLength(tspan.text());
        tspan.attr("x", (arcLength - textLength) / 2);
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
    }).filter(d=>d.name.includes("Sub") ||d.name.includes("Ocea")).selectAll("tspan").attr("x",0);
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
    var source = isRegion(data.names[d.source.index])
        ? `<span style="color:${ getRegionColor(data.names[d.source.index])}"> ${d.source.name}</span>`
        : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.source.name).flag+ " "+  d.source.name}</span>`
    
    var target = isRegion(data.names[d.target.index] )
        ? `<span style="color:${ getRegionColor(data.names[d.target.index])}"> ${d.target.name}</span>`
        : `<span style="color:${ colorCountries(d.source.name)}"> ${getMeta(d.target.name).flag+ " "+  d.target.name}</span>`
    
    if(filename.includes('stock')){
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

    // INTERACTIONS
    // open regions
    config.maxRegionsOpen = 2 // config.regions = region || config.regions
    
    groups.on('click', function(evt, d) {
            
            if (config.regions.length + 1 > config.maxRegionsOpen) {
                config.regions.shift();       
            }
            /* console.log(d.name) */
            config.regions.push(d.name) // console.log(d.name)
            d3.selectAll("g")
              .remove()    
            update(raw,config)
        })

    // close regions
    groups
        .filter(function(d) {
            return d.id !== d.region;
        })
        .on('click', function(evt, d) {
            config.regions.splice( config.regions.indexOf( getMeta(d.name).region_name ), 1);
            d3.selectAll("g")
                .remove()    
            update(raw,config)
        });

    chordDiagram.selectAll(".group-arc")
        .on("click", function (evt, d) {                    
            /* console.log(data) */
            config.previous = data 
            d3.selectAll("g")
                .remove()    
            update(raw,config)
            // draw new chart 
            /* getData(filename).then(data=> {
                    data = data
                    // remove current content
                    d3.selectAll("g")
                        .remove()        
                    return draw(data,config)
                }) */
        })

    chordDiagram.on("mouseover",mouseover).on("mouseout", mouseout)
 
    function mouseover() {
        chordDiagram.selectAll(".group-arc, .path-item")
             .on("mouseover", function (evt, d) {
            // console.log(d.id)
            if (config.regions < 1){
                chords
                    .selectAll(".path-item, .group-arc")
                    .transition()
                    .duration(80)
                    .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                /* arcs.selectAll(".group-arc")
                .style("opacity",d=> isRegion(d.name) ? 0.03: 0.80) */
                d3.select(this)
                    .transition()
                    .duration(80)
                    .style("opacity", 0.80)
                        
            }
            else{
                chords
                    .selectAll(".path-item, .group-arc")
                    /* .transition()
                    .duration(100) */
                    .style("opacity", p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03:0.80)
                d3.select(this)
                    /* .transition()
                    .duration(100) */
                    .style("opacity",/*   p=> p.source.id !== d.id && p.target.id !== d.id ? 0.03: */0.80)
                }
            }
        )
    }   
        
    function mouseout() {
        chordDiagram.selectAll("g")
            .on("mouseout", function (evt, d) {        
                chords.selectAll(".path-item")
                    .style("opacity",d=> isRegion(d.source.name)&& config.regions.length > 0 ? 0.03: 0.80)
                groups.selectAll(".group-arc")
                    .style("opacity",d=> isRegion(d.name) && config.regions.length > 0 ? 0.03: 0.80)
                
            })  

        chordDiagram.selectAll(".path-item, .country-label")
            .on("mousemove", tooltipCountry)
            .on("mouseout", function(){
                 tooltip.style("visibility", "hidden");
            })

        chordDiagram.selectAll(".group-arc, .country-label")
            .on("mousemove", tooltipRegion)
            .on("mouseout", function(){
                return tooltip.style("visibility", "hidden");
            })
    }

    
    d3.selectAll("#selectYear")
        .on("input", function(d) {

            config.previous = data 
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
            config.previous = data 
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
            config.previous = data 
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
    /* AIAI = d3.selectAll("html#reset")
    console.log(AIAI) */
    
   /*  d3.selectAll(".button")
        .on("click", function(d, evt) {
            config.previous = [] 
        
        
            console.log("MY EYE AI", evt)
            update(raw,config)
            }
        ) */
        
}


