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

# Filter out economists who appear <= 4 times
filtered_economists = economist_counts[economist_counts > 4].index

# Keep only the rows with economists who appear more than 4 times
merged_df = merged_df[merged_df['economist'].isin(filtered_economists)]

# Save the merged and filtered DataFrame to a new CSV file
merged_df.to_csv('merged_filtered4_csv.csv', index=False)