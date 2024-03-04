from dash import Dash, dcc, html, Output, Input
import plotly.graph_objs as go
import pandas as pd
import networkx as nx

# Assume 'merged_csv.csv' has two columns 'influencedBy' and 'economist'
df = pd.read_csv('merged_csv.csv')

# Create a directed graph from the edges (influencer-influenced pairs)
G = nx.from_pandas_edgelist(df, source='influencedBy', target='economist', create_using=nx.DiGraph())

# Define node positions using a layout for graph visualizations
# Seed is set to preserve layout between runs
pos = nx.spring_layout(G, seed=42)

app = Dash(__name__)

@app.callback(Output('network-graph', 'figure'), [Input('network-graph', 'clickData')])
def update_graph(clickData):
    # Create traces for non-highlighted edges and nodes
    edge_trace = go.Scatter(
        x=[],
        y=[],
        line=dict(width=1, color='grey'),
        hoverinfo='none',
        mode='lines'
    )

    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_trace['x'] += (x0, x1, None)
        edge_trace['y'] += (y0, y1, None)

    node_trace = go.Scatter(
        x=[],
        y=[],
        text=[],
        mode='markers+text',
        hoverinfo='text',
        marker=dict(size=10, color='blue', line=dict(width=2))
    )

    for node in G.nodes():
        x, y = pos[node]
        node_trace['x'] += (x,)
        node_trace['y'] += (y,)
        node_trace['text'] += (node,)

    # Define a list of nodes and edges to be highlighted
    highlighted_nodes = set()
    highlighted_edges = set()

    if clickData:
        # Get clicked node
        clicked_node = clickData['points'][0]['text']
        highlighted_nodes.add(clicked_node)

        # Get neighbors of the clicked node
        neighbors = list(G.neighbors(clicked_node))
        highlighted_nodes.update(neighbors)

        # Get edges connected to the clicked node
        for edge in G.edges(clicked_node):
            highlighted_edges.add(edge)
        for edge in G.in_edges(clicked_node):
            highlighted_edges.add(edge)

    # Recolor nodes and edges based on highlighted nodes and edges
    node_trace['marker']['color'] = ['yellow' if node in highlighted_nodes else 'blue' for node in G.nodes()]
    edge_color = ['red' if (source, target) in highlighted_edges else 'grey' for source, target in G.edges()]
    edge_trace['line']['color'] = edge_color

    # Set layout to take up the entire display
    layout = go.Layout(
        showlegend=False,
        hovermode='closest',
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        margin=dict(l=0, r=0, t=0, b=0)
    )

    # Combine into a single figure
    figure = go.Figure(data=[edge_trace, node_trace], layout=layout)
    return figure

app.layout = html.Div([
    dcc.Graph(
        id='network-graph',
        style={'height': '100vh', 'width': '100vw'}
    )
])

if __name__ == '__main__':
    app.run_server(debug=True)