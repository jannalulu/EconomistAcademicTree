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

    // Create links
    links = g.append("g")
        .selectAll("line")
        .data(graph.links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);

    // Create nodes
    nodes = g.append("g")
        .selectAll("circle")
        .data(graph.nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", "#69b3a2")
        .call(drag(simulation));

    // Add labels to nodes
    const labels = g.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .join("text")
        .text(d => d.name)
        .attr("font-size", "8px")
        .attr("dx", 8)
        .attr("dy", ".35em");

    // Create simulation
    simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
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
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    }

    // Add click event to nodes
    nodes.on("click", (event, d) => {
        setSelectedNode(d, nodes, links);
    });

    // Add search functionality
    d3.select("#search").on("input", function() {
        const searchTerm = this.value.toLowerCase();
        nodes.attr("fill", d => d.name.toLowerCase().includes(searchTerm) ? "#ff0000" : "#69b3a2");
        labels.attr("font-weight", d => d.name.toLowerCase().includes(searchTerm) ? "bold" : "normal");
    });
}

function setSelectedNode(node, allNodes, allLinks) {
    if (selectedNode === node) return;
    
    allNodes.attr("fill", "#69b3a2");
    allLinks.attr("stroke", "#999");

    allNodes.filter(n => n.id === node.id).attr("fill", "#ff0000");
    allLinks.filter(l => l.source.id === node.id || l.target.id === node.id).attr("stroke", "#ff0000");

    selectedNode = node;

    // You can add more functionality here, like showing node details
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