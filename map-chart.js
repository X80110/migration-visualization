const MAP_WIDTH = 960;
const MAP_HEIGHT = 600;

let mapChartSelection = null;

function getMapChart() {
    if (mapChartSelection && !mapChartSelection.empty()) return mapChartSelection;

    // Try to select existing SVG
    const svg = d3.select("#map-chart svg");
    if (!svg.empty()) {
        mapChartSelection = svg;
        return mapChartSelection;
    }

    // If not found, create it
    const container = d3.select("#map-chart");
    if (!container.empty()) {
        mapChartSelection = container.append("svg")
            .attr("viewBox", [0, 0, MAP_WIDTH, MAP_HEIGHT]);
        return mapChartSelection;
    }

    console.error("Map container #map-chart not found!");
    return null;
}

let projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

let path = d3.geoPath()
    .pointRadius(2)
    .projection(projection);

let worldData = null;

async function loadWorldData() {
    if (worldData) return worldData;
    try {
        console.log("Loading world map data...");
        const topology = await d3.json("json/world-110m.json");
        console.log("Topology loaded:", topology);
        if (!topojson) {
            console.error("TopoJSON library not found!");
            return null;
        }
        worldData = topojson.feature(topology, topology.objects.countries);
        console.log("World features processed:", worldData);
        return worldData;
    } catch (error) {
        console.error("Failed to load world map data", error);
        return null;
    }
}

async function drawMap(prepared, rawData, config) {
    const world = await loadWorldData();
    if (!world) {
        console.error("World data is null");
        return;
    }

    const mapChart = getMapChart();
    if (!mapChart) return;

    // --- DATA PREPARATION ---
    // Reuse flows data which contains total_flow, inflow, outflow, etc.
    const flows = prepared.common.flows || prepared.flows; // Fallback just in case

    if (!flows) {
        console.error("Flows data is missing in prepared data", prepared);
        return;
    }

    const getMeta = createGetMeta({ raw_data: rawData.matrix, metadata: rawData.metadata.flags });
    const getRegionColor = createGetRegionColor(rawData.matrix); // Assuming this helper is available or we recreate it

    // Map country names to flows
    const flowMap = new Map(flows.map(d => [d.name, d]));

    // Group for map
    let gMap = mapChart.select("g.map-layer");
    if (gMap.empty()) {
        gMap = mapChart.append("g").attr("class", "map-layer");
    }

    // Draw Countries
    const countries = gMap.selectAll("path.country")
        .data(world.features);

    const merged = countries.join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#e0e0e0") // Default gray
        .attr("stroke", "#fff");


    // --- BUBBLES ---
    let gBubbles = mapChart.select("g.bubble-layer");
    if (gBubbles.empty()) {
        gBubbles = mapChart.append("g").attr("class", "bubble-layer");
    }

    // Scale for bubbles
    const maxFlow = d3.max(flows, d => d.total_flow);
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxFlow])
        .range([2, 50]); // Adjust size range

    const nodes = flows.map(d => {
        return {
            ...d,
            feature: world.features.find(f => f.id == d.id)
        };
    }).filter(d => d.feature);

    const bubbles = gBubbles.selectAll("circle.bubble")
        .data(nodes, d => d.name);

    bubbles.join("circle")
        .attr("class", "bubble")
        .attr("transform", d => {
            const centroid = path.centroid(d.feature);
            return `translate(${centroid})`;
        })
        .attr("r", d => radiusScale(d.total_flow))
        .attr("fill", d => getRegionColor(d.region_name))
        .on("mouseover", function (evt, d) {
            const tooltip = d3.select("#tooltip");
            tooltip.style("visibility", "visible")
                .style("top", (evt.pageY + 10) + "px")
                .style("left", (evt.pageX + 10) + "px")
                .html(`<b>${d.name}</b><br>Total Flow: ${d.total_flow}`);
        })
        .on("mouseout", () => {
            d3.select("#tooltip").style("visibility", "hidden");
        });
}

function updateMap(prepared, rawData, config) {
    drawMap(prepared, rawData, config);
}
