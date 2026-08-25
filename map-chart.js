const MAP_WIDTH = 960;
const MAP_HEIGHT = 600;

let mapCanvas = null;
let mapContext = null;
let animationFrameId = null;
let particles = [];
let flowPaths = [];
let worldData = null;
let labelBoundingBoxes = [];
let hoveredFlowData = [];
let lastHoveredName = null;
let globalMaxSingleFlow = 1;

// Pre-computed per-feature metrics (populated once in loadWorldData)
// Eliminates expensive path.centroid/path.area calls from the per-frame render loop
let featureGeoAreaCache = new Map();     // name -> geographic area (steradians)
let featureGeoCentroidCache = new Map(); // name -> [lon, lat]

// Globe auto-spin speed — lerped each frame for a soft hover deceleration
const GLOBE_BASE_SPIN = 0.15;   // degrees/frame at full speed
let currentSpinSpeed = GLOBE_BASE_SPIN;

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

let baseScale = 280;
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
let lastProjectionType = null; // Track projection changes for updateMap
let mapZoomLogic = d3.zoom()
    .scaleExtent([0.5, 5])
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
            // BUG FIX: Use e.transform.k for scale. For orthographic we track rotation
            // separately via currentRotate, so x/y of mapTransform are unused for translation.
            // Keep them at 0 to avoid stale accumulation.
            mapTransform = d3.zoomIdentity.scale(e.transform.k);
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
    mapTransform = d3.zoomIdentity; // Reset immediately so next frame uses correct scale
    if (mapCanvas) d3.select(mapCanvas).transition().duration(750).call(mapZoomLogic.transform, d3.zoomIdentity);
}

function zoomInMap() {
    if (mapCanvas) d3.select(mapCanvas).transition().duration(300).call(mapZoomLogic.scaleBy, 1.2);
}

