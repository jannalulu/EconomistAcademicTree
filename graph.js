const d3 = window.d3;

// Global color definitions
const defaultNodeColor = "#6495ED";  // Cornflower Blue
const hoverColor = "#FFA07A";        // Light Salmon
const highlightColor = "#9370DB";    // Medium Purple
const unselectedColor = "#D3D3D3";   // Light Gray
const linkColor = "#A9A9A9";         // Dark Gray

let links = null;
let nodes = null;
let simulation = null;
let selectedNode = null;
let hoveredNode = null;
let canvas = null;
let ctx = null;
let transform = d3.zoomIdentity;

let worker = new Worker('dataworker.js');

worker.onmessage = function(event) {
    if (event.data.type === 'graphData') {
        createD3Graph(event.data.graph, window.innerWidth, window.innerHeight);
        hideLoadingOverlay();
    } else if (event.data.type === 'error') {
        console.error(event.data.message);
        hideLoadingOverlay();
    }
};

function loadGraphData(url) {
    showLoadingOverlay();
    worker.postMessage({ type: 'loadData', url: url });
}

function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function createD3Graph(graph, parentWidth, parentHeight) {
    canvas = d3.select('#graph')
        .attr('width', parentWidth)
        .attr('height', parentHeight)
        .node();

    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }

    ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error("Unable to get 2D context from canvas");
        return;
    }

    // Calculate node sizes based on connections
    const nodeSize = d3.scaleLinear()
        .domain([0, d3.max(graph.nodes, d => d.connections)])
        .range([5, 20]);

    // Create nodes and links
    nodes = graph.nodes.map(d => ({...d, r: nodeSize(d.connections), highlighted: false, opacity: 1}));
    links = graph.links.map(d => ({...d, highlighted: false, opacity: 1}));

    // Create simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(550))
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
        .force("collision", d3.forceCollide().radius(d => d.r + 50))
        //.alphaDecay(0.05)
        //.alphaMin(0.001)
        .velocityDecay(0.25)
        .on("tick", ticked);

    simulation.tick(150);

    // Set up zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", zoomed);

    d3.select(canvas)
        .call(zoom)
        .on("dblclick.zoom", null);

    // Add search functionality
    d3.select("#search").on("input", function() {
        const searchTerm = this.value.toLowerCase();
        currentMatchIndex = 0; // Reset the index when searching
        if (searchTerm) {
            highlightNodes(searchTerm);
        } else {
            resetGraph();
            hideSearchResults();
        }
    });

    // Add click event to reset graph when clicking on empty space
    d3.select(canvas).on("click", function(event) {
        const [x, y] = d3.pointer(event);
        const node = findNodeAtPosition(x, y);
        if (!node) {
            d3.select("#search").property("value", "");
            resetGraph();
            selectedNode = null;
        } else {
            setSelectedNode(node);
        }
        ticked();
    });

    // Add mousemove event for hover effect
    d3.select(canvas).on("mousemove", function(event) {
        const [x, y] = d3.pointer(event);
        const node = findNodeAtPosition(x, y);
        this.style.cursor = node ? "pointer" : "default";
        hoveredNode = node;
        ticked();
    });
}

let currentMatchIndex = 0;
let matchedNodes = [];
let lastSearchTerm = '';

function cycleMatches() {
    if (matchedNodes && matchedNodes.length > 1) {
        currentMatchIndex = (currentMatchIndex + 1) % matchedNodes.length;
        highlightNodes(lastSearchTerm);
    }
}

function highlightNodes(searchTerm) {
    lastSearchTerm = searchTerm;
    matchedNodes = nodes.filter(n => n.name.toLowerCase().includes(searchTerm));

    if (matchedNodes.length === 0) {
        resetGraph();
        return;
    }

    const connectedNodes = new Set(matchedNodes.map(n => n.id));
    const connectedLinks = new Set();

    links.forEach(d => {
        if (matchedNodes.some(n => n.id === d.source.id || n.id === d.target.id)) {
            connectedNodes.add(d.source.id);
            connectedNodes.add(d.target.id);
            connectedLinks.add(d);
        }
    });

    nodes.forEach(d => {
        d.highlighted = matchedNodes.some(n => n.id === d.id) || connectedNodes.has(d.id);
        d.opacity = d.highlighted ? 1 : 0.1;
    });

    links.forEach(d => {
        d.highlighted = connectedLinks.has(d);
        d.opacity = d.highlighted ? 1 : 0.1;
    });

    // Zoom to the current matched node
    if (matchedNodes.length > 0) {
        zoomToNode(matchedNodes[currentMatchIndex]);
    }

    // Update search results list
    updateSearchResults(matchedNodes);

    ticked();
}

