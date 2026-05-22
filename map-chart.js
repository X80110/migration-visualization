const MAP_WIDTH = 960;
const MAP_HEIGHT = 600;

let mapCanvas = null;
let mapContext = null;
let animationFrameId = null;
let particles = [];
let flowPaths = [];
let worldData = null;

// Map Parameters Debug Config
let mapParams = {
    density: 100,
    size: 1.6,
    curvature: 0.05,
    speedBase: 0.007,
    projectionType: "geoOrthographic"
};

let projection = d3[mapParams.projectionType]()
    .scale(160)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

let path = d3.geoPath()
    .pointRadius(2)
    .projection(projection);

let globalFlowData = [];
let isUserInteracting = false;
let currentRotate = [0, 0];
let lastZoomTransform = null;

let baseScale = 160;
let baseTranslate = [MAP_WIDTH / 2, MAP_HEIGHT / 2];

function calculateDefaultProjection() {
    if (!worldData || !d3[mapParams.projectionType]) return;

    // Create temporary projection with scale 1 to measure natural bounds
    let tempProj = d3[mapParams.projectionType]().rotate([0, 0, 0]).translate([0, 0]).scale(1);
    let pathGenerator = d3.geoPath().projection(tempProj);

    let obj = mapParams.projectionType === "geoOrthographic" ? { type: "Sphere" } : worldData;
    let bounds = pathGenerator.bounds(obj);

    let objHeight = bounds[1][1] - bounds[0][1];
    let targetHeight = MAP_HEIGHT - 40; // 20px padding top/bottom

    // Scale strictly to fit height
    baseScale = targetHeight / objHeight;

    // Center it according to the scaled bounds
    baseTranslate = [
        MAP_WIDTH / 2 - (bounds[1][0] + bounds[0][0]) / 2 * baseScale,
        MAP_HEIGHT / 2 - (bounds[1][1] + bounds[0][1]) / 2 * baseScale
    ];
}

let mapTransform = d3.zoomIdentity;
let mapZoomLogic = d3.zoom()
    .scaleExtent([0.5, 8])
    .on("start", () => {
        isUserInteracting = true;
    })
    .on("zoom", (e) => {
        if (mapParams.projectionType === "geoOrthographic") {
            if (lastZoomTransform) {
                if (e.sourceEvent && (e.sourceEvent.type === "mousemove" || e.sourceEvent.type === "touchmove")) {
                    currentRotate[0] += (e.transform.x - lastZoomTransform.x) * 90 / MAP_WIDTH;
                    currentRotate[1] -= (e.transform.y - lastZoomTransform.y) * 90 / MAP_HEIGHT;
                    currentRotate[1] = Math.max(-90, Math.min(90, currentRotate[1]));
                }
            }
            lastZoomTransform = e.transform;
            mapTransform = d3.zoomIdentity.translate(mapTransform.x, mapTransform.y).scale(e.transform.k);
        } else {
            mapTransform = e.transform;
        }
    })
    .on("end", () => {
        isUserInteracting = false;
        lastZoomTransform = null;
    });

function resetMapZoom() {
    currentRotate = [0, 0];
    lastZoomTransform = null;
    if (mapCanvas) d3.select(mapCanvas).transition().duration(750).call(mapZoomLogic.transform, d3.zoomIdentity);
}

function zoomInMap() {
    if (mapCanvas) d3.select(mapCanvas).transition().duration(300).call(mapZoomLogic.scaleBy, 1.3);
}

function zoomOutMap() {
    if (mapCanvas) d3.select(mapCanvas).transition().duration(300).call(mapZoomLogic.scaleBy, 1 / 1.3);
}

let hoveredCountryFeature = null;
let getMetaFunc = null;
let getRegionColorFunc = null;
let currentRawData = null;
let nodeMapGlobal = new Map();
let flowsGlobal = null;
let configGlobal = null;

