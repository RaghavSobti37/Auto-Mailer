#!/usr/bin/env python3
import pandas as pd

df = pd.read_csv('csv/master_db_cleaned.csv')
print('Updated master_db_cleaned.csv:')
print(f'Total rows: {len(df)}')
true_count = (df['havells_myousic_sent'] == True).sum()
false_count = (df['havells_myousic_sent'] == False).sum()
print(f'havells_myousic_sent=True: {true_count}')
print(f'havells_myousic_sent=False: {false_count}')
print('\nSample of updated records (True):')
print(df[df['havells_myousic_sent'] == True][['name', 'email', 'havells_myousic_sent']].head(3))
print('\nSample of updated records (False):')
print(df[df['havells_myousic_sent'] == False][['name', 'email', 'havells_myousic_sent']].head(3))
