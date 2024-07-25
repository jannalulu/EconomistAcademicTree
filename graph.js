// Use d3v7 as it's the latest stable version
const d3 = window.d3;

let links = null;
let nodes = null;
let simulation = null;
let selectedNode = null;

function loadGraphData(callback) {
    d3.csv("merged20240308.csv").then(function(data) {
        const nodes = new Set();
        const links = [];

        data.forEach(function(row) {
            nodes.add(row.influencedBy);
            nodes.add(row.economist);
            links.push({
                source: row.influencedBy,
                target: row.economist
            });
        });

        const graph = {
            nodes: Array.from(nodes).map(name => ({ id: name, name: name })),
            links: links
        };

        callback(graph);
    }).catch(function(error) {
        console.log("Error loading the CSV file:", error);
    });
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
    const nodeConnections = {};
    graph.links.forEach(link => {
        nodeConnections[link.source] = (nodeConnections[link.source] || 0) + 1;
        nodeConnections[link.target] = (nodeConnections[link.target] || 0) + 1;
    });

    const nodeSize = d3.scaleLinear()
        .domain([0, d3.max(Object.values(nodeConnections))])
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
        .attr("r", d => nodeSize(nodeConnections[d.id] || 0))
        .attr("fill", "#ADD8E6")  // Light blue color
        .call(drag(simulation))
        .on("click", (event, d) => setSelectedNode(d, nodes, links, labels));

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
        .force("collision", d3.forceCollide().radius(d => nodeSize(nodeConnections[d.id] || 0) + 10))
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
            highlightNodes(searchTerm, graph, nodes, links, labels);
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

function highlightNodes(searchTerm, graph, nodes, links, labels) {
    const matchedNodes = graph.nodes.filter(n => n.name.toLowerCase().includes(searchTerm));
    
    if (matchedNodes.length === 0) {
        resetGraph(nodes, links, labels);
        return;
    }

    const connectedNodes = new Set();
    matchedNodes.forEach(node => {
        connectedNodes.add(node.id);
        graph.links.forEach(link => {
            if (link.source.id === node.id) connectedNodes.add(link.target.id);
            if (link.target.id === node.id) connectedNodes.add(link.source.id);
        });
    });

    nodes.attr("fill", d => connectedNodes.has(d.id) ? "#00FF00" : "#808080")
         .attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);
    links.attr("stroke", d => connectedNodes.has(d.source.id) && connectedNodes.has(d.target.id) ? "#00FF00" : "#999")
         .attr("opacity", d => connectedNodes.has(d.source.id) && connectedNodes.has(d.target.id) ? 1 : 0.1);
    labels.attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);
}

function resetGraph(nodes, links, labels) {
    nodes.attr("fill", "#ADD8E6")
         .attr("opacity", 1);
    links.attr("stroke", "#999")
         .attr("opacity", 0.6);
    labels.attr("opacity", 1);
}

function setSelectedNode(node, allNodes, allLinks, labels) {
    if (selectedNode === node) return;
    
    const connectedNodes = new Set([node.id]);
    allLinks.each(function(d) {
        if (d.source.id === node.id) connectedNodes.add(d.target.id);
        if (d.target.id === node.id) connectedNodes.add(d.source.id);
    });

    allNodes.attr("fill", d => connectedNodes.has(d.id) ? "#00FF00" : "#ADD8E6")
            .attr("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);
    allLinks.attr("stroke", d => connectedNodes.has(d.source.id) && connectedNodes.has(d.target.id) ? "#00FF00" : "#999")
            .attr("opacity", d => connectedNodes.has(d.source.id) && connectedNodes.has(d.target.id) ? 1 : 0.1);
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

// Usage example:
document.addEventListener("DOMContentLoaded", function() {
    loadGraphData(function(graph) {
        createD3Graph(graph, window.innerWidth, window.innerHeight);
    });
});