function updateSearchResults(matchedNodes) {
    const searchResults = d3.select("#search-results");
    searchResults.style("display", "block");
    searchResults.html("");
    
    matchedNodes.forEach(node => {
        searchResults.append("div")
            .text(node.name)
            .on("click", () => {
                setSelectedNode(node);
                zoomToNode(node);
            });
    });
}

function hideSearchResults() {
    const searchResults = d3.select("#search-results");
    searchResults.style("display", "none");
    searchResults.html("");
}

function ticked() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw links
    links.forEach(drawLink);

    // Draw nodes
    nodes.forEach(drawNode);

    // Draw labels
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    nodes.forEach(drawLabel);

    ctx.restore();
}

function drawLink(d) {
    const sourceX = d.source.x;
    const sourceY = d.source.y;
    const targetX = d.target.x;
    const targetY = d.target.y;

    // Calculate the angle of the line
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

    // Calculate the point where the line touches the target node
    const targetRadius = d.target.r;
    const arrowLength = 5;
    const padding = 2;
    const touchX = targetX - (targetRadius + padding) * Math.cos(angle);
    const touchY = targetY - (targetRadius + padding) * Math.sin(angle);

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(touchX, touchY);
    ctx.strokeStyle = d.highlighted ? highlightColor : linkColor;
    ctx.globalAlpha = d.opacity;
    ctx.lineWidth = 0.25 / transform.k;
    ctx.stroke();

    // Draw the arrow
    ctx.save();
    ctx.translate(touchX, touchY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowLength / 3);
    ctx.lineTo(-arrowLength, arrowLength / 3);
    ctx.closePath();
    ctx.fillStyle = d.highlighted ? highlightColor : linkColor;
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
}

function drawNode(d) {
    ctx.beginPath();
    ctx.moveTo(d.x + d.r, d.y);
    ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(d);
    ctx.globalAlpha = d.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
}

function getNodeColor(d) {
    if (d === hoveredNode) return hoverColor;
    if (d === selectedNode || d.highlighted) return highlightColor;
    return d.opacity < 1 ? unselectedColor : defaultNodeColor;
}

function drawLabel(d) {
    ctx.fillStyle = "black";
    ctx.globalAlpha = d.opacity;
    ctx.fillText(d.name, d.x + d.r + 2, d.y);
    ctx.globalAlpha = 1;
}

function zoomed(event) {
    transform = event.transform;
    ticked();
}

function setSelectedNode(node) {
    if (selectedNode === node) return;

    const connectedNodes = new Set([node.id]);
    const connectedLinks = new Set();

    links.forEach(d => {
        if (d.source.id === node.id || d.target.id === node.id) {
            connectedNodes.add(d.source.id);
            connectedNodes.add(d.target.id);
            connectedLinks.add(d);
        }
    });

    nodes.forEach(d => {
        d.highlighted = d.id === node.id || connectedNodes.has(d.id);
        d.opacity = d.highlighted ? 1 : 0.1;
    });

    links.forEach(d => {
        d.highlighted = connectedLinks.has(d);
        d.opacity = d.highlighted ? 1 : 0.1;
    });

    selectedNode = node;
    console.log("Selected node:", node.name);

    // Zoom to the selected node
    zoomToNode(node);

    ticked();
}

function resetGraph() {
    nodes.forEach(d => {
        d.highlighted = false;
        d.opacity = 1;
    });

    links.forEach(d => {
        d.highlighted = false;
        d.opacity = 1;
    });

    selectedNode = null;
    hideSearchResults();
    ticked();
}

function zoomToNode(node) {
    const scale = 1;
    const x = -node.x * scale + canvas.width / 2;
    const y = -node.y * scale + canvas.height / 2;

    transform = d3.zoomIdentity.translate(x, y).scale(scale);
    d3.select(canvas).transition().duration(500).call(d3.zoom().transform, transform);
}

function findNodeAtPosition(x, y) {
    const invertedPoint = transform.invert([x, y]);
    return nodes.find(node => {
        const dx = invertedPoint[0] - node.x;
        const dy = invertedPoint[1] - node.y;
        return dx * dx + dy * dy < node.r * node.r;
    });
}

// Usage
document.addEventListener("DOMContentLoaded", function() {
    loadGraphData('merged20240726.csv');
});