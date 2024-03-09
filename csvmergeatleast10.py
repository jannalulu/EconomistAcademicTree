import pandas as pd

# Load the CSV files into DataFrames
df1 = pd.read_csv('influenced_processed.csv', encoding='ISO-8859-1')
df2 = pd.read_csv('influencedby_processed.csv', encoding='ISO-8859-1')

# Merge (concatenate) the DataFrames
merged_df = pd.concat([df1, df2], ignore_index=True)

# Remove duplicates (based on all columns)
merged_df = merged_df.drop_duplicates()

# Count the occurrences of each economist and influenced person
counts_df = pd.concat([merged_df['economist'], merged_df['influencedBy']], axis=1)
counts_df.columns = ['name', 'influenced_name']
counts_df = counts_df.stack().reset_index(level=1, drop=True).rename('name').to_frame()
counts_df['count'] = 1
counts_df = counts_df.groupby('name').sum()

# Filter out economists and influenced persons who appear < 10 times
filtered_names = counts_df[counts_df['count'] > 10].index
filtered_df = merged_df[merged_df['economist'].isin(filtered_names) | merged_df['influencedBy'].isin(filtered_names)]

# Save the merged and filtered DataFrame to a new CSV file
filtered_df.to_csv('merged_filtered4_csv.csv', index=False)