function getNodeColor(name) {
    if (!getRegionColorFunc || !getMetaFunc) return "#cccccc";
    const basicMeta = getMetaFunc(name);
    if (!basicMeta) return "#cccccc";
    let color_country = getRegionColorFunc(basicMeta.region_name);
    let hsl = d3.hsl(color_country);

    // Softer, less aggressive highlights
    hsl.s *= 0.75; // Lower saturation
    hsl.l = Math.min(0.6, hsl.l + 0.55); // Slightly brighter

    const r_palette = [hsl.brighter(0.6), hsl.darker(1.6), hsl, hsl.brighter(0.8), hsl.darker(1)];
    const id = Number(basicMeta.id);
    const region = Number(basicMeta.region);
    if (isNaN(id) || isNaN(region)) return r_palette[0];
    let palleteIndex = ((id - region) % 5 + 5) % 5;
    return r_palette[palleteIndex];
}

// Tooltip logic
function showMapTooltip(evt, feature) {
    let tooltip = d3.select('body').select('div#tooltip');
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

    // If we have meta info
    if (!getMetaFunc || !currentRawData) return;

    const name = feature.properties.name;
    const basicMeta = getMetaFunc(name);
    // basicMeta could be undefined if country not in matrix
    if (!basicMeta) {
        tooltip.style("visibility", "hidden");
        return;
    }

    const flowInfo = flowsGlobal && flowsGlobal.find(f => f.name === name) || {};
    const fullMeta = { ...basicMeta, ...flowInfo };
    const sourceDisplay = `<span style="color:${getNodeColor(name)}"> ${fullMeta.flag + " " + name}</span>`;

    const outflowDisplay = formatValue(fullMeta.outflow || 0);
    const inflowDisplay = formatValue(fullMeta.inflow || 0);

    const currentFn = configGlobal ? fileName(configGlobal).json : "";
    const labels = currentFn.includes('stock')
        ? { out: 'Total emigrants', in: 'Total immigrants' }
        : { out: 'Total Outflow', in: 'Total Inflow' };

    tooltip
        .html(`${sourceDisplay}<br>${labels.out}: <b>${outflowDisplay}</b><br>${labels.in}: <b>${inflowDisplay}</b>`)
        .style('background-color', '#ffffff')
        .style("top", (evt.pageY + 20) + "px")
        .style("left", (evt.pageX + 30) + "px")
        .style("visibility", "visible");
}

function handleMapMouseMove(evt) {
    if (!worldData) return;

    const rect = mapCanvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas resolution
    const scaleX = mapCanvas.width / rect.width;
    const scaleY = mapCanvas.height / rect.height;

    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;

    // Find if mouse is within any country path
    // The most reliable way for d3 canvas maps is projection.invert
    // but d3.geoContains is expensive to run in mousemove for all geometries.
    // Instead we can use canvas isPointInPath if we recreate the path or just use projection.invert
    const lonlat = projection.invert([x, y]);
    let found = null;
    if (lonlat) {
        found = worldData.features.find(f => d3.geoContains(f, lonlat));
    }

    if (found !== hoveredCountryFeature) {
        hoveredCountryFeature = found;
        if (found) {
            mapCanvas.style.cursor = 'pointer';
            showMapTooltip(evt, found);
        } else {
            mapCanvas.style.cursor = 'default';
            d3.select('body').select('div#tooltip').style("visibility", "hidden");
        }
    } else if (found) {
        // move tooltip
        d3.select('body').select('div#tooltip')
            .style("top", (evt.pageY + 20) + "px")
            .style("left", (evt.pageX + 30) + "px");
    }
}

function handleMapMouseOut(evt) {
    hoveredCountryFeature = null;
    d3.select('body').select('div#tooltip').style("visibility", "hidden");
}

