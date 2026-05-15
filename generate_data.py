import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)
days = 365
start = datetime(2023, 1, 1)
dates = [start + timedelta(days=i) for i in range(days)]

# Toshkent iqlimiga mos temperatura
temp_base = 15 + 15 * np.sin(np.linspace(-np.pi/2, 3*np.pi/2, days))
temperature = temp_base + np.random.normal(0, 3, days)

# Anomaliyalar qo'shish
temperature[45] = 42   # issiqlik anomaliyasi
temperature[180] = -8  # sovuq anomaliya
temperature[270] = 45  # yoz anomaliyasi

humidity = 60 + 20 * np.cos(np.linspace(0, 2*np.pi, days)) + np.random.normal(0, 5, days)
humidity = np.clip(humidity, 10, 100)

wind_speed = np.abs(np.random.normal(10, 5, days))
wind_speed[120] = 55  # bo'ron anomaliyasi

pressure = 1013 + np.random.normal(0, 5, days)

precipitation = np.random.exponential(2, days)
precipitation[precipitation < 0.5] = 0
precipitation[90:100] = np.random.uniform(20, 40, 10)  # yomg'ir anomaliyasi

df = pd.DataFrame({
    'date': [d.strftime('%Y-%m-%d') for d in dates],
    'temperature': np.round(temperature, 1),
    'humidity': np.round(humidity, 1),
    'wind_speed': np.round(wind_speed, 1),
    'pressure': np.round(pressure, 1),
    'precipitation': np.round(precipitation, 1)
})

df.to_csv('/home/claude/weather_app/data/weather_data.csv', index=False)
print("CSV yaratildi!")
print(df.head())
