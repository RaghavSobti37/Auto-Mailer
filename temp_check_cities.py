import pandas as pd

df = pd.read_csv('data/master_db/master_db_final.csv')
print('Unique cities in database:')
cities = df['city'].dropna().unique()
print(sorted(cities))
print(f'\nTotal unique cities: {df["city"].nunique()}')