function zoomOutMap() {
    if (mapCanvas) d3.select(mapCanvas).transition().duration(300).call(mapZoomLogic.scaleBy, 1 / 1.2);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholeWord(str, word) {
    const escaped = escapeRegExp(word);
    const regex = new RegExp('(?:^|[^a-zA-Z0-9])' + escaped + '(?:$|[^a-zA-Z0-9])', 'i');
    return regex.test(str);
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
        .style("visibility", "visible");

    positionTooltip(evt, tooltip.node());
}

function handleMapMouseMove(evt) {
    if (!worldData) return;

    const rect = mapCanvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas resolution
    const scaleX = mapCanvas.width / rect.width;
    const scaleY = mapCanvas.height / rect.height;

    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;

    // 1. Check if mouse is over any active country label bounding box first
    let found = null;
    if (labelBoundingBoxes) {
        const matchedLabel = labelBoundingBoxes.find(lb => {
            const b = lb.box;
            return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
        });
        if (matchedLabel) {
            found = matchedLabel.feature;
        }
    }

    // 2. Fall back to checking polygon containment
    if (!found) {
        const lonlat = projection.invert([x, y]);
        if (lonlat) {
            found = worldData.features.find(f => d3.geoContains(f, lonlat));
        }
    }

    if (found !== hoveredCountryFeature) {
        hoveredCountryFeature = found;
        if (found) {
            mapCanvas.style.cursor = 'pointer';
            showMapTooltip(evt, found);
            updateHoveredFlows(found.properties.name);
        } else {
            mapCanvas.style.cursor = 'default';
            d3.select('body').select('div#tooltip').style("visibility", "hidden");
            updateHoveredFlows(null);
        }
    } else if (found) {
        // move tooltip
        positionTooltip(evt, d3.select('body').select('div#tooltip').node());
    }
}

function handleMapMouseOut(evt) {
    hoveredCountryFeature = null;
    d3.select('body').select('div#tooltip').style("visibility", "hidden");
    updateHoveredFlows(null);
}

function updateHoveredFlows(countryName) {
    if (lastHoveredName === countryName) return;
    lastHoveredName = countryName;
    hoveredFlowData = [];

    if (!countryName || !currentRawData) return;

    const matrix = currentRawData.matrix.matrix;
    const names = currentRawData.matrix.names;
    const isRegion = createIsRegion(currentRawData.matrix);

    const countryIdx = names.indexOf(countryName);
    if (countryIdx === -1 || isRegion(countryName)) return;

    const sourceNode = nodeMapGlobal.get(countryName);
    if (!sourceNode) return;

    // We can show all flows above 0 when hovered since it's restricted to a single country.
    const hoverMinThreshold = 900;

    for (let j = 0; j < names.length; j++) {
        if (countryIdx === j || isRegion(names[j])) continue;
        const otherNode = nodeMapGlobal.get(names[j]);
        if (!otherNode) continue;

        // 1. Outflow from hovered country to other country
        const outflowVal = matrix[countryIdx][j];
        if (outflowVal > hoverMinThreshold) {
            const numParticles = Math.ceil((outflowVal / globalMaxSingleFlow) * mapParams.density) + 1;
            const pArr = [];
            for (let p = 0; p < numParticles; p++) {
                pArr.push(new Particle(mapParams.speedBase + (outflowVal / globalMaxSingleFlow) * (mapParams.speedBase * 2), mapParams.size));
            }
            hoveredFlowData.push({
                sourceName: countryName,
                targetName: names[j],
                sourceLonLat: sourceNode.lonlat,
                targetLonLat: otherNode.lonlat,
                color: getRegionColorFunc(sourceNode.region_name),
                particles: pArr,
                value: outflowVal
            });
        }

        // 2. Inflow to hovered country from other country
        const inflowVal = matrix[j][countryIdx];
        if (inflowVal > hoverMinThreshold) {
            const numParticles = Math.ceil((inflowVal / globalMaxSingleFlow) * mapParams.density) + 1;
            const pArr = [];
            for (let p = 0; p < numParticles; p++) {
                pArr.push(new Particle(mapParams.speedBase + (inflowVal / globalMaxSingleFlow) * (mapParams.speedBase * 2), mapParams.size));
            }
            hoveredFlowData.push({
                sourceName: names[j],
                targetName: countryName,
                sourceLonLat: otherNode.lonlat,
                targetLonLat: sourceNode.lonlat,
                color: getRegionColorFunc(otherNode.region_name),
                particles: pArr,
                value: inflowVal
            });
        }
    }
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

let fallbackCentroids = null;

function isRingValid(ring) {
    if (!ring || ring.length < 4) return false;
    // Check for at least 3 unique coordinates to ensure it's not a line/point
    const uniquePoints = new Set(ring.map(p => `${p[0]},${p[1]}`));
    return uniquePoints.size >= 3;
}

function cleanFeatureGeometry(feature) {
    if (!feature || !feature.geometry) return feature;
    const geometry = feature.geometry;

    if (geometry.type === "Polygon") {
        const cleanedCoordinates = geometry.coordinates.filter(isRingValid);
        if (cleanedCoordinates.length === 0) {
            return { ...feature, geometry: null };
        }
        return {
            ...feature,
            geometry: {
                type: "Polygon",
                coordinates: cleanedCoordinates
            }
        };
    }

    if (geometry.type === "MultiPolygon") {
        const cleanedCoordinates = geometry.coordinates
            .map(poly => poly.filter(isRingValid))
            .filter(poly => poly.length > 0);
        if (cleanedCoordinates.length === 0) {
            return { ...feature, geometry: null };
        }
        return {
            ...feature,
            geometry: {
                type: "MultiPolygon",
                coordinates: cleanedCoordinates
            }
        };
    }

    return feature;
}

async function loadWorldData() {
    if (worldData) return worldData;
    try {
        console.log("Loading world map data and fallback centroids...");
        const [topology, fallbacks] = await Promise.all([
            d3.json("json/world-110m.json").catch(() => d3.json("json/world-50m-simplified-10.json")),
            d3.json("json/fallback_centroids.json").catch(() => null)
        ]);
        fallbackCentroids = fallbacks;
        console.log("Topology loaded:", topology);
        console.log("Fallback centroids loaded:", fallbackCentroids);
        if (!topojson) {
            console.error("TopoJSON library not found!");
            return null;
        }
        worldData = topojson.feature(topology, topology.objects.countries);
        
        // Clean all feature geometries to remove degenerate (zero-area) polygons
        // that cause D3 projection/clipping glitches during globe rotation
        if (worldData && worldData.features) {
            worldData.features = worldData.features.map(cleanFeatureGeometry);
        }
        
        console.log("World features processed:", worldData);

        // Pre-compute geographic centroids and areas once so the animation loop
        // doesn't have to call the expensive path.centroid / path.area every frame.
        precomputeFeatureMetrics(worldData);

        return worldData;
    } catch (error) {
        console.error("Failed to load world map data", error);
        return null;
    }
}

/**
 * Computes geographic centroid and area for every feature once at load time.
 * Results are cached in featureGeoCentroidCache / featureGeoAreaCache.
 * This makes drawLabels O(1) per feature instead of O(vertices).
 */
function precomputeFeatureMetrics(world) {
    if (!world || !world.features) return;
    world.features.forEach(feature => {
        const name = feature.properties && feature.properties.name;
        if (!name || !feature.geometry) return;
        try {
            featureGeoAreaCache.set(name, d3.geoArea(feature));
            featureGeoCentroidCache.set(name, d3.geoCentroid(feature));
        } catch (e) { /* degenerate geometry – skip */ }
    });
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

    // For flat projections at high zoom, many countries are off-screen.
    // Use a margin around the canvas so large edge-touching countries are still drawn.
    const isFlat = mapParams.projectionType !== "geoOrthographic";
    const cullMargin = 300; // px – big enough to catch countries whose centroid is near-off but polygon edge is inside

    world.features.forEach(feature => {
        // Viewport culling for flat projections: skip features whose geographic centroid
        // projects well outside the canvas. This avoids generating enormous canvas paths
        // for off-screen countries when zoomed in.
        if (isFlat) {
            const fname = feature.properties && feature.properties.name;
            const geoCen = fname ? (featureGeoCentroidCache.get(fname) || null) : null;
            if (geoCen) {
                const p = projection(geoCen);
                if (p && (
                    p[0] < -cullMargin || p[0] > MAP_WIDTH + cullMargin ||
                    p[1] < -cullMargin || p[1] > MAP_HEIGHT + cullMargin
                )) return; // completely off-screen – skip
            }
        }

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

function getMainGeometry(feature) {
    if (!feature || !feature.geometry) return null;
    if (feature.geometry.type === "Polygon") {
        return feature.geometry;
    }
    if (feature.geometry.type === "MultiPolygon") {
        let maxArea = -1;
        let largestPolygonCoords = null;
        feature.geometry.coordinates.forEach(coords => {
            const polyGeom = { type: "Polygon", coordinates: coords };
            const area = d3.geoArea(polyGeom);
            if (area > maxArea) {
                maxArea = area;
                largestPolygonCoords = coords;
            }
        });
        return largestPolygonCoords ? { type: "Polygon", coordinates: largestPolygonCoords } : feature.geometry;
    }
    return feature.geometry;
}

function drawLabels(ctx, world) {
    let drawnBoxes = [];
    labelBoundingBoxes = []; // Clear the global list

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

        // ── FAST centroid: O(1) per feature per frame ────────────────────────────
        // Priority: (1) nodeMapGlobal lonlat  (2) pre-computed geo centroid  (3) path.centroid fallback
        // This replaces the expensive per-frame path.centroid(feature) call.
        let centroid;
        const cNode = nodeMapGlobal.get(name);
        const fastLonlat = (cNode && cNode.lonlat)
            ? cNode.lonlat
            : featureGeoCentroidCache.get(name);

        if (fastLonlat) {
            centroid = projection(fastLonlat);
        } else if (feature.geometry === null) {
            return; // nothing to draw
        } else {
            // Rare fallback for uncached features
            const mainGeom = getMainGeometry(feature);
            const tempFeature = mainGeom ? { ...feature, geometry: mainGeom } : feature;
            try { centroid = path.centroid(tempFeature); } catch (e) { return; }
        }

        if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

        // ── FAST area: use geographic area × scale² instead of path.area() ──────
        // path.area() re-projects every vertex every frame – very expensive.
        // Geographic area (steradians) × scale² gives a good approximation in px².
        const geoArea = featureGeoAreaCache.get(name) || 0;
        const scl = baseScale * mapTransform.k;
        // Empirical factor: at scale=280 a ~1M km² country ≈ 800 px² (our threshold)
        // 1M km² ≈ 0.002 steradians, so 800 / (280² × 0.002) ≈ 5.1
        const area = geoArea * scl * scl * 5;

        // Base area threshold for non-highlighted (prevents clutter)
        // Bypass threshold for small countries that are active in the matrix data
        const isSmallActive = nodeMapGlobal.has(name) && area < 800;
        if (!isHighlight && area < 800 && !isSmallActive) return;

        // Orthographic backface culling
        if (mapParams.projectionType === "geoOrthographic") {
            const geoCen = fastLonlat || (featureGeoCentroidCache.get(name));
            if (geoCen) {
                const center = [-currentRotate[0], -currentRotate[1]];
                const dist = d3.geoDistance(center, geoCen);
                if (dist > Math.PI / 2) return;
            }
        }

        // Viewport culling: skip labels whose centroid is clearly off-screen
        if (centroid[0] < -50 || centroid[0] > MAP_WIDTH + 50 ||
            centroid[1] < -20 || centroid[1] > MAP_HEIGHT + 20) return;

        const fontSize = isHighlight ? 12 : 10;
        ctx.font = `${isHighlight ? "semibold" : "normal"} ${fontSize}px 'Jost', sans-serif`;
        const textWidth = ctx.measureText(name).width;

        const yOffset = 1;

        // Padding for collision box
        const padding = 2;
        const box = {
            x: centroid[0] - textWidth / 2 - padding,
            y: centroid[1] + yOffset - fontSize / 2 - padding,
            w: textWidth + padding * 2,
            h: fontSize + padding * 2
        };

        // Exclude if overlaps and it's not a highlight
        if (!isHighlight && checkOverlap(box)) return;

        // Store box to prevent future defaults from overlapping it
        drawnBoxes.push(box);

        // Save to global label bounding boxes for mouse hovering
        labelBoundingBoxes.push({
            box: box,
            feature: feature
        });

        if (isHighlight) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.strokeText(name, centroid[0], centroid[1] + yOffset);

            ctx.fillStyle = name === hoverName ? "#333333" : getNodeColor(name);
            ctx.fillText(name, centroid[0], centroid[1] + yOffset);
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.35)"; // Slightly darker than 0.2 for readability
            ctx.fillText(name, centroid[0], centroid[1] + yOffset);
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
    const mapEl = document.getElementById("map");
    if (mapEl && mapEl.style.display === "none") return;

    // Schedule NEXT frame first so exceptions this frame don't kill the loop
    animationFrameId = requestAnimationFrame(animate);

    try {
        // Clearing background map
        mapContext.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // Guard: clamp scale to prevent degenerate values causing a freeze
        const safeScale = Math.max(0.01, baseScale * mapTransform.k);

        if (mapParams.projectionType === "geoOrthographic") {
            // Target spin speed: 0 when a country is hovered, full speed otherwise.
            // Lerp 8% per frame → ~0.3 s soft transition in both directions.
            const targetSpin = (!isUserInteracting && !hoveredCountryFeature) ? GLOBE_BASE_SPIN : 0;
            currentSpinSpeed += (targetSpin - currentSpinSpeed) * 0.08;
            currentRotate[0] += currentSpinSpeed;
            projection.scale(safeScale);
            projection.translate(baseTranslate);
            projection.rotate([currentRotate[0], currentRotate[1], 0]);
            if (projection.clipAngle) projection.clipAngle(90);
            if (projection.clipExtent) projection.clipExtent(null); // clipAngle handles it
        } else {
            projection.scale(safeScale);
            projection.translate([
                mapTransform.x + mapTransform.k * baseTranslate[0],
                mapTransform.y + mapTransform.k * baseTranslate[1]
            ]);
            projection.rotate([0, 0, 0]);
            if (projection.clipAngle) projection.clipAngle(null);
            // Tell D3 to clip geometry to the canvas bounds – avoids enormous canvas path
            // commands for off-screen features when zoomed in.
            if (projection.clipExtent) projection.clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]);
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
        const activeFlowData = hoveredCountryFeature ? hoveredFlowData : globalFlowData;
        activeFlowData.forEach(flow => {
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

    } catch (err) {
        console.warn("[map] animate() error – frame skipped:", err);
    }
    // NOTE: next rAF is already scheduled at the top of animate()
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

    // Only recalculate the default projection on first load.
    // Subsequent calls (e.g. year/method changes) should NOT discard user's zoom.
    if (lastProjectionType === null) {
        calculateDefaultProjection();
        lastProjectionType = mapParams.projectionType;
    }

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
                return containsWholeWord(lowerName, lowerN) || containsWholeWord(lowerN, lowerName);
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
    globalMaxSingleFlow = maxSingleFlow;

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
                return containsWholeWord(topoName, dataName) || containsWholeWord(dataName, topoName);
            });
        }
        if (!feature) continue;

        let centroid;
        if (feature.geometry === null && fallbackCentroids && fallbackCentroids[name]) {
            centroid = fallbackCentroids[name];
        } else {
            const mainGeom = getMainGeometry(feature);
            const tempFeature = mainGeom ? { ...feature, geometry: mainGeom } : feature;
            centroid = d3.geoCentroid(tempFeature);
        }

        const meta = getMetaFunc(name);

        countryNodes.push({
            name: name,
            region_name: meta ? meta.region_name : "unknown",
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

    // Reset hovered state and re-calculate active flows if a country is currently hovered
    lastHoveredName = null;
    if (hoveredCountryFeature && hoveredCountryFeature.properties.name) {
        updateHoveredFlows(hoveredCountryFeature.properties.name);
    }

    // Start animation
    animate();
}

function updateMap(prepared, rawData, config) {
    // Only recalculate the base projection if the projection TYPE changed,
    // not on every data update — otherwise we'd discard the user's zoom level.
    const projectionChanged = lastProjectionType !== mapParams.projectionType;
    if (projectionChanged && d3[mapParams.projectionType]) {
        // Reset zoom state when switching projection types
        mapTransform = d3.zoomIdentity;
        currentRotate = [0, 0];
        lastZoomTransform = null;
        if (mapCanvas) d3.select(mapCanvas).call(mapZoomLogic.transform, d3.zoomIdentity);
        calculateDefaultProjection();
        projection = d3[mapParams.projectionType]().scale(baseScale).translate(baseTranslate);
        path.projection(projection);
        lastProjectionType = mapParams.projectionType;
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