// Particle class for animated dots
class Particle {
    constructor(speed, size) {
        this.progress = Math.random();
        this.speed = speed;
        this.size = size;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.progress = 0; // Loop back to start
        }
    }

    draw(ctx, path) {
        const t = this.progress;
        // Cubic Bezier curve interpolation
        const x = Math.pow(1 - t, 3) * path.start.x +
            3 * Math.pow(1 - t, 2) * t * path.control1.x +
            3 * (1 - t) * Math.pow(t, 2) * path.control2.x +
            Math.pow(t, 3) * path.end.x;

        const y = Math.pow(1 - t, 3) * path.start.y +
            3 * Math.pow(1 - t, 2) * t * path.control1.y +
            3 * (1 - t) * Math.pow(t, 2) * path.control2.y +
            Math.pow(t, 3) * path.end.y;

        ctx.fillStyle = path.color;
        ctx.globalAlpha = 0.6 * (path.alpha !== undefined ? path.alpha : 1);
        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function getHorizonOcclusionAlpha(lonlat) {
    if (mapParams.projectionType !== "geoOrthographic") return 1;

    // In orthographic, center of projection is always facing camera.
    // The currentRotate gives us the center coordinates: [-lon, -lat]
    const center = [-currentRotate[0], -currentRotate[1]];

    const dist = d3.geoDistance(center, lonlat);

    // Horizon is at PI/2 (approx 1.5708 radians)
    // Fade completely to 0 just before the horizon to hide sharp cuts
    const fadeStart = 1.25;
    const horizon = Math.PI / 2 - 0.05;

    if (dist > horizon) return 0;
    if (dist < fadeStart) return 1;

    return 1 - (dist - fadeStart) / (horizon - fadeStart);
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

    mapCanvas.addEventListener("mousemove", handleMapMouseMove);
    mapCanvas.addEventListener("mouseout", handleMapMouseOut);

    d3.select(mapCanvas).call(mapZoomLogic);

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
    const curvature = mapParams.curvature;
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
    let connectedToHover = new Set();
    if (hoveredCountryFeature && hoveredCountryFeature.properties.name) {
        const hoverName = hoveredCountryFeature.properties.name;
        connectedToHover.add(hoverName);
        flowPaths.forEach(fp => {
            if (fp.sourceName === hoverName) connectedToHover.add(fp.targetName);
            if (fp.targetName === hoverName) connectedToHover.add(fp.sourceName);
        });
    }

    world.features.forEach(feature => {
        ctx.beginPath();
        path.context(ctx)(feature);

        let cName = feature.properties.name;

        if (hoveredCountryFeature) {
            if (cName === hoveredCountryFeature.properties.name) {
                // Hovered exactly
                ctx.fillStyle = getNodeColor(cName);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
            } else if (connectedToHover.has(cName)) {
                // Connected
                ctx.fillStyle = getNodeColor(cName);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 0.5;
            } else {
                // Dimmed
                ctx.fillStyle = "rgba(89, 140, 174, 0.1)";
                ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
                ctx.lineWidth = 0.2;
            }
        } else {
            // Default (no hover)
            ctx.fillStyle = "#598cae35";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 1.3;
        }

        ctx.fill();
        ctx.stroke();
    });
}

function drawLabels(ctx, world) {
    let drawnBoxes = [];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let connectedToHover = new Set();
    let hoverName = null;
    if (hoveredCountryFeature && hoveredCountryFeature.properties.name) {
        hoverName = hoveredCountryFeature.properties.name;
        globalFlowData.forEach(flow => {
            if (flow.sourceName === hoverName) connectedToHover.add(flow.targetName);
            if (flow.targetName === hoverName) connectedToHover.add(flow.sourceName);
        });
    }

    const checkOverlap = (box) => {
        for (let i = 0; i < drawnBoxes.length; i++) {
            let b = drawnBoxes[i];
            if (box.x < b.x + b.w && box.x + box.w > b.x &&
                box.y < b.y + b.h && box.y + box.h > b.y) {
                return true;
            }
        }
        return false;
    };

    const drawFeatureLabel = (feature, isHighlight) => {
        const name = feature.properties.name;
        if (!name) return;

        let centroid, area;
        try {
            centroid = path.centroid(feature);
            area = path.area(feature);
        } catch (e) { return; }

        if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

        // Base area threshold for non-highlighted (prevents clutter)
        // Adjust threshold based on subjective visibility
        if (!isHighlight && area < 800) return;

        // Orthographic backface cullingf
        if (mapParams.projectionType === "geoOrthographic") {
            let geoCen = null;
            const cNode = nodeMapGlobal.get(name);
            if (cNode && cNode.lonlat) {
                geoCen = cNode.lonlat;
            } else {
                geoCen = d3.geoCentroid(feature);
            }
            const center = [-currentRotate[0], -currentRotate[1]];
            const dist = d3.geoDistance(center, geoCen);
            if (dist > Math.PI / 2) return;
        }

        const fontSize = isHighlight ? 12 : 10;
        ctx.font = `${isHighlight ? "semibold" : "normal"} ${fontSize}px 'Jost', sans-serif`;
        const textWidth = ctx.measureText(name).width;

        // Padding for collision box
        const padding = 2;
        const box = {
            x: centroid[0] - textWidth / 2 - padding,
            y: centroid[1] - fontSize / 2 - padding,
            w: textWidth + padding * 2,
            h: fontSize + padding * 2
        };

        // Exclude if overlaps and it's not a highlight
        if (!isHighlight && checkOverlap(box)) return;

        // Store box to prevent future defaults from overlapping it
        drawnBoxes.push(box);

        if (isHighlight) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.strokeText(name, centroid[0], centroid[1] + 1);

            ctx.fillStyle = name === hoverName ? "#333333" : getNodeColor(name);
            ctx.fillText(name, centroid[0], centroid[1] + 1);
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillText(name, centroid[0], centroid[1] + 1);
        }
    };

    // Draw highlights first to reserve their space
    world.features.forEach(feature => {
        if (feature.properties.name === hoverName || connectedToHover.has(feature.properties.name)) {
            drawFeatureLabel(feature, true);
        }
    });

    // Draw defaults
    world.features.forEach(feature => {
        if (feature.properties.name !== hoverName && !connectedToHover.has(feature.properties.name)) {
            drawFeatureLabel(feature, false);
        }
    });
}

