// Inspired by http://bl.ocks.org/nl-hugo/c1a6c6f5b459449b9832d9f3ef73cb7d
// Inspired by https://observablehq.com/@stroked/daily-options-activity-sankey

// Initialize Sankey Chart SVG
// The SVG persists, but its contents (groups) are cleared by index.html switchViz logic
const sankeyDiagram = d3.select("#sankey-chart")
    .append("svg")
    // Use viewBox for responsiveness, but note chartWidth/Height passed to setData are specific
    .attr("viewBox", [-(width / 5), -10, width, height + 50]);


const tooltip = d3.select('body').append('g')
    .attr('id', 'tooltip')
    .style('background-color', '#ffffff')
    .style('padding', '1em')
    .style('border-radius', '4px')
    .style('position', 'absolute')
    .style('text-align', 'center')
    .style('visibility', 'hidden')
    .style('box-shadow', 'rgba(0, 0, 0, 0.35) 0px 5px 15px')


function setData(sankeyData, commonData, specificRawData, metadataCsv, config, chartWidth, chartHeight) {

    // Check if groups exist, otherwise append them
    let Links = sankeyDiagram.select("g.links");
    if (Links.empty()) {
        Links = sankeyDiagram.append("g").attr("class", "links");
    }

    let Nodes = sankeyDiagram.select("g.nodes");
    if (Nodes.empty()) {
        Nodes = sankeyDiagram.append("g").attr("class", "nodes");
    }

    const input_data = specificRawData;

    // Use pre-calcualted graph from prepare-data.js
    let graphData = {
        nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
        links: sankeyData.links.map(d => Object.assign({}, d))
    };

    // Layout Helpers
    let indexedSource = sankeyData.layout.source || [];
    let indexedTarget = sankeyData.layout.target || [];

    const sankey = d3.sankey()
        .nodeWidth(16)
        .nodePadding(8)
        .size([chartWidth - 300, chartHeight])
        .nodeSort((a, b) => {
            // Sort nodes based on their index in the source/target lists to maintain order
            // Checks if node has source links (is on left/source side mostly) or target links
            if (a.sourceLinks && a.sourceLinks.length > 0 && b.sourceLinks && b.sourceLinks.length > 0) {
                return d3.ascending(indexedSource.indexOf(a.name), indexedSource.indexOf(b.name));
            }
            if (a.targetLinks && a.targetLinks.length > 0 && b.targetLinks && b.targetLinks.length > 0) {
                return d3.ascending(indexedTarget.indexOf(a.name), indexedTarget.indexOf(b.name));
            }
            return 0;
        });

    const { nodes, links } = sankey(graphData);


    //// UTIL FUNCTIONS ////////////////////////////////////////////////////////////////////////
    function formatValue(nStr, seperator) {
        seperator = seperator || ','
        nStr += ''
        let x = nStr.split('.')
        let x1 = x[0]
        let x2 = x.length > 1 ? '.' + x[1] : ''
        var rgx = /(\d+)(\d{3})/
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + seperator + '$2');
        }
        return x1 + x2;
    }

    const isRegion = createIsRegion(input_data);

    // Assuming filename function needs to be accessed, or we derive it from config
    // We can access global 'filename' function from index.html if needed, 
    // but better to rely on passed data/config.
    const isStock = config.stockflow === "stock";

    // Retrieve full metadata for a country/region name
    const getMeta = createGetMeta({ raw_data: specificRawData, metadata: metadataCsv });


    function getRegionIndex(nameIdx) {
        // Find which region range this index belongs to
        // Assuming regions array contains start indices of regions
        if (!input_data.regions || input_data.regions.length === 0) return -1;

        // Simple cleanup: find the largest region index <= nameIdx
        // but input_data.regions are indices of the regions themselves.
        // And countries follow their region.
        let r = -1;
        for (let i = 0; i < input_data.regions.length; i++) {
            if (input_data.regions[i] <= nameIdx) {
                r = input_data.regions[i];
            } else {
                break;
            }
        }
        return r;
    }

    function getRegionColor(name) {
        // Find region name for this country/region
        let rName = name;
        if (!isRegion(name)) {
            const m = getMeta(name);
            rName = m.region_name;
        }

        const regionNames = input_data.regions.map(r => input_data.names[r]);
        const idx = regionNames.indexOf(rName);

        const colors = [
            '#40A4D8', '#35B8BD', '#7FC05E', '#D0C628',
            '#FDC32D', '#FBA127', '#F76F21', '#E5492D',
            '#C44977', '#8561D5', '#0C5BCE'
        ];

        if (idx === -1) return colors[0];
        return colors[idx % colors.length];
    }

    function colorCountries(name) {
        let regionColor = getRegionColor(name);
        let hsl = d3.hsl(regionColor);
        let m = getMeta(name);

        // Pseudo-random variation based on id and region index
        // Use a safe fallback if region index is wonky
        let diff = (m.id - getRegionIndex(m.id)) || 0;

        let variants = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
        return variants[Math.abs(diff) % 5];
    }


    //// DRAWING ////////////////////////////////////////////////////////////////////////

    // Links
    var link = Links.selectAll("path")
        .data(links, d => d.source.name + "_" + d.target.name);

    var linkEnter = link.enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("class", "link")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke", d => {
            // For bipartite: source is usually Origin, Target is Destination
            // If source is a Region, color by Region.
            return isRegion(d.source.name) ? getRegionColor(d.source.name) : colorCountries(d.source.name)
        })
        .style("opacity", d => isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1 : 0.7)

    linkEnter.merge(link)
        .transition('link')
        .duration(750) // Slower for smoother look
        .attr("d", d3.sankeyLinkHorizontal())
        .style("opacity", d => isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1 : 0.7)
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke", d => isRegion(d.source.name) ? getRegionColor(d.source.name) : colorCountries(d.source.name));

    link.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    // Nodes
    var node = Nodes.selectAll("g")
        .data(nodes, d => d.name);

    var nodeEnter = node.enter().append("g")
        .style("opacity", 0);

    nodeEnter.append("rect")
        .attr("class", "node")
        .attr("x", d => d.x0 < width / 2 ? d.x0 - 3 : d.x0 + 3)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => isRegion(d.name) ? getRegionColor(d.name) : colorCountries(d.name));

    // Text Labels
    nodeEnter.append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("x", d => d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .text(d => {
            const meta = getMeta(d.name);
            return d.sourceLinks.length > 0
                ? d.name + " " + meta.flag
                : meta.flag + " " + d.name;
        })
        .filter(d => d.x0 < chartWidth / 2) // If on left side, anchor start
        .attr("x", d => d.x1 + 6)
        .attr("text-anchor", "start");


    // Update nodes
    var nodeUpdate = nodeEnter.merge(node);

    // Fade in both new and existing nodes to correct opacity
    nodeUpdate
        .transition('node-group')
        .duration(750)
        .style("opacity", 1); // Group opacity

    nodeUpdate.select("rect")
        .transition('node')
        .duration(750)
        .attr("x", d => d.x0 < width / 2 ? d.x0 - 3 : d.x0 + 3)
        .attr("y", d => d.y0)
        .attr("height", Math.max(0, d => d.y1 - d.y0)) // Safety
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => isRegion(d.name) ? getRegionColor(d.name) : colorCountries(d.name))
        .style("opacity", d => isRegion(d.name) && config.regions.length > 0 ? 0.1 : 0.7);

    nodeUpdate.select("text")
        .transition('text')
        .duration(750)
        .attr("font-size", d => isRegion(d.name) ? "85%" : "60%")
        .attr("font-weight", d => isRegion(d.name) ? "600" : "400")
        .attr("y", d => (d.y1 + d.y0) / 2 - 4)
        .attr("x", d => {
            if (d.x0 < chartWidth / 2 && isRegion(d.name)) { return d.x1 + 6 }
            if (d.x0 > chartWidth / 2 && isRegion(d.name)) { return d.x0 - 6 }
            if (d.x0 < chartWidth / 2 && !isRegion(d.name)) { return d.x1 - 26 }
            if (d.x0 > chartWidth / 2 && !isRegion(d.name)) { return d.x0 + 26 }
        })
        .attr("dy", "0.6em")
        .attr("text-anchor", d => {
            if (d.x0 < chartWidth / 2 && isRegion(d.name)) { return "start" }
            if (d.x0 > chartWidth / 2 && isRegion(d.name)) { return "end" }
            if (d.x0 < chartWidth / 2 && !isRegion(d.name)) { return "end" }
            if (d.x0 > chartWidth / 2 && !isRegion(d.name)) { return "start" }
        })
        .text(d => {
            const meta = getMeta(d.name);
            return d.sourceLinks.length > 0
                ? d.name + " " + meta.flag
                : meta.flag + " " + d.name;
        })
        .style("opacity", 1); // Ensure text is visible

    node.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();


    //// INTERACTIONS /////////////////////////////////////////////////////////////////

    // Click on Region to Expand/Collapse
    nodeEnter
        .on('click', function (evt, d) {
            // Check if it's a region
            if (isRegion(d.name)) {
                // Ensure config.regions is an array
                if (!Array.isArray(config.regions)) {
                    config.regions = [];
                }

                // Determine side based on node type if available, otherwise fallback to x position
                // Our prepare-data.js assigns type "source" or "target"
                let isSource = d.type === 'source';
                if (!d.type) {
                    // Fallback if type not present
                    isSource = d.x0 < chartWidth / 2;
                }

                // If on left (source), set config.regions[0]
                // If on right (target), set config.regions[1]
                if (isSource) {
                    // Toggle: if already selected, deselect
                    config.regions[0] = (config.regions[0] === d.name) ? null : d.name;
                } else {
                    config.regions[1] = (config.regions[1] === d.name) ? null : d.name;
                }

                // Call global update with new config
                if (typeof update === 'function') {
                    update({ regions: config.regions });
                }
            } else {
                // If it's a country, collapse its region
                // This logic implies collapsing the region that contains this country.
                // We need to check if this country is in source or target side to know which index to clear.

                const meta = getMeta(d.name);
                let isSource = d.type === 'source';
                if (!d.type) {
                    isSource = d.x0 < chartWidth / 2;
                }

                // Check if the current side has this region expanded
                const regionName = meta.region_name;
                if (isSource) {
                    if (config.regions[0] === regionName) config.regions[0] = null;
                } else {
                    if (config.regions[1] === regionName) config.regions[1] = null;
                }

                if (typeof update === 'function') {
                    update({ regions: config.regions });
                }
            }
        });

    // Tooltips
    function tooltipCountry(evt, d) {
        let sourceName = d.source.name;
        let targetName = d.target.name;

        // Colors relative to Source
        let sourceColor = isRegion(sourceName) ? getRegionColor(sourceName) : colorCountries(sourceName);
        // Remote logic uses source color for target label if it's a country to keep flow consistency
        let targetColor = isRegion(targetName) ? getRegionColor(targetName) : colorCountries(sourceName);

        let sourceLabel = isRegion(sourceName)
            ? `<span style="color:${sourceColor}"> ${sourceName}</span>`
            : `<span style="color:${sourceColor}"> ${getMeta(sourceName).flag} ${sourceName}</span>`;

        let targetLabel = isRegion(targetName)
            ? `<span style="color:${targetColor}"> ${targetName}</span>`
            : `<span style="color:${targetColor}"> ${getMeta(targetName).flag} ${targetName}</span>`;

        let valStr = formatValue(d.value);
        let valueHtml = "";

        if (isStock) {
            valueHtml = ` <div> 
                        <b>${valStr}</b> 
                        <br>in<br> </div> `;
        } else {
            valueHtml = ` <div> 
                        ▾<br>
                        <b>${valStr}</b> 
                        <br> </div> `;
        }

        tooltip
            .html(`<span> ${sourceLabel} 
                        ${valueHtml} 
                        ${targetLabel}  </span>`)
            .transition('tooltip')
            .duration(50)
            .style('background-color', '#ffffff')
            .style('padding', '1em')
            .style("top", (evt.pageY + 20) + "px")
            .style("left", (evt.pageX + 30) + "px")
            .style('visibility', 'visible');
    }

    function tooltipRegion(evt, d) {
        const meta = getMeta(d.name);

        // Remote HTML structure
        let label = isRegion(d.name)
            ? `<span style="color:white"> <b>${d.name}</b></span>`
            : `<span style="color:white"> ${meta.region_name}</span><br>
                <span style="color:white"><b> ${meta.flag} ${d.name}</b></span>`;

        let outflow = formatValue(commonData.flows.filter(g => g.name === d.name)[0].outflow);
        let inflow = formatValue(commonData.flows.filter(g => g.name === d.name)[0].inflow);

        let htmlContent = "";
        if (isStock) {
            htmlContent = `<span> ${label} <br>
                        Total emigrants: <b> ${outflow}</b> <br>
                        Total immigrants: <b> ${inflow} </b> </span>`;
        } else {
            htmlContent = `<span> ${label} <br>
                        Total Out: <b> ${outflow}</b> <br>
                        Total In: <b> ${inflow} </b> </span>`;
        }

        tooltip
            .html(htmlContent)
            .style('background-color', isRegion(d.name) ? getRegionColor(d.name) : colorCountries(d.name))
            .style("top", (evt.pageY + 20) + "px")
            .style("left", (evt.pageX + 30) + "px")
            .style("visibility", "visible");
    }

    linkEnter
        .on("mousemove", tooltipCountry)
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

    nodeEnter
        .on("mousemove", tooltipRegion)
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

    // Highlighting
    nodeEnter.selectAll(".node") // target the rect, or the group?
        // Actually event listener is on nodeEnter (the group)
        .on("mouseover", function (evt, d) {
            // Dim all
            sankeyDiagram.selectAll(".node rect").style("opacity", 0.1);
            sankeyDiagram.selectAll(".link").style("opacity", 0.1);

            // Highlight this node
            d3.select(this).select("rect").style("opacity", 1);

            // Highlight connected links
            // Logic adapted from remote to use robust source/target checks
            if (d.sourceLinks.length > 0) {
                // It is a source node, highlight outgoing links
                sankeyDiagram.selectAll(".link")
                    .filter(l => l.source.name === d.name)
                    .style("opacity", 0.8);
            } else if (d.targetLinks.length > 0) {
                // It is a target node, highlight incoming links
                sankeyDiagram.selectAll(".link")
                    .filter(l => l.target.name === d.name)
                    .style("opacity", 0.8);
            }
        })
        .on("mouseout", function () {
            // Let the global sankeyDiagram mouseout handle reset to ensure clean state
            // But we can reset here too for responsiveness on element leave
            // Reverting to global handler style:
        });

    linkEnter
        .on("mouseover", function (evt, d) {
            sankeyDiagram.selectAll(".link")
                .transition('mouseover')
                .duration(50)
                .style("opacity", 0.1);

            d3.select(this)
                .transition('mouseover')
                .duration(50)
                .style("opacity", 1);
        });

    sankeyDiagram
        .on('mouseout', function () {
            sankeyDiagram.select("g#tooltip").style("visibility", "hidden");

            sankeyDiagram.selectAll(".link")
                .style("opacity", d => isRegion(d.source.name) && isRegion(d.target.name) && config.regions.length > 0 ? 0.1 : 0.7);

            sankeyDiagram.selectAll(".node rect")
                .style("opacity", d => isRegion(d.name) && config.regions.length > 0 ? 0.1 : 0.7);
        });
}
