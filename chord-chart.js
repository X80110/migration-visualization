// Define chart-specific dimensions
const CHORD_WIDTH = 800;
const CHORD_HEIGHT = 750;
const textId = "O-text-1";

// Create svg ONCE (only if it doesn't exist)
let chordDiagram = d3.select("#chord-chart svg");
if (chordDiagram.empty()) {
    chordDiagram = d3.select("#chord-chart")
        .append("svg")
        .attr("viewBox", [-CHORD_WIDTH / 2, -CHORD_HEIGHT / 2, CHORD_WIDTH, CHORD_HEIGHT]);
}

var innerRadius = Math.min(CHORD_WIDTH, CHORD_HEIGHT) * 0.35 + 10;
var outerRadius = innerRadius + 17;
var labelRadius = outerRadius + 10;
var labelThreshold = 1;

// Configure d3 chord 
var chord = chord(true, false)
    .padAngle(0.02)
    .sortSubgroups(d3.descending)

// Utils: return label position for given angle
function labelPosition(angle) {
    var temp = angle.mod(2 * Math.PI);
    return {
        x: Math.cos(temp - Math.PI / 2) * labelRadius,
        y: Math.sin(temp - Math.PI / 2) * labelRadius,
        r: angle > Math.PI ? (temp + Math.PI / 2) * 180 / Math.PI : (temp - Math.PI / 2) * 180 / Math.PI
    };
}

function scaleChordLayout(chordData, metadata) {
    const { matrix, names, maxFlows } = chordData;
    const getMeta = createGetMeta({ raw_data: { names, regions: metadata.regions }, metadata: metadata.flags });

    // Create a map from name to its original index for stable ordering.
    const nameToIndex = new Map(names.map((name, i) => [name, i]));

    // Create the max flow matrix using the stable name order. This matrix is diagonal,
    // with each group's max flow on the diagonal. This is a trick to use d3.chord()
    // to calculate the arc lengths for the max flow values.
    const maxFlowMatrix = Array.from({ length: names.length }, () => Array(names.length).fill(0));
    maxFlows.forEach((flow, i) => {
        const index = nameToIndex.get(names[i]);
        if (index !== undefined) {
            maxFlowMatrix[index][index] = flow;
        }
    });

    // Create layouts for max flow and the current year's data.
    const maxFlowLayout = d3.chord().padAngle(0.02).sortSubgroups(d3.descending)(maxFlowMatrix);
    const yearLayout = d3.chord().padAngle(0.02).sortSubgroups(d3.descending)(matrix);

    // Create the scaled groups. The start and end angles are taken from the max flow layout,
    // while other properties are taken from the current year's layout.
    const scaledGroups = maxFlowLayout.groups.map(maxGroup => {
        const groupName = names[maxGroup.index];
        const yearGroup = yearLayout.groups.find(g => names[g.index] === groupName);
        return {
            ...(yearGroup || {}), // Take properties from the year's group
            startAngle: maxGroup.startAngle,
            endAngle: maxGroup.endAngle,
            name: groupName,
            id: getMeta(groupName).id,
            region: getMeta(groupName).region,
            angle: (maxGroup.startAngle + maxGroup.endAngle) / 2,
        };
    });

    const groupNameToScaledGroup = new Map(scaledGroups.map(g => [g.name, g]));

    // Scale the chords to fit within the new group arcs.
    const scaledChords = yearLayout.map(chord => {
        const sourceName = names[chord.source.index];
        const targetName = names[chord.target.index];

        const scaledSourceGroup = groupNameToScaledGroup.get(sourceName);
        const scaledTargetGroup = groupNameToScaledGroup.get(targetName);

        const sourceYearGroup = yearLayout.groups.find(g => names[g.index] === sourceName);
        const targetYearGroup = yearLayout.groups.find(g => names[g.index] === targetName);

        // Calculate the ratio to scale the chord's width.
        const sourceRatio = (scaledSourceGroup.endAngle - scaledSourceGroup.startAngle) / sourceYearGroup.value;
        const targetRatio = (scaledTargetGroup.endAngle - scaledTargetGroup.startAngle) / targetYearGroup.value;

        // The start angle of the chord is the start angle of the group, plus the widths of all
        // previous chords in that group. This is what creates the "stacking" effect.
        const sourceStartAngle = scaledSourceGroup.startAngle + (chord.source.startAngle - sourceYearGroup.startAngle) * sourceRatio;
        const targetStartAngle = scaledTargetGroup.startAngle + (chord.target.startAngle - targetYearGroup.startAngle) * targetRatio;

        return {
            source: { ...chord.source, startAngle: sourceStartAngle, endAngle: sourceStartAngle + chord.source.value * sourceRatio, name: sourceName },
            target: { ...chord.target, startAngle: targetStartAngle, endAngle: targetStartAngle + chord.target.value * targetRatio, name: targetName }
        };
    });

    return { chords: scaledChords, groups: scaledGroups };
}

