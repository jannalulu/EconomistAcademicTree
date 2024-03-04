import pandas as pd

# Load the CSV files into DataFrames
df1 = pd.read_csv('influenced_processed.csv', encoding='ISO-8859-1')
df2 = pd.read_csv('influencedby_processed.csv', encoding='ISO-8859-1')

# Merge (concatenate) the DataFrames
merged_df = pd.concat([df1, df2], ignore_index=True)

# If you want to avoid duplicates (based on all columns)
merged_df = merged_df.drop_duplicates()

# Save the merged DataFrame to a new CSV file
merged_df.to_csv('merged_csv.csv', index=False)