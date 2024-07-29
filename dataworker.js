const isWebWorker = typeof self !== 'undefined' && typeof self.importScripts === 'function';

if (isWebWorker) {
    self.importScripts('https://d3js.org/d3.v7.min.js');
} else {
    // In Node.js environment, we need to require d3
    const d3 = require('d3');
}

// const CHUNK_SIZE = 1000; // Adjust this value based on performance testing

self.onmessage = function(event) {
    if (event.data.type === 'loadData') {
        loadAndProcessData(event.data.url);
    }
};

function loadAndProcessData(url) {
    d3.csv(url).then(function(data) {
        const nodes = new Map();
        const links = [];

        data.forEach(function(row) {
            addNode(nodes, row.influencedBy);
            addNode(nodes, row.economist);
            links.push({
                source: row.influencedBy,
                target: row.economist
            });
        });

        links.forEach(link => {
            nodes.get(link.source).connections++;
            nodes.get(link.target).connections++;
        });

        const graph = {
            nodes: Array.from(nodes.values()),
            links: links
        };

        self.postMessage({ type: 'graphData', graph: graph });
    }).catch(function(error) {
        self.postMessage({ type: 'error', message: "Error loading the CSV file: " + error.message });
    });
}

function addNode(nodes, id) {
    if (!nodes.has(id)) {
        nodes.set(id, { id: id, name: id, connections: 0 });
    }
}