// Create arc functions factory
function createArcFunctions(config, input) {
    const isRegion = createIsRegion(input);
    
    return {
        arc: d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(d => isRegion(d.name) && config.regions.length > 0 ? outerRadius - 13 : outerRadius),
        
        arcHover: d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
    };
}


// ========== CHORD CHART ==========
function drawChords(chordData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight) {
    if (config.useMaxFlow) {
        const scaledLayout = scaleChordLayout(chordData, { ...specificRawData, ...metadataCsv});
        chordData.chords = scaledLayout.chords;
        chordData.groups = scaledLayout.groups;
    }
    let data = chordData;
    let flows = commonData.flows;
    let input = specificRawData;
    const getMeta = createGetMeta({ raw_data: specificRawData, metadata: metadataCsv });
    const isRegion = createIsRegion(input);

    let previous = config.previous || data;
    var aLittleBit = Math.PI / 100000;

    // Create arc functions
    const { arc, arcHover } = createArcFunctions(config, input);

    function computedChords(data) {
        if (data.chords) {
            return data.chords.map(d => {
                const sourceBasicMeta = getMeta(d.source.name);
                d.source.region = sourceBasicMeta.region;
                d.source.id = sourceBasicMeta.id;

                const targetBasicMeta = getMeta(d.target.name);
                d.target.region = targetBasicMeta.region;
                d.target.id = targetBasicMeta.id;

                let direction = d.source.id > d.target.id ? 'source' : 'target'
                d.id = direction + `-` + d.source.id + `-` + d.target.id
                return { id: d.id, source: d.source, target: d.target };
            });
        }
        return chord(data.matrix).map(d => {
            d.source.name = data.names[d.source.index];
            const sourceBasicMeta = getMeta(d.source.name);
            d.source.region = sourceBasicMeta.region;
            d.source.id = sourceBasicMeta.id;

            d.target.name = data.names[d.target.index];
            const targetBasicMeta = getMeta(d.target.name);
            d.target.region = targetBasicMeta.region;
            d.target.id = targetBasicMeta.id;

            let direction = d.source.id > d.target.id ? 'source' : 'target'
            d.id = direction + `-` + d.source.id + `-` + d.target.id
            return { id: d.id, source: d.source, target: d.target };
        });
    }

    function computedGroups(data) {
        if (data.groups) {
            return data.groups;
        }
        return chord(data.matrix).groups.map(d => {
            d.name = data.names[d.index];
            const groupBasicMeta = getMeta(d.name);
            d.id = groupBasicMeta.id;
            d.region = groupBasicMeta.region;
            d.angle = (d.startAngle + d.endAngle) / 2;
            return d;
        });
    }

    // Process previous data
    let previousChords = {};
    let previousGroups = {};

    if (previous && previous.chords && previous.groups) {
        previousChords = previous.chords;
        previousGroups = previous.groups;
    } else if (previous && previous.names && previous.matrix) {
        previousChords = computedChords(previous).reduce(function (sum, d) {
            sum[d.id] = d;
            return sum;
        }, {});

        previousGroups = computedGroups(previous).reduce(function (sum, d) {
            sum[d.id] = d;
            return sum;
        }, {});
    }

    // Store for next update
    config.previous = {
        names: data.names,
        matrix: data.matrix,
        chords: computedChords(data).reduce((sum, d) => { sum[d.id] = d; return sum; }, {}),
        groups: computedGroups(data).reduce((sum, d) => { sum[d.id] = d; return sum; }, {})
    };

    var ribbon = d3.ribbonArrow()
        .sourceRadius(innerRadius)
        .targetRadius(innerRadius - 5)
        .headRadius(15)

    const getRegionColor = createGetRegionColor(input)

    const colorCountries = (name) => {
        const countryBasicMeta = getMeta(name);
        let color_country = getRegionColor(countryBasicMeta.region_name);
        let hsl = d3.hsl(color_country);
        const r_palette = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
        const id = Number(countryBasicMeta.id);
        const region = Number(countryBasicMeta.region);
        if (isNaN(id) || isNaN(region)) return r_palette[0];
        let palleteIndex = ((id - region) % 5 + 5) % 5;
        return r_palette[palleteIndex];
    };

    // SELECT OR CREATE CONTAINER
    let container = chordDiagram.select("g.container");
    if (container.empty()) {
        container = chordDiagram.append("g")
            .attr("class", "container")
            .attr("id", "container");
    }

    // ========== GROUPS (ARCS) ==========
    let groupsContainer = container.select("g.groups");
    if (groupsContainer.empty()) {
        groupsContainer = container.append("g").attr("class", "groups");
    }

    const groupData = computedGroups(data);
    
    const groups = groupsContainer
        .selectAll("g.group")
        .data(groupData, d => d.id);

    // EXIT - Simple exit animation
    groups.exit()
        .transition()
        .duration(100)
        .style("opacity", 0.3)
        .remove();

    // ENTER - Simple enter
    const groupsEnter = groups.enter()
        .append("g")
        .attr("class", "group");

    groupsEnter.append("path")
        .attr("class", "group-arc")
        .attr("id", d => "group-" + d.id)
        .style("fill", d => isRegion(d.name) ? getRegionColor(d.name) : colorCountries(d.name))
        /* .style("opacity", 0) */
        .attr("d", d => {
            const prev = previousGroups[d.id] || { startAngle: 0, endAngle: aLittleBit };
            return arc(prev);
        });

    // UPDATE (merge enter + existing) - Morph from current state
    const groupsMerged = groupsEnter.merge(groups);

    groupsMerged.select(".group-arc")
        .transition()
        .duration(600)
        /* .ease(d3.easeCubicInOut) */
        /* .style("opacity", 0.80) */
        .attrTween("d", function (d) {
            const prev = previousGroups[d.id] || { startAngle: d.startAngle, endAngle: d.startAngle + aLittleBit };
            const i = d3.interpolate(prev, d);
            return function (t) {
                return arc(i(t));
            }
        });

    // ========== CHORDS (RIBBONS) ==========
    let chordsContainer = container.select("g.chords");
    if (chordsContainer.empty()) {
        chordsContainer = container.append("g").attr("class", "chords");
    }

    const chordsDataComputed = computedChords(data);
    
    const chords = chordsContainer
        .selectAll("path.chord-path")
        .data(chordsDataComputed, d => d.id);

    // EXIT
    chords.exit()
        .transition()
        .duration(400)
        /* .style("opacity", 0) */
        .remove();

    // ENTER
    const chordsEnter = chords.enter()
        .append("path")
        .attr("class", "chord-path")
        .style("fill", d => isRegion(d.source.name) ? getRegionColor(d.source.name) : colorCountries(d.source.name))
        /* .style("opacity", 0) */
        .attr("d", d => {
            const prev = previousChords[d.id] || {
                source: { startAngle: 0, endAngle: aLittleBit },
                target: { startAngle: 0, endAngle: aLittleBit }
            };
            return ribbon(prev);
        });

    // UPDATE - Morph from current state
    const chordsMerged = chordsEnter.merge(chords);

    chordsMerged
        .transition()
        .duration(600)
        /* .ease(d3.easeCubicInOut) */
        .style("opacity", d => isRegion(d.source.name) && config.regions.length > 0 ? 0.1 : 1)
        .attrTween("d", function (d) {
            const prev = previousChords[d.id] || {
                source: { startAngle: d.source.startAngle, endAngle: d.source.startAngle + aLittleBit },
                target: { startAngle: d.target.startAngle, endAngle: d.target.startAngle + aLittleBit }
            };
            const i = d3.interpolate(prev, d);
            return function (t) {
                return ribbon(i(t));
            }
        });

    // ========== COUNTRY LABELS ==========
    /* const countryLabelsData = groupData.filter(d => !isRegion(d.name)); */
    
    const countryLabels = groupsMerged
        .filter(d => !isRegion(d.name))
        .selectAll("text.country-label")
        .data(d => [d], d => d.id);

    countryLabels.exit().remove();

  const countryLabelsEnter = countryLabels.enter()
    .append("text")
    .attr("class", "country-label")
    .attr("font-size", 9);

    countryLabelsEnter.merge(countryLabels)
        .text(d => d.angle > Math.PI
            ? d.name + " " + getMeta(d.name).flag
            : getMeta(d.name).flag + " " + d.name
        )
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .html(d => d.angle > Math.PI
            ? d.name + ' <tspan class="flag-emoji">' + getMeta(d.name).flag + '</tspan>'
            : '<tspan class="flag-emoji">' + getMeta(d.name).flag + '</tspan> ' + d.name
        )
        .transition('country-label')
        .attrTween("transform", function(d) {
            var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || { angle: 0 }, d);
            return function (t) {
                var t = labelPosition(i(t).angle);
                return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
            };
        });
    // ========== REGION LABELS ==========
    /* const regionLabelsData = groupData.filter(d => isRegion(d.name)); */
    
    const maxBarHeight = chartHeight / 2 - 70;
    const arcRegionLabel = d3.arc()
        .innerRadius(maxBarHeight)
        .outerRadius(maxBarHeight + 2);

    // Region label paths - FIXED: Use proper morphing
    const regionLabelPaths = groupsMerged
        .filter(d => isRegion(d.name))
        .selectAll("path.region-label-arc")
        .data(d => [d], d => d.id);

    regionLabelPaths.exit().remove();

    const regionLabelPathsEnter = regionLabelPaths.enter()
        .append("path")
        .attr("class", "region-label-arc")
        .attr("id", (d, i) => "region_label_" + d.id)
        .attr("fill", "none");

    // UPDATE region label paths with morphing
    regionLabelPathsEnter.merge(regionLabelPaths)
        .transition()
        .duration(600)
        /* .ease(d3.easeCubicInOut) */
        .attrTween("d", function(d) {
            const prev = previousGroups[d.id] || { 
                startAngle: d.startAngle, 
                endAngle: d.startAngle + aLittleBit 
            };
            const i = d3.interpolate(prev, d);
            return function(t) {
                const interpolated = i(t);
                let pathD = arcRegionLabel(interpolated);
                
                // Process the path to ensure proper text placement
                const firstArcSection = /(^.+?)L/;
                let match = firstArcSection.exec(pathD);
                if (!match) return pathD;
                
                let newArc = match[1].replace(/,/g, " ");
                
                // Reverse the arc if it's in the bottom half for better text placement
                if (interpolated.startAngle > Math.PI / 2 && interpolated.startAngle < 3 * Math.PI / 2 &&
                    interpolated.endAngle > Math.PI / 2 && interpolated.endAngle < 3 * Math.PI / 2) {
                    const startLoc = /M(.*?)A/;
                    const middleLoc = /A(.*?)0 0 1/;
                    const endLoc = /0 0 1 (.*?)$/;
                    
                    const newStart = endLoc.exec(newArc)?.[1];
                    const newEnd = startLoc.exec(newArc)?.[1];
                    const middleSec = middleLoc.exec(newArc)?.[1];
                    
                    if (newStart && newEnd && middleSec) {
                        newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
                    }
                }
                return newArc;
            };
        });

    // Region label text
    const regionLabelTexts = groupsMerged
        .filter(d => isRegion(d.name))
        .selectAll("text.region-label-text")
        .data(d => [d], d => d.id);

    regionLabelTexts.exit().remove();

    const regionLabelTextsEnter = regionLabelTexts.enter()
        .append("text")
        .attr("class", "region-label-text")
        /* .style("opacity", 0); */

    const regionLabelTextsMerged = regionLabelTextsEnter.merge(regionLabelTexts);

    regionLabelTextsMerged
        .selectAll("textPath")
        .data(d => [d], d => d.id)
        .join("textPath")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("fill", d => getRegionColor(d.name))
        .attr("xlink:href", d => "#region_label_" + d.id)
        /* .style("transform", "translateZ(0)") */
        .text(d => d.name)
        .call(wrapTextOnArc, maxBarHeight + 40)

    regionLabelTextsMerged
        .transition()
        .duration(600)
