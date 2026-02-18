#!/usr/bin/env python3
import pandas as pd

df = pd.read_csv('csv/master_db_cleaned.csv')
print('Columns:', list(df.columns))
print('\nSample rows with havells_myousic_sent=True:')
print(df[df['havells_myousic_sent'] == True][['name', 'email', 'havells_myousic_sent']].head(10))
print('\nSample rows with havells_myousic_sent=False:')
print(df[df['havells_myousic_sent'] == False][['name', 'email', 'havells_myousic_sent']].head(5))
true_count = (df['havells_myousic_sent'] == True).sum()
print(f'\nTotal with havells_myousic_sent=True: {true_count}')
