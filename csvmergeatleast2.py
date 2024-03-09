import pandas as pd

# Load the CSV files into DataFrames
df1 = pd.read_csv('influenced_processed.csv', encoding='ISO-8859-1')
df2 = pd.read_csv('influencedby_processed.csv', encoding='ISO-8859-1')

# Merge (concatenate) the DataFrames
merged_df = pd.concat([df1, df2], ignore_index=True)

# Remove duplicates (based on all columns)
merged_df = merged_df.drop_duplicates()

# Count the occurrences of each economist
economist_counts = merged_df['economist'].value_counts()
influenced_counts = merged_df['influencedBy'].value_counts()

# Merge the counts into a single DataFrame
counts_df = pd.concat([economist_counts, influenced_counts], axis=1)
counts_df.columns = ['economist_count', 'influenced_count']
counts_df = counts_df.fillna(0).astype(int)

# Filter out economists who appear >= 4 times
filtered_df = merged_df[merged_df['economist'].isin(counts_df[(counts_df['economist_count'] > 4) | (counts_df['influenced_count'] > 4)].index)]

# Save the merged and filtered DataFrame to a new CSV file
merged_df.to_csv('merged_filtered4_csv.csv', index=False)