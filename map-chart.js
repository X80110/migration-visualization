const MAP_WIDTH = 960;
const MAP_HEIGHT = 600;

let mapCanvas = null;
let mapContext = null;
let animationFrameId = null;
let particles = [];
let flowPaths = [];
let worldData = null;

// Projection and path generator
let projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

let path = d3.geoPath()
    .pointRadius(2)
    .projection(projection);

// Particle class for animated dots
class Particle {
    constructor(pathData, flowValue, maxFlow) {
        this.path = pathData;
        this.progress = Math.random(); // Random starting position
        this.speed = 0.001 + (flowValue / maxFlow) * 0.002; // Speed varies slightly with flow
        this.flowValue = flowValue;
        this.color = pathData.color;
        this.size = 2;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.progress = 0; // Loop back to start
        }
    }

    getPosition() {
        const t = this.progress;
        // Cubic Bezier curve interpolation
        const x = Math.pow(1 - t, 3) * this.path.start.x +
            3 * Math.pow(1 - t, 2) * t * this.path.control1.x +
            3 * (1 - t) * Math.pow(t, 2) * this.path.control2.x +
            Math.pow(t, 3) * this.path.end.x;

        const y = Math.pow(1 - t, 3) * this.path.start.y +
            3 * Math.pow(1 - t, 2) * t * this.path.control1.y +
            3 * (1 - t) * Math.pow(t, 2) * this.path.control2.y +
            Math.pow(t, 3) * this.path.end.y;

        return { x, y };
    }

    draw(ctx) {
        const pos = this.getPosition();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function getMapCanvas() {
    if (mapCanvas) return mapCanvas;

    const container = document.getElementById("map-chart");
    if (!container) {
        console.error("Map container #map-chart not found!");
        return null;
    }

    // Remove any existing SVG
    const existingSvg = container.querySelector("svg");
    if (existingSvg) {
        existingSvg.remove();
    }

    // Create canvas
    mapCanvas = document.createElement("canvas");
    mapCanvas.width = MAP_WIDTH;
    mapCanvas.height = MAP_HEIGHT;
    mapCanvas.style.width = "100%";
    mapCanvas.style.height = "auto";
    container.appendChild(mapCanvas);

    mapContext = mapCanvas.getContext("2d");
    return mapCanvas;
}

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

// Create curved path between two points
function createCurvedPath(start, end, color) {
    // Calculate control points for cubic Bezier curve
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Create an arc that goes upward (or appropriate direction)
    const curvature = 0.3;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Perpendicular offset for curve
    const offsetX = -dy * curvature;
    const offsetY = dx * curvature;

    return {
        start: start,
        control1: { x: start.x + dx * 0.25 + offsetX, y: start.y + dy * 0.25 + offsetY },
        control2: { x: start.x + dx * 0.75 + offsetX, y: start.y + dy * 0.75 + offsetY },
        end: end,
        color: color
    };
}

function drawCountries(ctx, world) {
    ctx.fillStyle = "#e8e8e8";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.5;

    world.features.forEach(feature => {
        ctx.beginPath();
        path.context(ctx)(feature);
        ctx.fill();
        ctx.stroke();
    });
}

function drawFlowPaths(ctx) {
    // Draw subtle path lines
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1;

    flowPaths.forEach(pathData => {
        ctx.strokeStyle = pathData.color;
        ctx.beginPath();
        ctx.moveTo(pathData.start.x, pathData.start.y);
        ctx.bezierCurveTo(
            pathData.control1.x, pathData.control1.y,
            pathData.control2.x, pathData.control2.y,
            pathData.end.x, pathData.end.y
        );
        ctx.stroke();
    });

    ctx.globalAlpha = 1;
}

function animate() {
    if (!mapContext) return;

    // Clear canvas
    mapContext.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw base map
    if (worldData) {
        drawCountries(mapContext, worldData);
    }

    // Draw flow paths
    drawFlowPaths(mapContext);

    // Update and draw particles
    particles.forEach(particle => {
        particle.update();
        particle.draw(mapContext);
    });

    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

async function drawMap(prepared, rawData, config) {
    const world = await loadWorldData();
    if (!world) {
        console.error("World data is null");
        return;
    }

    const canvas = getMapCanvas();
    if (!canvas) return;

    // Stop any existing animation
    stopAnimation();

    // Get helper functions
    const getMeta = createGetMeta({ raw_data: rawData.matrix, metadata: rawData.metadata.flags });
    const getRegionColor = createGetRegionColor(rawData.matrix);
    const isRegion = createIsRegion(rawData.matrix);

    // Extract actual flows between countries directly from the raw data
    const matrix = rawData.matrix.matrix;
    const names = rawData.matrix.names;

    let maxSingleFlow = 1;
    for (let i = 0; i < names.length; i++) {
        if (isRegion(names[i])) continue;
        for (let j = 0; j < names.length; j++) {
            if (i === j) continue;
            if (isRegion(names[j])) continue;
            if (matrix[i][j] > maxSingleFlow) {
                maxSingleFlow = matrix[i][j];
            }
        }
    }

    // Clear previous data
    particles = [];
    flowPaths = [];

    // Create a node lookup
    const countryNodes = [];
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (isRegion(name)) continue;

        let feature = world.features.find(f => f.properties.name === name);
        if (!feature) {
            feature = world.features.find(f => {
                if (!f.properties.name) return false;
                const topoName = f.properties.name.toLowerCase();
                const dataName = name.toLowerCase();
                return topoName.includes(dataName) || dataName.includes(topoName);
            });
        }
        if (!feature) continue;

        const centroid = path.centroid(feature);
        const meta = getMeta(name);
        
        countryNodes.push({
            name: name,
            region_name: meta.region_name,
            x: centroid[0],
            y: centroid[1]
        });
    }

    const nodeMap = new Map();
    countryNodes.forEach(d => nodeMap.set(d.name, d));

    // Create flow paths and particles
    const minFlowThreshold = maxSingleFlow * 0.01; // Only show flows > 1% of max connection

    // Extract flows
    for (let i = 0; i < names.length; i++) {
        const sourceName = names[i];
        if (isRegion(sourceName)) continue; // Skip regions

        const sourceNode = nodeMap.get(sourceName);
        if (!sourceNode) continue;

        for (let j = 0; j < names.length; j++) {
            if (i === j) continue; // Skip self-flows

            const targetName = names[j];
            if (isRegion(targetName)) continue; // Skip regions

            const targetNode = nodeMap.get(targetName);
            if (!targetNode) continue;

            const flowValue = matrix[i][j];
            if (flowValue < minFlowThreshold) continue;

            // Create curved path
            const color = getRegionColor(sourceNode.region_name);
            const pathData = createCurvedPath(
                { x: sourceNode.x, y: sourceNode.y },
                { x: targetNode.x, y: targetNode.y },
                color
            );

            flowPaths.push(pathData);

            // Create particles based on flow density
            const numParticles = Math.ceil((flowValue / maxSingleFlow) * 20) + 1;

            for (let p = 0; p < numParticles; p++) {
                particles.push(new Particle(pathData, flowValue, maxSingleFlow));
            }
        }
    }

    // console.log(`Created ${flowPaths.length} flow paths with ${particles.length} particles`);

    // Start animation
    animate();
}

function updateMap(prepared, rawData, config) {
    drawMap(prepared, rawData, config);
}
