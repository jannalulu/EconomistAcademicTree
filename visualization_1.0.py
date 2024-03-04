import pandas as pd
import networkx as nx
import plotly.graph_objs as go
from plotly.offline import plot

# Read the merged CSV file into a DataFrame
df = pd.read_csv('merged_csv.csv')

# Create a directed graph from the edges (influencer-influenced pairs)
G = nx.from_pandas_edgelist(df, source='influencedBy', target='economist', create_using=nx.DiGraph())

# Identify root nodes (earliest economists)
root_nodes = [node for node in G.nodes() if G.in_degree(node) == 0 and G.out_degree(node) > 0]

# Define node positions using a layout for graph visualizations
pos = nx.spring_layout(G, seed=42)  # Seed for reproducible layout

# Prepare data for edges to plot
edge_trace = go.Scatter(
    x=[],
    y=[],
    line=dict(width=0.5, color='#888'),
    hoverinfo='none',
    mode='lines')

for edge in G.edges():
    x0, y0 = pos[edge[0]]
    x1, y1 = pos[edge[1]]
    edge_trace['x'] += tuple([x0, x1, None])
    edge_trace['y'] += tuple([y0, y1, None])

node_colors = []

# Prepare data for nodes to plot
node_trace = go.Scatter(
    x=[],
    y=[],
    text=['bottom center'],
    mode='markers+text',
    hoverinfo='text',
    marker=dict(
        showscale=False,
        size=10,
        line_width=2,
        color=[]))

# Configure nodes with hover text
for node in G.nodes():
    x, y = pos[node]
    node_trace['x'] += tuple([x])
    node_trace['y'] += tuple([y])
    node_trace['text'] += tuple([f'{node}<br>#Influences: {G.out_degree(node)}<br>#Influenced by: {G.in_degree(node)}'])
    
    # Add colors to root nodes for distinction
    if node in root_nodes:
        node_colors.append('rgb(255,0,0)')  # Red color for root nodes
    else:
        node_colors.append('rgb(0,255,0)')  # Green color for other nodes

node_trace['marker']['color'] = node_colors

# Create the plot
fig = go.Figure(data=[edge_trace, node_trace],
             layout=go.Layout(
                title='<br>Network graph of economists',
                titlefont=dict(size=16),
                showlegend=False,
                hovermode='closest',
                margin=dict(b=20,l=5,r=5,t=40),
                annotations=[ dict(
                    text="This network graph shows the influences of each economist",
                    showarrow=False,
                    xref="paper", yref="paper",
                    x=0.005, y=-0.002 ) ],
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)))

# Plot
plot(fig, filename='economists_network_graph.html')