function drawFlowPaths(ctx) {
    ctx.lineWidth = 1;

    flowPaths.forEach(pathData => {
        let baseAlpha = 0.1;
        if (hoveredCountryFeature) {
            const hName = hoveredCountryFeature.properties.name;
            if (pathData.sourceName !== hName && pathData.targetName !== hName) {
                return; // Skip drawing paths not connected to hovered country
            }
            baseAlpha = 0.5; // Make connected paths more visible
        }

        ctx.globalAlpha = baseAlpha * (pathData.alpha !== undefined ? pathData.alpha : 1);
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

    // Clearing background map
    mapContext.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    if (mapParams.projectionType === "geoOrthographic") {
        if (!isUserInteracting) {
            currentRotate[0] += 0.15; // Auto rotate
        }
        projection.scale(baseScale * mapTransform.k);
        projection.translate(baseTranslate);

        projection.rotate([currentRotate[0], currentRotate[1], 0]);
        if (projection.clipAngle) projection.clipAngle(90);
    } else {
        projection.scale(baseScale * mapTransform.k);
        projection.translate([
            mapTransform.x + mapTransform.k * baseTranslate[0],
            mapTransform.y + mapTransform.k * baseTranslate[1]
        ]);
        projection.rotate([0, 0, 0]);
        if (projection.clipAngle) projection.clipAngle(null);
    }

    // Draw base map
    if (worldData) {
        if (mapParams.projectionType === "geoOrthographic") {
            mapContext.beginPath();
            path.context(mapContext)({ type: "Sphere" });
            mapContext.fillStyle = "#f4f4f4"; // Matches article background
            mapContext.shadowColor = "rgba(0, 0, 0, 0.10)";
            mapContext.shadowBlur = 30;
            mapContext.shadowOffsetX = 0;
            mapContext.shadowOffsetY = 8;
            mapContext.fill();

            // Reset shadow to avoid affecting lines and dots
            mapContext.shadowColor = "transparent";
            mapContext.shadowBlur = 0;
            mapContext.shadowOffsetX = 0;
            mapContext.shadowOffsetY = 0;
        }
        drawCountries(mapContext, worldData);
    }

    // Recompute path shapes this frame
    flowPaths = [];
    globalFlowData.forEach(flow => {
        let pathAlpha = 1;
        if (mapParams.projectionType === "geoOrthographic") {
            let alphaSrc = getHorizonOcclusionAlpha(flow.sourceLonLat);
            let alphaDst = getHorizonOcclusionAlpha(flow.targetLonLat);
            pathAlpha = Math.min(alphaSrc, alphaDst);
            if (pathAlpha <= 0) return; // Completely occluded
        }

        let pSrc = projection(flow.sourceLonLat);
        let pDst = projection(flow.targetLonLat);
        // pSrc/pDst are null if they are on back-face of orthographic
        if (!pSrc || !pDst) return;

        // Exclude lines trying to wrap around the whole globe (optional heuristic)
        const dx = pDst[0] - pSrc[0];
        const dy = pDst[1] - pSrc[1];
        if (mapParams.projectionType !== "geoOrthographic" && Math.sqrt(dx * dx + dy * dy) > MAP_WIDTH * 0.8) return;

        const pathData = createCurvedPath(
            { x: pSrc[0], y: pSrc[1] },
            { x: pDst[0], y: pDst[1] },
            flow.color
        );
        pathData.sourceName = flow.sourceName;
        pathData.targetName = flow.targetName;
        pathData.particles = flow.particles;
        pathData.alpha = pathAlpha;
        flowPaths.push(pathData);

    });

    // Draw flow paths based on visible ones
    drawFlowPaths(mapContext);
    // Update and draw path-attached particles
    flowPaths.forEach(pathData => {
        if (hoveredCountryFeature) {
            const hName = hoveredCountryFeature.properties.name;
            if (pathData.sourceName !== hName && pathData.targetName !== hName) {
                // Keep moving them so they don't pile up, but don't draw
                pathData.particles.forEach(p => p.update());
                return;
            }
        }
        pathData.particles.forEach(p => {
            p.update();
            p.draw(mapContext, pathData);
        });
    });

    // Draw Labels on top
    if (worldData) {
        drawLabels(mapContext, worldData);
    }

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

    calculateDefaultProjection();

    // Stop any existing animation
    stopAnimation();

    // Get helper functions
    getMetaFunc = createGetMeta({ raw_data: rawData.matrix, metadata: rawData.metadata.flags });
    getRegionColorFunc = createGetRegionColor(rawData.matrix);
    const isRegion = createIsRegion(rawData.matrix);

    currentRawData = rawData;
    configGlobal = config;
    if (prepared && prepared.common && prepared.common.flows) {
        flowsGlobal = prepared.common.flows;
    }

    // Extract actual flows between countries directly from the raw data
    const matrix = rawData.matrix.matrix;
    const names = rawData.matrix.names;

    // Normalize topology names to matrix names
    const topoToMatrixNames = {
        "United States of America": "United States",
        "Dem. Rep. Congo": "DR Congo",
        "Eq. Guinea": "Equatorial Guinea",
        "eSwatini": "Eswatini",
        "S. Sudan": "South Sudan",
        "Macedonia": "North Macedonia",
        "Dominican Rep.": "Dominican Republic",
        "Central African Rep.": "Central African Republic",
        "Bosnia and Herz.": "Bosnia & Herzegovina",
        "Falkland Is.": "Falkland Islands",
        "W. Sahara": "Western Sahara",
        "Côte d'Ivoire": "Cote d'Ivoire",
        "Solomon Is.": "Solomon Islands",
        "Trinidad and Tobago": "Trinidad & Tobago"
    };

    world.features.forEach(f => {
        if (!f.properties || !f.properties.name) return;
        const nameInTopo = f.properties.name;

        let matrixName = topoToMatrixNames[nameInTopo];
        if (!matrixName) {
            const lowerName = nameInTopo.toLowerCase();
            matrixName = names.find(n => n.toLowerCase() === lowerName);
        }
        if (!matrixName) {
            const lowerName = nameInTopo.toLowerCase();
            matrixName = names.find(n => {
                if (isRegion(n)) return false;
                const lowerN = n.toLowerCase();
                // Avoid incorrect cross-matching of similarly named countries
                if (nameInTopo === "Congo" && n === "DR Congo") return false;
                if (nameInTopo === "Guinea" && n === "Equatorial Guinea") return false;
                if (nameInTopo === "Sudan" && n === "South Sudan") return false;
                return lowerName.includes(lowerN) || lowerN.includes(lowerName);
            });
        }
        if (matrixName) {
            f.properties.name = matrixName;
        }
    });

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
    globalFlowData = [];

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

        const centroid = d3.geoCentroid(feature);
        const meta = getMetaFunc(name);

        countryNodes.push({
            name: name,
            region_name: meta.region_name,
            lonlat: centroid
        });
    }

    nodeMapGlobal.clear();
    countryNodes.forEach(d => nodeMapGlobal.set(d.name, d));
    const nodeMap = nodeMapGlobal;

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

            // Build flow node logic
            const numParticles = Math.ceil((flowValue / maxSingleFlow) * mapParams.density) + 1;
            const pArr = [];
            for (let p = 0; p < numParticles; p++) {
                pArr.push(new Particle(mapParams.speedBase + (flowValue / maxSingleFlow) * (mapParams.speedBase * 2), mapParams.size));
            }

            globalFlowData.push({
                sourceName: sourceName,
                targetName: targetName,
                sourceLonLat: sourceNode.lonlat,
                targetLonLat: targetNode.lonlat,
                color: getRegionColorFunc(sourceNode.region_name),
                particles: pArr
            });
        }
    }

    // console.log(`Created ${flowPaths.length} flow paths with ${particles.length} particles`);

    // Start animation
    animate();
}

