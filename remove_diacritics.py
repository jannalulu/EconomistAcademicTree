
import pandas as pd
import unicodedata

def remove_diacritics(text):
    """
    Remove diacritics from the given text.
    """
    return ''.join(c for c in unicodedata.normalize('NFKD', str(text))
                   if unicodedata.category(c) != 'Mn')

# Input and output file names
input_file = 'merged20240308.csv'
output_file = 'merged20240726.csv'

# Read the CSV file
df = pd.read_csv(input_file)

# Apply the remove_diacritics function to all string columns
for column in df.select_dtypes(include=['object']):
    df[column] = df[column].apply(remove_diacritics)

# Save the processed data back to a CSV file
df.to_csv(output_file, index=False)

print(f"Diacritics removed and saved to {output_file}")