/*         .style("opacity", 1); */



    function wrapTextOnArc(text, radius) {
        var temporaryText = d3.select('svg')
            .append("text")
            .attr("class", "temporary-text")
            /* .style("opacity", 0); */
        var getTextLength = function (string) {
            temporaryText.text(string);
            return temporaryText.node().getComputedTextLength();
        };

        text.each(function (d) {
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
                paddedArcLength = arcLength + 10;

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                textLength = getTextLength(tspan.text());
                tspan.attr("x", (arcLength - textLength) / 2);

                if (textLength > paddedArcLength && line.length === 1) {
                    textLength = getTextLength(tspan.text());
                    console.log(tspan.text())
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
        .filter(d => d.name.includes("Ocea")).selectAll("tspan").attr("x", -4);
    }
        
    // ========== TOOLTIPS ==========
    let tooltip = d3.select('body').select('g#tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'tooltip')
            .style('background-color', '#ffffff')
            .style('padding', '1em')
            .style('border-radius', '4px')
            .style('position', 'absolute')
            .style('text-align', 'center')
            .style('visibility', 'hidden')
            .style('pointer-events', 'none')
            .style('box-shadow', 'rgba(0, 0, 0, 0.35) 0px 5px 15px');
    }

    function tooltipCountry(evt, d_link) {
        const sourceBasicMeta = getMeta(d_link.source.name);
        const sourceFlowInfo = flows.find(f => f.name === d_link.source.name) || {};
        const sourceFullMeta = { ...sourceBasicMeta, ...sourceFlowInfo };

        const targetBasicMeta = getMeta(d_link.target.name);
        const targetFlowInfo = flows.find(f => f.name === d_link.target.name) || {};
        const targetFullMeta = { ...targetBasicMeta, ...targetFlowInfo };

        const sourceDisplay = isRegion(d_link.source.name)
            ? `<span style="color:${getRegionColor(d_link.source.name)}"> ${d_link.source.name}</span>`
            : `<span style="color:${colorCountries(d_link.source.name)}"> ${sourceFullMeta.flag + " " + d_link.source.name}</span>`;
        const targetDisplay = isRegion(d_link.target.name)
            ? `<span style="color:${getRegionColor(d_link.target.name)}"> ${d_link.target.name}</span>`
            : `<span style="color:${colorCountries(d_link.target.name)}"> ${targetFullMeta.flag + " " + d_link.target.name}</span>`;

        const currentFilename = fileName(config).json;
        const valueDisplay = currentFilename.includes('stock')
            ? `<div><b>${formatValue(d_link.source.value)}</b><br>in<br></div>`
            : `<div>▾<br><b>${formatValue(d_link.source.value)}</b><br></div>`;

        tooltip
            .html(`<b>${sourceDisplay}</b> ${valueDisplay} ${targetDisplay}`)
            .style('background-color', '#ffffff')
            .style("top", (evt.pageY + 20) + "px")
            .style("left", (evt.pageX + 30) + "px")
            .style("visibility", "visible");
    }

    function tooltipRegion(evt, d_group) {
        const basicMeta = getMeta(d_group.name);
        const flowInfo = flows.find(f => f.name === d_group.name) || {};
        const fullMeta = { ...basicMeta, ...flowInfo };

        const sourceDisplay = isRegion(d_group.name)
            ? `<span style="color:white"><b>${d_group.name}</b></span>`
            : `<span style="color:white">${fullMeta.region_name}</span><br><span style="color:white"><b>${fullMeta.flag + " " + d_group.name}</b></span>`;

        const outflowDisplay = formatValue(fullMeta.outflow || 0);
        const inflowDisplay = formatValue(fullMeta.inflow || 0);

        const currentFilename = fileName(config).json;
        const labels = currentFilename.includes('stock')
            ? { out: 'Total emigrants', in: 'Total immigrants' }
            : { out: 'Total Outflow', in: 'Total Inflow' };

        tooltip
            .html(`${sourceDisplay}<br>${labels.out}: <b>${outflowDisplay}</b><br>${labels.in}: <b>${inflowDisplay}</b>`)
            .style('background-color', isRegion(d_group.name) ? getRegionColor(d_group.name) : colorCountries(d_group.name))
            .style("top", (evt.pageY + 20) + "px")
            .style("left", (evt.pageX + 30) + "px")
            .style("visibility", "visible");
    }

    // ========== INTERACTIONS ==========
    config.maxRegionsOpen = 2;

    // Clear any existing hover timeout
    if (window.chordHoverTimeout) {
        clearTimeout(window.chordHoverTimeout);
    }

    // PERFORMANCE FIX: Debounce opacity changes to prevent excessive DOM updates
    let pendingOpacityUpdate = null;
    let opacityUpdateScheduled = false;

    function scheduleOpacityUpdate(updateFn) {
        pendingOpacityUpdate = updateFn;
        if (!opacityUpdateScheduled) {
            opacityUpdateScheduled = true;
            requestAnimationFrame(() => {
                if (pendingOpacityUpdate) {
                    pendingOpacityUpdate();
                    pendingOpacityUpdate = null;
                }
                opacityUpdateScheduled = false;
            });
        }
    }

    // Function to highlight a specific ribbon (single ribbon hover)
    function highlightSingleRibbon(ribbonId) {
        scheduleOpacityUpdate(() => {
            chordsMerged.style("opacity", d => d.id === ribbonId ? 1 : 0.1);
        });
    }

    // Function to highlight all ribbons related to a region or country
    function highlightRelatedRibbons(entityName) {
        scheduleOpacityUpdate(() => {
            chordsMerged.style("opacity", d => {
                const sourceIsTargetEntity = d.source.name === entityName;
                const targetIsTargetEntity = d.target.name === entityName;
                
                if (sourceIsTargetEntity || targetIsTargetEntity) {
                    return 1;
                } else {
                    return 0.1;
                }
            });
        });
    }

    // Function to reset ribbon highlighting
    function resetRibbonHighlighting() {
        scheduleOpacityUpdate(() => {
            chordsMerged.style("opacity", d => 
                isRegion(d.source.name) && config.regions.length > 0 ? 0.1 : 1
            );
        });
    }

    // Click interactions
    groupsMerged.on('click', function (evt, d) {
        evt.stopPropagation();
        
        if (d.id === d.region) {
            // Clicking a region - expand it
            if (config.regions.length >= config.maxRegionsOpen) {
                config.regions.shift();
            }
            config.regions.push(d.name);
        } else {
            // Clicking a country - collapse its region
            const basicMeta = getMeta(d.name);
            const regionNameToRemove = basicMeta.region_name;
            const indexToRemove = config.regions.indexOf(regionNameToRemove);
            if (indexToRemove > -1) {
                config.regions.splice(indexToRemove, 1);
            }
        }
        
        tooltip.style("visibility", "hidden");
        resetRibbonHighlighting();
        update({ regions: [...config.regions] });
    });

    // Hover interactions - optimized to reduce violations
    let hoverTimeout;
    
    // Ribbon hover - highlight single ribbon
    chordsMerged
        .on("mouseover", function (evt, d) {
            clearTimeout(hoverTimeout);
            highlightSingleRibbon(d.id);
            
            // Also highlight connected arcs
            groupsMerged.select(".group-arc")
                .style("opacity", groupD => {
                    return (groupD.name === d.source.name || groupD.name === d.target.name) ? 1 : 1;
                });
        })
        .on("mousemove", tooltipCountry)
        .on("mouseout", function () {
            hoverTimeout = setTimeout(() => {
                resetRibbonHighlighting();
                // Reset arc opacities
                groupsMerged.select(".group-arc").style("opacity", 1);
                tooltip.style("visibility", "hidden");
            }, 50);
        });

    // Arc hover - highlight all related ribbons
    groupsMerged
        .on("mouseover", function (evt, d) {
            clearTimeout(hoverTimeout);
            
            // Highlight the hovered arc
            d3.select(this).select(".group-arc")
                .transition()
                .duration(150)
                .attr("d", arcHover);
            
            // Highlight all ribbons related to this entity (region or country)
            highlightRelatedRibbons(d.name);
        })
        .on("mousemove", tooltipRegion)
        .on("mouseout", function (evt, d) {
            hoverTimeout = setTimeout(() => {
                d3.select(this).select(".group-arc")
                    .transition()
                    .duration(150)
                    .attr("d", arc);
                
                resetRibbonHighlighting();
                tooltip.style("visibility", "hidden");
            }, 50);
        });

    // Region label text hover - also highlight all related ribbons
    regionLabelTextsMerged
        .on("mouseover", function (evt, d) {
            clearTimeout(hoverTimeout);
            
            // Find the parent group and highlight its arc
            const parentGroup = d3.select(this.parentNode);
            parentGroup.select(".group-arc")
                .transition()
                .duration(100)
                .attr("d", arcHover);
            
            // Highlight all ribbons related to this region
            highlightRelatedRibbons(d.name);
        })
        .on("mousemove", tooltipRegion)
        .on("mouseout", function (evt, d) {
            hoverTimeout = setTimeout(() => {
                const parentGroup = d3.select(this.parentNode);
                parentGroup.select(".group-arc")
                    .transition()
                    .duration(150)
                    .attr("d", arc);
                
                resetRibbonHighlighting();
                tooltip.style("visibility", "hidden");
            }, 50);
        });

  /*   // Add mouseout event for the entire container to reset highlighting
    container.on("mouseout", function() {
        hoverTimeout = setTimeout(() => {
            resetRibbonHighlighting();
            groupsMerged.select(".group-arc").style("opacity", 1);
        }, 50);
    }); */

}