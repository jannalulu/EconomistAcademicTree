const d3 = window.d3;

let links = null;
let nodes = null;
let simulation = null;
let selectedNode = null;

let worker = new Worker('dataworker.js');

worker.onmessage = function(event) {
    if (event.data.type === 'graphData') {
        createD3Graph(event.data.graph, window.innerWidth, window.innerHeight);
    } else if (event.data.type === 'error') {
        console.error(event.data.message);
    }
};

function loadGraphData(url) {
    worker.postMessage({ type: 'loadData', url: url });
}

function createD3Graph(graph, parentWidth, parentHeight) {
    const svg = d3.select('svg')
        .attr('width', parentWidth)
        .attr('height', parentHeight);

    // Remove any previous graphs
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Calculate node sizes based on connections
    const nodeSize = d3.scaleLinear()
        .domain([0, d3.max(graph.nodes, d => d.connections)])
        .range([5, 20]);

    // Create links
    links = g.append("g")
        .selectAll("line")
        .data(graph.links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 0.5);

    // Create nodes
    nodes = g.append("g")
        .selectAll("circle")
        .data(graph.nodes)
        .join("circle")
        .attr("r", d => nodeSize(d.connections))
        .attr("fill", "#ADD8E6")  // Light blue color
        .call(drag(simulation))
        .on("click", (event, d) => setSelectedNode(d));

    // Add labels to nodes
    const labels = g.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .join("text")
        .text(d => d.name)
        .attr("font-size", "12px")
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .attr("pointer-events", "none");  // Prevent labels from interfering with node interactions

    // Create simulation
    simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
        .force("collision", d3.forceCollide().radius(d => nodeSize(d.connections) + 10))
        .on("tick", ticked);

    function ticked() {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        nodes
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x + 8)
            .attr("y", d => d.y);
    }

    // Add search functionality
    d3.select("#search").on("input", function() {
        const searchTerm = this.value.toLowerCase();
        if (searchTerm) {
            highlightNodes(searchTerm, graph.nodes, nodes, links, labels);
        } else {
            resetGraph(nodes, links, labels);
        }
    });

    // Add click event to reset graph when clicking on empty space
    svg.on("click", function(event) {
        if (event.target.tagName !== "circle") {
            resetGraph(nodes, links, labels);
            selectedNode = null;
        }
    });

    // Add mouseover and mouseout events for nodes
    nodes
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#FF7F50");  // Change color on hover
            d3.select(this.parentNode).raise();  // Bring node to front
        })
        .on("mouseout", function(event, d) {
            if (selectedNode !== d) {
                d3.select(this).attr("fill", "#ADD8E6");  // Revert color if not selected
            }
        });
}

function highlightNodes(searchTerm, allNodes, nodes, links, labels) {
    const matchedNodes = allNodes.filter(n => n.name.toLowerCase().includes(searchTerm));
    
    if (matchedNodes.length === 0) {
        resetGraph(nodes, links, labels);
        return;
    }

    const connectedNodes = new Set(matchedNodes.map(n => n.id));
    const connectedLinks = new Set();

    links.each(function(d) {
        if (matchedNodes.some(n => n.id === d.source.id || n.id === d.target.id)) {
            connectedNodes.add(d.source.id);
            connectedNodes.add(d.target.id);
            connectedLinks.add(d);
        }
    });

    nodes.attr("fill", d => matchedNodes.some(n => n.id === d.id) ? "#00FF00" : (connectedNodes.has(d.id) ? "#FFA500" : "#808080"))
         .attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);

    links.attr("stroke", d => connectedLinks.has(d) ? "#00FF00" : "#999")
         .attr("opacity", d => connectedLinks.has(d) ? 1 : 0.1);

    labels.attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);
}

function resetGraph(nodes, links, labels) {
    nodes.attr("fill", "#ADD8E6")
         .attr("opacity", 1);
    links.attr("stroke", "#999")
         .attr("opacity", 0.6);
    labels.attr("opacity", 1);
}

function setSelectedNode(node) {
    if (selectedNode === node) return;

    const connectedNodes = new Set([node.id]);
    const connectedLinks = new Set();

    links.each(function(d) {
        if (d.source.id === node.id || d.target.id === node.id) {
            connectedNodes.add(d.source.id);
            connectedNodes.add(d.target.id);
            connectedLinks.add(d);
        }
    });

    nodes.attr("fill", d => d.id === node.id ? "#00FF00" : (connectedNodes.has(d.id) ? "#FFA500" : "#ADD8E6"))
         .attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);

    links.attr("stroke", d => connectedLinks.has(d) ? "#00FF00" : "#999")
         .attr("opacity", d => connectedLinks.has(d) ? 1 : 0.1);

    labels.attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);

    selectedNode = node;
    console.log("Selected node:", node.name);
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// Usage
document.addEventListener("DOMContentLoaded", function() {
    loadGraphData('merged20240308.csv');
});