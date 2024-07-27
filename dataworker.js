const isWebWorker = typeof self !== 'undefined' && typeof self.importScripts === 'function';

if (isWebWorker) {
    self.importScripts('https://d3js.org/d3.v7.min.js');
} else {
    // In Node.js environment, we need to require d3
    const d3 = require('d3');
}

const CHUNK_SIZE = 1000; // Adjust this value based on performance testing

self.onmessage = function(event) {
    if (event.data.type === 'loadData') {
        loadAndProcessData(event.data.url);
    }
};

async function loadAndProcessData(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const data = d3.csvParse(text);

        let nodes = new Map();
        let links = [];
        let rowCount = 0;
        let chunkCount = 0;

        for (let row of data) {
            const influencedBy = row.influencedBy;
            const economist = row.economist;

            addNode(nodes, influencedBy);
            addNode(nodes, economist);
            links.push({ source: influencedBy, target: economist });

            rowCount++;
            if (rowCount % CHUNK_SIZE === 0) {
                await processChunk(nodes, links, chunkCount);
                chunkCount++;
                links = [];
            }
        }

        // Process any remaining data
        if (links.length > 0) {
            await processChunk(nodes, links, chunkCount);
        }

        // Send final message indicating processing is complete
        self.postMessage({ type: 'complete' });
    } catch (error) {
        self.postMessage({ type: 'error', message: "Error processing the CSV file: " + error.message });
    }
}

async function processChunk(nodes, links, chunkCount) {
    links.forEach(link => {
        nodes.get(link.source).connections++;
        nodes.get(link.target).connections++;
    });

    const chunkGraph = {
        nodes: Array.from(nodes.values()),
        links: links
    };

    self.postMessage({ type: 'chunkData', chunkCount: chunkCount, graph: chunkGraph });
}

function addNode(nodes, id) {
    if (!nodes.has(id)) {
        nodes.set(id, { id: id, name: id, connections: 0 });
    }
}