function updateMap(prepared, rawData, config) {
    // Only refresh projection if it changed in debug UI
    if (d3[mapParams.projectionType]) {
        calculateDefaultProjection();
        projection = d3[mapParams.projectionType]().scale(baseScale).translate(baseTranslate);
        path.projection(projection);
    }

    drawMap(prepared, rawData, config);
}

// Debug UI setup
function initMapDebugUI() {
    const ids = ['density', 'size', 'curve', 'speed'];
    ids.forEach(id => {
        const el = document.getElementById(`debug-${id}`);
        if (el) {
            el.addEventListener('input', (e) => {
                document.getElementById(`debug-${id}-val`).innerText = e.target.value;
                if (id === 'density') mapParams.density = parseFloat(e.target.value);
                if (id === 'size') mapParams.size = parseFloat(e.target.value);
                if (id === 'curve') mapParams.curvature = parseFloat(e.target.value);
                if (id === 'speed') mapParams.speedBase = parseFloat(e.target.value);

                // Redraw map with new params if possible
                if (currentRawData && configGlobal && worldData) {
                    updateMap(null, currentRawData, configGlobal);
                }
            });
        }
    });

    const proj = document.getElementById('debug-projection');
    if (proj) {
        proj.addEventListener('change', (e) => {
            mapParams.projectionType = e.target.value;
            // Also reset zoom on projection change
            mapTransform = d3.zoomIdentity;
            currentRotate = [0, 0];
            lastZoomTransform = null;
            if (mapCanvas) d3.select(mapCanvas).call(mapZoomLogic.transform, d3.zoomIdentity);

            if (currentRawData && configGlobal && worldData) {
                updateMap(null, currentRawData, configGlobal);
            }
        });
    }
}

// Call initMapDebugUI when DOM is ready
document.addEventListener('DOMContentLoaded', initMapDebugUI);

